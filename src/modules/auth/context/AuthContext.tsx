import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/utils/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  setPasswordRecovery: (value: boolean) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // 1. Pregunta única: ¿ya había sesión guardada?
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2. Suscripción: avísame cada vez que la sesión cambie de aquí en adelante
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    // Al desmontar, cancelamos la suscripción para no dejar "oyentes" colgando
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' });
    setPasswordRecovery(false);
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, isPasswordRecovery, setPasswordRecovery, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return value;
}
