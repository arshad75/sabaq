import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[color,background-color,border-color,filter,scale] duration-150 ease-out select-none disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg shadow-sm hover:brightness-110 active:brightness-95",
  secondary: "border border-border bg-surface text-fg hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "border border-danger/40 bg-danger-soft text-danger hover:brightness-95",
};

// md keeps the 44px minimum touch target; lg is for child-facing primary actions.
const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconEnd?: IconName;
  children?: ReactNode;
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconEnd && <Icon name={iconEnd} />}
    </Link>
  );
}

export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  type = "button",
  ...rest
}: { icon: IconName; label: string; variant?: Variant } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(base, variants[variant], "size-11 shrink-0 p-0", className)}
      {...rest}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}
