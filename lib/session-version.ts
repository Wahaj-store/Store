export function sessionVersionMatches(tokenVersion: unknown, currentVersion: number): boolean {
  const version = tokenVersion === undefined ? 0 : tokenVersion;
  return typeof version === 'number'
    && Number.isSafeInteger(version)
    && version >= 0
    && version === currentVersion;
}
