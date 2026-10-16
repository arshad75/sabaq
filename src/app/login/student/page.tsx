import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleShell } from "@/components/shell/AppShell";
import { StudentPinLogin } from "@/components/auth/StudentPinLogin";
import { Card } from "@/components/ui/Card";
import { Banner, LoadingBlock } from "@/components/ui/States";
import { ButtonLink } from "@/components/ui/Button";
import { getPairedGuardian } from "@/lib/auth/session";
import { tabletChildren } from "@/lib/mock/auth";

export const metadata: Metadata = { title: "Student sign in" };

export default function Page(props: PageProps<"/login/student">) {
  return (
    <SimpleShell backHref="/login" backLabel="Grown-ups">
      <Suspense fallback={<LoadingBlock rows={1} />}>
        <Content searchParams={props.searchParams} />
      </Suspense>
    </SimpleShell>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/login/student">, "searchParams">) {
  const [sp, guardianId] = await Promise.all([searchParams, getPairedGuardian()]);
  const expired = sp.link === "expired" && (
    <Banner tone="warning" className="mb-6">
      That sign-in link has been used or has expired. Ask a grown-up for a new one, or use your PIN.
    </Banner>
  );

  // Only a tablet a parent has set up lists children, so this public page never shows names to strangers.
  if (!guardianId) {
    return (
      <>
        {expired}
        <Card className="p-6 text-center">
          <h1 className="text-2xl font-semibold">This tablet isn’t set up yet</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">
            A parent needs to log in on this device once, open their child’s profile and choose “Set up this tablet”.
            Or open the sign-in link a parent sent you.
          </p>
          <ButtonLink href="/login" className="mt-5" icon="user">
            Parent log in
          </ButtonLink>
        </Card>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Student sign in</h1>
      {expired}
      <Card className="p-6">
        <StudentPinLogin students={tabletChildren(guardianId)} />
      </Card>
    </>
  );
}
