"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

type Mode = "login" | "signup";
type AccountRole = "guardian" | "teacher";
type Method = "magic" | "password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>("guardian");
  const [method, setMethod] = useState<Method>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  if (status === "sent") {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">
          We sent a sign-in link to {email}. It expires in 15 minutes. (Prototype: no email is actually sent.)
        </p>
      </Banner>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const next: Record<string, string> = {};
        if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
        if (method === "password" && password.length < 10) next.password = "Use at least 10 characters.";
        if (mode === "signup" && !name.trim()) next.name = "Enter the name others will see.";
        setErrors(next);
        if (Object.keys(next).length) return;
        setStatus("loading");
        // Prototype: no backend yet. Password sign-in goes straight to the role dashboard.
        setTimeout(() => {
          if (method === "magic") setStatus("sent");
          else router.push(role === "teacher" ? "/teacher" : "/guardian");
        }, 600);
      }}
    >
      {mode === "signup" && (
        <SegmentedControl<AccountRole>
          name="role"
          label="I am a"
          value={role}
          onChange={setRole}
          options={[
            { value: "guardian", label: "Parent or guardian" },
            { value: "teacher", label: "Teacher" },
          ]}
        />
      )}
      {mode === "signup" && (
        <Field id="name" label={role === "teacher" ? "Name students will see" : "Your first name"} error={errors.name}>
          <TextInput
            id="name"
            autoComplete="given-name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
          />
        </Field>
      )}
      <Field id="email" label="Email" error={errors.email}>
        <TextInput
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errors.email ? true : undefined}
        />
      </Field>
      <SegmentedControl<Method>
        name="method"
        label="Sign in with"
        value={method}
        onChange={setMethod}
        options={[
          { value: "magic", label: "Email link" },
          { value: "password", label: "Password" },
        ]}
      />
      {method === "password" && (
        <Field id="password" label="Password" hint={mode === "signup" ? "At least 10 characters." : undefined} error={errors.password}>
          <TextInput
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
          />
        </Field>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Please wait…" : mode === "signup" ? "Create account" : method === "magic" ? "Email me a link" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
      <p className="text-center text-sm text-muted">
        Students don’t sign up here. A parent adds them and sets up their tablet.
      </p>
    </form>
  );
}
