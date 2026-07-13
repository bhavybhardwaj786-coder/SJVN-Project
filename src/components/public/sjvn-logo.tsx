interface SjvnLogoProps {
  className?: string;
}

/**
 * Stylized SJVN-inspired emblem: a blue rounded square holding a white water
 * droplet with a red energy bolt, echoing hydro + power. Not the official mark.
 */
export function SjvnLogo({ className }: SjvnLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="SJVN emblem"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="92" height="92" rx="10" fill="#0e6ea3" />
      <rect x="4" y="4" width="92" height="92" rx="10" fill="none" stroke="#0a5580" strokeWidth="2" />
      <path
        d="M50 16 C50 16 74 44 74 62 A24 24 0 1 1 26 62 C26 44 50 16 50 16 Z"
        fill="#ffffff"
      />
      <path
        d="M54 34 L38 60 H49 L45 78 L64 50 H52 L54 34 Z"
        fill="#e11d2a"
      />
    </svg>
  );
}