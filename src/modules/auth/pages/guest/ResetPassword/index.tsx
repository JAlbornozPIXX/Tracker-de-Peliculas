import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/modules/auth/components/auth-button';
import { AuthTextField } from '@/modules/auth/components/auth-text-field';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { validatePassword } from '@/modules/auth/utils/validators';
import { Colors, FontSize, Spacing } from '@/theme';
import { showAlert } from '@/utils/alert';
import { supabase } from '@/utils/supabase';

export default function ResetPassword() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { setPasswordRecovery } = useAuth();
  const [exchangeStatus, setExchangeStatus] = useState<'validating' | 'ready' | 'error'>('validating');
  // Sin code en el enlace no hay nada que validar.
  const status = code ? exchangeStatus : 'error';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (!code || hasExchanged.current) return;
    hasExchanged.current = true;

    // Marcamos "modo recuperación" de inmediato, antes de que la promesa
    // resuelva, para que Stack.Protected no te deje entrar a (app) ni (auth)
    // mientras todavía no escribiste la contraseña nueva.
    setPasswordRecovery(true);

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setExchangeStatus(error ? 'error' : 'ready');
    });
  }, [code, setPasswordRecovery]);

  async function handleSubmit() {
    const passwordError = validatePassword(password);
    const confirmError =
      password !== confirmPassword ? 'Las contraseñas no coinciden' : undefined;
    setErrors({ password: passwordError, confirmPassword: confirmError });
    if (passwordError || confirmError) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      showAlert('No se pudo actualizar la contraseña', error.message);
      return;
    }

    setPasswordRecovery(false);
    router.replace('/explore');
  }

  if (status === 'validating') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.title}>Enlace inválido o expirado</Text>
          <Text style={styles.subtitle}>
            Solicita un nuevo enlace de recuperación desde la pantalla de inicio de sesión.
          </Text>
          <AuthButton label="Volver a iniciar sesión" onPress={() => router.replace('/sign-in')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Nueva contraseña</Text>
            <Text style={styles.subtitle}>Elige una nueva contraseña para tu cuenta.</Text>
          </View>

          <View style={styles.form}>
            <AuthTextField
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu nueva contraseña"
              error={errors.password}
              description="Debe tener al menos 8 caracteres, con 1 mayúscula y 1 número"
              secureTextEntry
              textContentType="newPassword"
            />

            <AuthTextField
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite tu nueva contraseña"
              error={errors.confirmPassword}
              secureTextEntry
              textContentType="newPassword"
            />

            <AuthButton
              label="Guardar contraseña"
              onPress={handleSubmit}
              disabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  header: { gap: Spacing.xs },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center' },
  form: { gap: Spacing.md },
});
