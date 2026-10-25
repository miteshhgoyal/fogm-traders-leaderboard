"use client";

import { createContext, useContext } from "react";
import type { MeResponse, MeUser } from "@/lib/api";

export type ModalKind = "join" | "card" | "photo" | null;

export interface AuthValue {
  /** True until the first GET /api/me has settled. */
  loading: boolean;
  user: MeUser | null;
  entry: MeResponse["entry"];
  modal: ModalKind;
  openModal: (m: Exclude<ModalKind, null>) => void;
  closeModal: () => void;
  /** Re-read /api/me (after verify / profile save). Returns the fresh response. */
  refresh: () => Promise<MeResponse>;
  logout: () => Promise<void>;
  /** Bumps once after a fresh sign-in / join finishes and the modal has closed: the board scrolls to the user's row. */
  focusTick: number;
}

export const AuthCtx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
