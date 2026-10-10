import { Redirect } from 'expo-router';

import { useAuth } from '@/modules/auth/context/AuthContext';

export default function Index() {
  const { session, loading, isPasswordRecovery } = useAuth();

  if (loading) return null;
  if (isPasswordRecovery) return <Redirect href="/reset-password" />;
  return <Redirect href={session ? '/explore' : '/sign-in'} />;
}
