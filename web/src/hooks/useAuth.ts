import { getSession, onAuthStateChange } from "@/services/authService";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
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
