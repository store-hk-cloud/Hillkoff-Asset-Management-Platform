import type { User } from "firebase/auth";

export interface AuthState {
  readonly user: User | null;
  readonly loading: boolean;
}
