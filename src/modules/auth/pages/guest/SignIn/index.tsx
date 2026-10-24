import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { validateEmail, validatePassword } from '@/modules/auth/utils/validators';
import { Colors, FontSize, Spacing } from '@/theme';
import { showAlert } from '@/utils/alert';
import { supabase } from '@/utils/supabase';

export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) return;

    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (error) {
      showAlert('No se pudo iniciar sesión', error.message);
      return;
    }

    router.replace('/explore');
  }

  function handleForgotPassword() {
    router.push('/forgot-password');
  }


  function handleCreateAccount() {
    router.push('/sign-up');
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
            <Text style={styles.title}>Iniciar sesión</Text>
            <Text style={styles.subtitle}>Bienvenido de nuevo a Cine Teca</Text>
          </View>

          <View style={styles.form}>
            <AuthTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              error={errors.email}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <AuthTextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Ingresa tu contraseña"
              error={errors.password}
              description="Debe tener al menos 8 caracteres, con 1 mayúscula y 1 número"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />

            <AuthButton
              label="¿Olvidaste tu contraseña?"
              onPress={handleForgotPassword}
              variant="link"
              style={styles.forgotPassword}
            />

            <AuthButton label="Iniciar sesión" onPress={handleSubmit} disabled={isSubmitting} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <AuthButton label="Crear cuenta" onPress={handleCreateAccount} variant="link" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  form: {
    gap: Spacing.md,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
