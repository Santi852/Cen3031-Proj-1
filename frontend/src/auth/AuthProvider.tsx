import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import * as authService from "./authService";

export default function AuthProvider({ children }: { children: ReactNode }) {
  // Read the saved session synchronously so a refresh on a protected page
  // doesn't flash a redirect to /signin before the user is restored.
  const [user, setUser] = useState(authService.getCurrentUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      signIn: async (email, password) => setUser(await authService.signIn(email, password)),
      signUp: async (email, password) => setUser(await authService.signUp(email, password)),
      signOut: async () => {
        await authService.signOut();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
