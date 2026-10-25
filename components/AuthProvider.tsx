"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setMockSessionUser, type MeResponse } from "@/lib/api";
import { AuthCtx, type AuthValue, type ModalKind } from "./auth-context";
import JoinModal from "./JoinModal";

const EMPTY: MeResponse = { user: null, entry: null };
const AUTO_OPEN_MS = 1000;

async function fetchMe(): Promise<MeResponse> {
  try {
    const res = await fetch("/api/me", { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return EMPTY;
    return (await res.json()) as MeResponse;
  } catch {
    return EMPTY;
  }
}

/** Owns the session state, the modal state and the ~1s auto-open of the join popup on every page load. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalKind>(null);
  const autoOpenedRef = useRef(false);
  const [focusTick, setFocusTick] = useState(0);
  const settled = useRef(false);
  const hadUser = useRef(false);
  const pendingFocus = useRef(false);

  const apply = useCallback((m: MeResponse) => {
    // mock mode: the mock API needs to know who is signed in before the page refetches
    setMockSessionUser(
      m.user
        ? {
            userId: m.user.id,
            name: m.user.name,
            avatarUrl: m.user.avatarUrl,
            showName: m.user.showName,
            showPhoto: m.user.showPhoto,
            country: m.user.country ?? undefined,
          }
        : null
    );
    // a sign-in after the page loaded (join / OTP login) queues a scroll-to-rank once the modal closes
    if (settled.current && !hadUser.current && m.user) pendingFocus.current = true;
    hadUser.current = !!m.user;
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
      settled.current = true;
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [apply]);

  /* Auto-open JoinModal on EVERY visit ~1s after mount when logged out.
     Fires once per page load (useRef).
     Never fires on /admin/* or /u/* or when logged in. */
  useEffect(() => {
    if (loading || me.user || autoOpenedRef.current) return;

    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname.startsWith("/admin") || pathname.startsWith("/u/")) {
        return;
      }
    }

    autoOpenedRef.current = true;
    const t = setTimeout(() => {
      setModal((prev) => prev ?? "join");
    }, AUTO_OPEN_MS);

    return () => clearTimeout(t);
  }, [loading, me.user]);

  const closeModal = useCallback(() => {
    setModal(null);
    if (pendingFocus.current) {
      pendingFocus.current = false;
      setFocusTick((t) => t + 1);
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
    () => ({ loading, user: me.user, entry: me.entry, modal, openModal: setModal, closeModal, refresh, logout, focusTick }),
    [loading, me, modal, closeModal, refresh, logout, focusTick]
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}
      <JoinModal />
    </AuthCtx.Provider>
  );
}
