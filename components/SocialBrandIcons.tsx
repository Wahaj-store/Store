type SocialBrandIconProps = {
  size?: number;
};

export function InstagramBrandIcon({ size = 16 }: SocialBrandIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.85" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookBrandIcon({ size = 16 }: SocialBrandIconProps) {
  return (
    <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.45 21v-8.22h2.76l.42-3.21h-3.18V7.52c0-.93.26-1.56 1.6-1.56h1.7V3.08c-.3-.04-1.32-.13-2.52-.13-2.5 0-4.21 1.53-4.21 4.35v2.27H7.19v3.21h2.83V21h3.43Z" />
    </svg>
  );
}
