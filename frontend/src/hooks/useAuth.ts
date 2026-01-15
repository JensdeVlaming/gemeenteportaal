import { getSession, onAuthStateChange } from "@/services/authService";
import { useEffect, useState } from "react";

type AuthSession = {
  token: string;
  record: Record<string, unknown> | null;
};

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    const unsubscribe = onAuthStateChange(() => {
      getSession()
        .then((s) => setSession(s))
        .catch(() => setSession(null));
    });

    return unsubscribe;
  }, []);

  return { session, loading };
}
