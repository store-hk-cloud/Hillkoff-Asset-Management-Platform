export default function Loading() {
  return (
    <main
      className="grid min-h-dvh place-items-center"
      aria-live="polite"
      aria-busy="true"
    >
      <p className="text-muted-foreground text-sm">Loading…</p>
    </main>
  );
}
