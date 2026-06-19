"use client";

import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";

import { initializeFirebaseAuth } from "@/firebase/auth";
import type { AuthState } from "@/features/auth/types/auth-state";

export const AuthContext = createContext<AuthState | null>(null);

type AuthProviderProps = Readonly<{
  children: ReactNode;
}>;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void initializeFirebaseAuth().then((auth) => {
      unsubscribe = onAuthStateChanged(auth, (nextUser) => {
        setUser(nextUser);
        setLoading(false);
      });
    });

    return () => unsubscribe?.();
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
