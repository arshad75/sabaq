import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const inputCls =
  "min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-base text-fg placeholder:text-muted/70 aria-[invalid=true]:border-danger";

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputCls, className)} {...rest} />;
}

export function TextArea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputCls, "min-h-24 py-2", className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(inputCls, "pr-8", className)} {...rest} />;
}

export function Switch({
  id,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-6 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-0",
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 font-medium">{label}</legend>
      <div className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center rounded-lg px-4 font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus",
              value === o.value ? "bg-surface shadow-sm" : "text-muted",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
