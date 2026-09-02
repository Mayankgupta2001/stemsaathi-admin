"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export const ADMIN_TOKEN_KEY = "admin_token";

export function getStoredAdminToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setStoredAdminToken(token: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
}

export function clearStoredAdminToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

export function useAdminAuthGuard({
  requireToken,
  redirectPath,
}: {
  requireToken: boolean;
  redirectPath: string;
}) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getStoredAdminToken();

    if (requireToken) {
      if (!token) {
        router.replace(redirectPath);
        queueMicrotask(() => setIsReady(false));
        return;
      }

      queueMicrotask(() => setIsReady(true));
      return;
    }

    if (token) {
      router.replace(redirectPath);
      queueMicrotask(() => setIsReady(false));
      return;
    }

    queueMicrotask(() => setIsReady(true));
  }, [requireToken, redirectPath, router]);

  return {
    isReady,
    token: getStoredAdminToken(),
  };
}
