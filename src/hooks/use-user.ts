/** useUser — subscribes to the Supabase auth session and re-renders on change. */
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    let authEventReceived = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      authEventReceived = true;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active || authEventReceived) return;
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        if (!active || authEventReceived) return;
        setUser(null);
        setLoading(false);
      });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
