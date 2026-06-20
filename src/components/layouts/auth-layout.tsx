import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh">
      <header className="flex min-h-14 items-center justify-end gap-1 px-4">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main className="grid min-h-[calc(100dvh-3.5rem)] place-items-center px-4 pb-14">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
