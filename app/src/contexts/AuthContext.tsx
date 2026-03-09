import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useIdentityToken } from "@privy-io/react-auth";
import { api } from "@/lib/api";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ReturnType<typeof usePrivy>["user"];
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { identityToken } = useIdentityToken();
  const hasSynced = useRef(false);

  // Wire up the API client's token getter — always returns latest ref
  useEffect(() => {
    api.setTokenGetter(() => identityToken);
  }, [identityToken]);

  // Call /auth/sync once per session after first token is available
  useEffect(() => {
    if (authenticated && identityToken && !hasSynced.current) {
      hasSynced.current = true;
      api.authSync().catch((err) => console.error("Auth sync failed:", err));
    }
  }, [authenticated, identityToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authenticated,
        isLoading: !ready,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
