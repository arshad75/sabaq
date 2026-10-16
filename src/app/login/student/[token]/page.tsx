import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingBlock } from "@/components/ui/States";
import { redeemStudentLink } from "@/lib/auth/actions";

export const metadata: Metadata = { title: "Student sign in", robots: { index: false } };

export default function Page(props: PageProps<"/login/student/[token]">) {
  return (
    <SimpleShell>
      <Suspense fallback={<LoadingBlock rows={1} />}>
        <Content params={props.params} />
      </Suspense>
    </SimpleShell>
  );
}

// The link is only used up when the button is pressed, so chat apps previewing the URL can't spend it.
async function Content({ params }: Pick<PageProps<"/login/student/[token]">, "params">) {
  const { token } = await params;
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign in on this tablet</h1>
      <p className="mt-2 text-muted">A grown-up sent this link so you can start reading.</p>
      <form action={redeemStudentLink} className="mt-6">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" size="lg" icon="play" className="w-full">
          Start
        </Button>
      </form>
    </Card>
  );
}
