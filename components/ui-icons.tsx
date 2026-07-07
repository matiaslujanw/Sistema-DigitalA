import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function SunIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2.75v2.5M12 18.75v2.5M4.75 4.75l1.8 1.8M17.45 17.45l1.8 1.8M2.75 12h2.5M18.75 12h2.5M4.75 19.25l1.8-1.8M17.45 6.55l1.8-1.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M20.25 14.35A8.25 8.25 0 0 1 9.65 3.75a8.75 8.75 0 1 0 10.6 10.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function LogOutIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path d="M10 5H6.75A2.75 2.75 0 0 0 4 7.75v8.5A2.75 2.75 0 0 0 6.75 19H10" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
      <path
        d="M9.6 3.2 9.1 5.5a7.3 7.3 0 0 0-1.55.9L5.3 5.7 3 9.7l1.75 1.55a7.3 7.3 0 0 0 0 1.5L3 14.3l2.3 4 2.25-.7c.48.35 1 .65 1.55.9l.5 2.3h4.8l.5-2.3a7.3 7.3 0 0 0 1.55-.9l2.25.7 2.3-4-1.75-1.55a7.3 7.3 0 0 0 0-1.5L21 9.7l-2.3-4-2.25.7a7.3 7.3 0 0 0-1.55-.9l-.5-2.3H9.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
