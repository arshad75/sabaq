import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main id="main" className="grid flex-1 place-items-center p-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-1 text-3xl font-semibold">We can’t find that page</h1>
        <p className="mt-2 text-muted">
          It may have moved, or you may not have access to it. Teachers only see students a guardian has approved.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <ButtonLink href="/">Go home</ButtonLink>
          <Link href="/join" className="inline-flex min-h-11 items-center rounded-xl px-4 font-medium hover:bg-surface-2">
            Join a session
          </Link>
        </div>
      </div>
    </main>
  );
}
