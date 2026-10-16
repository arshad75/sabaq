import type { SVGProps } from "react";

// Hand-drawn 24x24 stroke icons, kept in-repo to avoid an icon dependency.
const PATHS = {
  repeat: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  speech: "M4 5h16v11H9l-5 4z M8 9h8 M8 12h5",
  wave: "M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0",
  slip: "M12 3l9 16H3z M12 10v4 M12 17v.01",
  check: "M4 12.5l5 5L20 6.5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  chevronLeft: "M15 5l-7 7 7 7",
  chevronRight: "M9 5l7 7-7 7",
  chevronDown: "M5 9l7 7 7-7",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21c0-4 3-6 7-6s7 2 7 6 M16 3.5a4 4 0 0 1 0 7.5 M18 15c2.5.5 4 2.5 4 6",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7",
  book: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
  settings: "M4 7h10 M18 7h2 M4 17h2 M10 17h10 M16 5v4 M8 15v4",
  logout: "M10 4H5v16h5 M14 8l4 4-4 4 M18 12H9",
  calendar: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2",
  download: "M12 4v11 M7 10l5 5 5-5 M5 20h14",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  copy: "M8 8h12v12H8z M16 8V4H4v12h4",
  lock: "M6 11h12v10H6z M8 11V7a4 4 0 0 1 8 0v4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  play: "M7 4l13 8-13 8z",
  alert: "M12 3l9 16H3z M12 10v4 M12 17v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8v.01",
  wifiOff: "M3 3l18 18 M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 4-2.4 M19 12.5a10 10 0 0 0-3-2 M2 8.5a15 15 0 0 1 4-2.6 M22 8.5a15 15 0 0 0-11-3.9 M12 20v.01",
  wifi: "M8.5 16.5a5 5 0 0 1 7 0 M5 12.5a10 10 0 0 1 14 0 M2 8.5a15 15 0 0 1 20 0 M12 20v.01",
  panel: "M4 4h16v16H4z M14 4v16",
  note: "M5 4h10l4 4v12H5z M15 4v4h4 M8 12h8 M8 16h5",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12v.01",
  flame: "M12 21c-4 0-7-3-7-7 0-4 3-6 4-10 2 2 3 4 3 6 1-1 2-2 2-4 2 2 5 5 5 8 0 4-3 7-7 7z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  key: "M15 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0z M13.5 12l7 7 M17 15.5l2-2 M19 17.5l2-2",
  grid: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z",
  chart: "M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  edit: "M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4",
  share: "M12 3v12 M7 8l5-5 5 5 M5 14v6h14v-6",
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  /** When set, the icon is announced; otherwise it is decorative. */
  label?: string;
};

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
