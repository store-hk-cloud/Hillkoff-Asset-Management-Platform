"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextValue {
  readonly canInstall: boolean;
  readonly isIos: boolean;
  readonly isOnline: boolean;
  readonly isStandalone: boolean;
  install(): Promise<"accepted" | "dismissed" | "ios" | "unavailable">;
}

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const initialStateFrame = window.requestAnimationFrame(() => {
      setIsOnline(navigator.onLine);
      setIsStandalone(
        window.matchMedia("(display-mode: standalone)").matches ||
          ("standalone" in navigator &&
            (navigator as Navigator & { standalone?: boolean }).standalone ===
              true),
      );
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    });
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }

    return () => {
      window.cancelAnimationFrame(initialStateFrame);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: !isStandalone && (installPrompt !== null || isIos),
      isIos,
      isOnline,
      isStandalone,
      async install() {
        if (isIos && !installPrompt) return "ios";
        if (!installPrompt) return "unavailable";
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice.outcome === "accepted") setInstallPrompt(null);
        return choice.outcome;
      },
    }),
    [installPrompt, isIos, isOnline, isStandalone],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const value = useContext(PwaContext);
  if (!value) throw new Error("usePwa must be used within PwaProvider.");
  return value;
}
