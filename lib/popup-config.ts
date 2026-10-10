export type PopupFrequency = "session" | "daily" | "always";

export type PopupConfig = {
  title: string;
  message: string;
  imageUrl: string;
  ctaText: string;
  ctaUrl: string;
  delaySeconds: number;
  frequency: PopupFrequency;
};

export const DEFAULT_POPUP_CONFIG: PopupConfig = {
  title: "هدية خاصة لكِ من وَهَج",
  message: "اكتشفي تشكيلتنا الجديدة واختاري التفاصيل التي تشبهك.",
  imageUrl: "",
  ctaText: "تسوّقي الآن",
  ctaUrl: "/shop",
  delaySeconds: 3,
  frequency: "session",
};

export function isPopupEnabled(value: unknown): boolean {
  return value === true || ["true", "1", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

export function parsePopupConfig(value: unknown): PopupConfig {
  let raw: any = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = {};
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) raw = {};

  const frequency: PopupFrequency = ["session", "daily", "always"].includes(raw.frequency)
    ? raw.frequency
    : DEFAULT_POPUP_CONFIG.frequency;
  const delay = Number(raw.delaySeconds);

  return {
    title: typeof raw.title === "string" ? raw.title.slice(0, 120) : DEFAULT_POPUP_CONFIG.title,
    message: typeof raw.message === "string" ? raw.message.slice(0, 700) : DEFAULT_POPUP_CONFIG.message,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl.slice(0, 2000) : DEFAULT_POPUP_CONFIG.imageUrl,
    ctaText: typeof raw.ctaText === "string" ? raw.ctaText.slice(0, 50) : DEFAULT_POPUP_CONFIG.ctaText,
    ctaUrl: typeof raw.ctaUrl === "string" ? raw.ctaUrl.slice(0, 2048) : DEFAULT_POPUP_CONFIG.ctaUrl,
    delaySeconds: Number.isFinite(delay) ? Math.min(60, Math.max(0, Math.round(delay))) : DEFAULT_POPUP_CONFIG.delaySeconds,
    frequency,
  };
}

function safeUrl(value: unknown, allowHash: boolean): string | null {
  if (typeof value !== "string") return null;
  const input = value.trim();
  if (!input) return null;
  if (input.startsWith("/") && !input.startsWith("//")) return input;
  if (allowHash && /^#[\w-]+$/.test(input)) return input;
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? input : null;
  } catch {
    return null;
  }
}

export function safePopupHref(value: unknown): string | null {
  return safeUrl(value, true);
}

export function safePopupImageUrl(value: unknown): string | null {
  return safeUrl(value, false);
}
