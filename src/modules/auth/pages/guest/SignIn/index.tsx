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
import { Colors, FontSize, Spacing } from '@/theme';


const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

function validateEmail(value: string): string | undefined {
  if (!value) return 'El correo es obligatorio';
  if (!EMAIL_REGEX.test(value)) return 'Ingresa un correo válido';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 8) return 'Debe tener al menos 8 caracteres';
  if (!/[A-Z]/.test(value)) return 'Debe incluir al menos una mayúscula';
  if (!/[0-9]/.test(value)) return 'Debe incluir al menos un número';
  return undefined;
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

    function handleSubmit() {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    setErrors({ email: emailError, password: passwordError });

    if (emailError || passwordError) return;

    Alert.alert('Formulario válido', `Continuarías el inicio de sesión con: ${email}`);
  }

  function handleForgotPassword() {
    Alert.alert('Próximamente', 'Esta pantalla se agregará en un paso futuro.');
  }

  function handleCreateAccount() {
    Alert.alert('Próximamente', 'Esta pantalla se agregará en un paso futuro.');
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

            <AuthButton label="Iniciar sesión" onPress={handleSubmit} />
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
