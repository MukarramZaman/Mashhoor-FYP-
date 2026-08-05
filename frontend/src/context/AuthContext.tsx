import { createContext, useContext, useState, type ReactNode } from "react";
import { authApi, type AuthUser, type UserRole } from "../api";

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole, inviteToken?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("mashhoor_user");
    return saved ? JSON.parse(saved) : null;
  });

  const saveSession = (user: AuthUser, token: string, refreshToken: string) => {
    setUser(user);
    localStorage.setItem("mashhoor_user", JSON.stringify(user));
    localStorage.setItem("mashhoor_token", token);
    localStorage.setItem("mashhoor_refresh_token", refreshToken);
  };

  const login = async (email: string, password: string, role: UserRole) => {
    const { user, token, refreshToken } = await authApi.login(email, password, role);
    saveSession(user, token, refreshToken);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole,
    inviteToken?: string
  ) => {
    const { user, token, refreshToken } = await authApi.register(
      name,
      email,
      password,
      role,
      inviteToken
    );
    saveSession(user, token, refreshToken);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mashhoor_user");
    localStorage.removeItem("mashhoor_token");
    localStorage.removeItem("mashhoor_refresh_token");
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    localStorage.setItem("mashhoor_user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
