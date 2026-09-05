import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
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

function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return 'Confirma tu contraseña';
  if (confirmPassword !== password) return 'Las contraseñas no coinciden';
  return undefined;
}

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  function handleSubmit() {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);
    setErrors({ email: emailError, password: passwordError, confirmPassword: confirmPasswordError });

    if (emailError || passwordError || confirmPasswordError) return;

    Alert.alert('Formulario válido', `Crearías la cuenta con: ${email}`);
  }

  function handleGoToSignIn() {
    router.push('/sign-in');
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
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Únete a Cine Teca</Text>
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
              placeholder="Crea una contraseña"
              error={errors.password}
              description="Debe tener al menos 8 caracteres, con 1 mayúscula y 1 número"
              secureTextEntry
              autoComplete="password"
              textContentType="newPassword"
            />

            <AuthTextField
              label="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite tu contraseña"
              error={errors.confirmPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="newPassword"
            />

            <AuthButton label="Crear cuenta" onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <AuthButton label="Iniciar sesión" onPress={handleGoToSignIn} variant="link" />
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
