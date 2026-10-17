"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { logIn, type LoginState } from "@/lib/auth/actions";
import { supabaseAuth } from "@/lib/auth/mode";
import { previewEnabled } from "@/lib/preview";
import { Button } from "@/components/ui/Button";
import { Field, SegmentedControl, TextInput } from "@/components/ui/Form";
import { Banner } from "@/components/ui/States";

type Method = "magic" | "password";

export function LoginForm({ notice, showSignup = true }: { notice?: string; showSignup?: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(logIn, { status: "idle" });
  const [method, setMethod] = useState<Method>(supabaseAuth ? "password" : "magic");

  if (state.status === "sent") {
    return (
      <Banner tone="success" icon="check">
        <p className="font-medium">Check your email</p>
        <p className="text-sm">
          If {state.email} has an account, a sign-in link is on its way. It works once and expires in an hour. Check
          your spam folder if it doesn’t arrive in a few minutes.
          {!supabaseAuth && " (Prototype: no email is sent.)"}
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
      {notice && <Banner tone="warning">{notice}</Banner>}
      <Field id="email" label="Email">
        <TextInput id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      {supabaseAuth && <input type="hidden" name="method" value="password" />}
      {!supabaseAuth && (
        <SegmentedControl<Method>
          name="method"
          label="Sign in with"
          value={method}
          onChange={setMethod}
          options={[
            { value: "password", label: "Password" },
            { value: "magic", label: "Email link" },
          ]}
        />
      )}
      {method === "password" && (
        <Field
          id="password"
          label="Password"
          hint={
            supabaseAuth && (
              <Link href="/reset" className="font-medium text-primary underline-offset-4 hover:underline">
                Forgot your password?
              </Link>
            )
          }
        >
          <TextInput id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
      )}
      {state.status === "error" && <Banner tone="danger">{state.message}</Banner>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : method === "magic" ? "Email me a link" : "Log in"}
      </Button>
      {showSignup && (
        <p className="text-center text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      )}
      <p className="text-center text-sm text-muted">
        {supabaseAuth ? "Child joining a lesson?" : "Student?"}{" "}
        <Link
          href={supabaseAuth ? "/join" : "/login/student"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {supabaseAuth ? "Enter the lesson code" : "Sign in on your tablet"}
        </Link>
      </p>
      {previewEnabled && !supabaseAuth && (
        <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          Demo accounts (password <code>sabaq-demo</code>): <code>amina@example.com</code> (teacher),{" "}
          <code>sara@example.com</code> (parent).
        </p>
      )}
    </form>
  );
}
