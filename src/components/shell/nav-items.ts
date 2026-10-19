import type { IconName } from "@/components/ui/Icon";

export type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

/** The one menu a signed-in family sees on every page. */
export function accountNav(isAdmin = false): NavItem[] {
  return [
    { href: "/welcome", label: "Home", icon: "home", exact: true },
    { href: "/learn", label: "Learn", icon: "zap" },
    { href: "/practice", label: "Qaida", icon: "book" },
    { href: "/listen", label: "Listen", icon: "speech" },
    { href: "/join", label: "Join", icon: "play" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "shield" } as NavItem] : []),
    { href: "/account", label: "Account", icon: "user" },
  ];
}
