import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function StudentSignInPrompt() {
  return (
    <Card className="mx-auto max-w-md p-8 text-center">
      <span aria-hidden className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
        <Icon name="book" size={28} />
      </span>
      <h1 className="text-2xl font-semibold">Who is reading?</h1>
      <p className="mt-2 text-muted">Sign in on this tablet to see your reading.</p>
      <ButtonLink href="/login/student" size="lg" icon="key" className="mt-6 w-full">
        Sign in
      </ButtonLink>
    </Card>
  );
}
