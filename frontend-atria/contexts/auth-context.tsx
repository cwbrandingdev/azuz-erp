"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  clearAuthStorage,
  getAccessToken,
  getStoredUser,
  isRememberedSession,
  patchStoredUser,
  setAccessToken,
  setStoredUser,
} from "@/lib/auth-storage";
import { clearAppQueryCache } from "@/lib/query-client";
import { apiRequest, refreshAuthSession } from "@/services/api";
import { toast } from "@/lib/toast";
import type { AuthResponse, LoginCredentials, User } from "@/services/types";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials,
    rememberMe?: boolean,
  ) => Promise<User>;
  completeAuthSession: (response: AuthResponse, rememberMe?: boolean) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function accessTokenNeedsRefresh(token: string | null): boolean {
  if (!token) return true;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return true;
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    if (!payload.exp) return true;
    // Refresh only when fewer than 2 minutes remain.
    return payload.exp * 1000 <= Date.now() + 2 * 60 * 1000;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((response: AuthResponse, remember = false) => {
    setAccessToken(response.accessToken, remember);
    setStoredUser(response.user, remember);
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const response = await refreshAuthSession();
    if (response) {
      applySession(response, isRememberedSession());
      return true;
    }

    // Only wipe the session when we have no usable access token left.
    if (!getAccessToken()) {
      clearAuthStorage();
      setToken(null);
      setUser(null);
    }
    return false;
  }, [applySession]);

  useEffect(() => {
    async function init() {
      const storedToken = getAccessToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        if (accessTokenNeedsRefresh(storedToken)) {
          void refreshSession();
        }
        setIsLoading(false);
        return;
      }

      const refreshed = await refreshSession();
      if (!refreshed) {
        clearAuthStorage();
      }
      setIsLoading(false);
    }

    void init();
  }, [refreshSession]);

  const login = useCallback(
    async (credentials: LoginCredentials, rememberMe = false) => {
      const response = await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: credentials,
        skipAuth: true,
        skipToast: true,
      });
      applySession(response, rememberMe);
      return response.user;
    },
    [applySession],
  );

  const completeAuthSession = useCallback(
    (response: AuthResponse, rememberMe = true) => {
      applySession(response, rememberMe);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
    } finally {
      clearAuthStorage();
      clearAppQueryCache();
      setToken(null);
      setUser(null);
      toast.success("Sessão encerrada com sucesso");
      router.push("/login");
    }
  }, [router]);

  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const next = { ...current, ...partial };
      patchStoredUser(partial);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(accessToken && user),
      isLoading,
      login,
      completeAuthSession,
      logout,
      refreshSession,
      updateUser,
    }),
    [user, accessToken, isLoading, login, completeAuthSession, logout, refreshSession, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
