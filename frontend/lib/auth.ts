import type { AuthUser } from "@/lib/api";

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
  customer?: Record<string, unknown> | null;
  business?: Record<string, unknown> | null;
};

const SESSION_KEY = "lumina.session";
const ADMIN_WELCOME_KEY = "lumina.admin.welcome";

function storageFor(remember: boolean): Storage | null {
  if (typeof window === "undefined") return null;
  return remember ? window.localStorage : window.sessionStorage;
}

export function saveSession(session: AuthSession, remember = true): void {
  const target = storageFor(remember);
  const other = storageFor(!remember);

  try {
    other?.removeItem(SESSION_KEY);
    target?.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — ignore.
  }
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) continue;
      return JSON.parse(raw) as AuthSession;
    } catch {
      // Ignore malformed or inaccessible storage entries.
    }
  }

  return null;
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore inaccessible storage.
  }
}

export function markAdminWelcome(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ADMIN_WELCOME_KEY, "1");
  } catch {
    return;
  }
}

export function shouldWelcomeAdmin(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(ADMIN_WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearAdminWelcome(): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.removeItem(ADMIN_WELCOME_KEY);
  } catch {
    return;
  }
}
