"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setMockSessionUser, type MeResponse } from "@/lib/api";
import { AuthCtx, type AuthValue, type ModalKind } from "./auth-context";
import JoinModal from "./JoinModal";

const EMPTY: MeResponse = { user: null, entry: null };
const DISMISS_KEY = "fogm-join-dismissed";
const AUTO_OPEN_MS = 1500;

async function fetchMe(): Promise<MeResponse> {
  try {
    const res = await fetch("/api/me", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return EMPTY;
    return (await res.json()) as MeResponse;
  } catch {
    return EMPTY;
  }
}

/** Owns the session state, the modal state and the 1.5s auto-open of the join popup. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  const opened = useRef(false);

  const apply = useCallback((m: MeResponse) => {
    // mock mode: the mock API needs to know who is signed in *before* the page refetches
    setMockSessionUser(
      m.user
        ? { userId: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl, publicConsent: m.user.publicConsent, country: m.user.country ?? undefined }
        : null,
    );
    setMe(m);
  }, []);

  const refresh = useCallback(async () => {
    const m = await fetchMe();
    apply(m);
    return m;
  }, [apply]);

  useEffect(() => {
    let alive = true;
    void fetchMe().then((m) => {
      if (!alive) return;
      apply(m);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  /* auto-open once, 1.5s after first load, if signed out and not dismissed this session */
  useEffect(() => {
    if (loading || me.user || opened.current) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* storage blocked: treat as not dismissed */
    }
    if (dismissed) return;
    opened.current = true;
    const t = setTimeout(() => setModal((m) => m ?? "join"), AUTO_OPEN_MS);
    return () => clearTimeout(t);
  }, [loading, me.user]);

  const closeModal = useCallback(() => {
    setModal(null);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      apply(EMPTY);
    }
  }, [apply]);

  const value = useMemo<AuthValue>(
    () => ({ loading, user: me.user, entry: me.entry, modal, openModal: setModal, closeModal, refresh, logout }),
    [loading, me, modal, closeModal, refresh, logout],
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <JoinModal />
    </AuthCtx.Provider>
  );
}
