import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/modules/auth/components/auth-button';
import { AuthTextField } from '@/modules/auth/components/auth-text-field';
import { validateEmail } from '@/modules/auth/utils/validators';
import { Colors, FontSize, Spacing } from '@/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  function handleSubmit() {
    const emailError = validateEmail(email);
    setError(emailError);

    if (emailError) return;

    router.push('/check-email');
  }

  function handleGoToSignIn() {
    router.back();
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
            <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
            <Text style={styles.subtitle}>
              Ingresa tu correo y te enviaremos instrucciones para recuperarla.
            </Text>
          </View>

          <View style={styles.form}>
            <AuthTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              error={error}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <AuthButton label="Enviar instrucciones" onPress={handleSubmit} />
          </View>

          <View style={styles.footer}>
            <AuthButton label="Volver a iniciar sesión" onPress={handleGoToSignIn} variant="link" />
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
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
});
