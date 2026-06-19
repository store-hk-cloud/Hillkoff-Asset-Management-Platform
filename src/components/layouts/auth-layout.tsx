import type { ReactNode } from "react";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
