import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <section className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link className="text-sm underline underline-offset-4" href="/">
          Return home
        </Link>
      </section>
    </main>
  );
}
