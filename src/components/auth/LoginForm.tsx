"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { logIn, type LoginState } from "@/lib/auth/actions";
import { previewEnabled } from "@/lib/preview";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

type Method = "magic" | "password";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(logIn, { status: "idle" });
  const [method, setMethod] = useState<Method>("magic");

  if (state.status === "sent") {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">
          If {state.email} has an account, a sign-in link is on its way. It expires in 15 minutes. (Prototype: no email
          is sent.)
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
        // Not using `action=`: React would reset the form after an error and lose the chosen method.
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
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
        <Field id="password" label="Password">
          <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      )}
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : method === "magic" ? "Email me a link" : "Log in"}
      </Button>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-muted">
        Student?{" "}
        <Link href="/login/student" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in on your tablet
        </Link>
      </p>
      {previewEnabled && (
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          Demo accounts (password <code>sabaq-demo</code>): <code>amina@example.com</code> (teacher),{" "}
          <code>sara@example.com</code> (parent).
        </p>
      )}
    </form>
  );
}
