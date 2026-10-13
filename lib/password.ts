import crypto from 'node:crypto';

/** Create a versioned scrypt hash with a fresh random salt for every password. */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

  return `s2$${salt}$${derivedKey.toString('hex')}`;
}

/** Verify current s2 hashes and the legacy fixed-salt format for gradual migration. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith('s2$')) {
      const [, salt, hex] = stored.split('$');
      if (!salt || !hex || !/^[a-f0-9]{128}$/i.test(hex)) return false;

      const derived = await new Promise<Buffer>((resolve, reject) => {
        crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
          if (error) reject(error);
          else resolve(key);
        });
      });
      const expected = Buffer.from(hex, 'hex');
      return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
    }

    // Backward compatibility for existing V6 hashes; callers can upgrade on login.
    const legacy = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, 'wahaj-salt', 64, (error, key) => {
        if (error) reject(error);
        else resolve(key);
      });
    });
    const expected = Buffer.from(stored, 'hex');
    return expected.length === legacy.length && crypto.timingSafeEqual(expected, legacy);
  } catch {
    return false;
  }
}
  
