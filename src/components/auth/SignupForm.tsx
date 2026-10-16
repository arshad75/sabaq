"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

type AccountRole = "guardian" | "teacher";
type Method = "magic" | "password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Prototype: validates and confirms, but doesn't create accounts until Supabase Auth lands (M3). */
export function SignupForm() {
  const [role, setRole] = useState<AccountRole>("guardian");
  const [method, setMethod] = useState<Method>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">
          We sent a link to {email} to finish creating your account. (Prototype: no email is sent and no account is
          created yet.)
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
        if (!name.trim()) next.name = "Enter the name others will see.";
        if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
        if (method === "password" && password.length < 10) next.password = "Use at least 10 characters.";
        setErrors(next);
        if (Object.keys(next).length === 0) setSent(true);
      }}
    >
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
        <Field id="password" label="Password" hint="At least 10 characters." error={errors.password}>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
          />
        </Field>
      )}
      <Button type="submit" size="lg" className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Students don’t sign up here. A parent adds them and sets up their tablet.
      </p>
    </form>
  );
}
