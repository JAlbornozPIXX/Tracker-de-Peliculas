import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton } from '@/modules/auth/components/auth-button';
import { Colors, FontSize, Spacing } from '@/theme';

export default function CheckEmail() {
  const router = useRouter();

  function handleGoToSignIn() {
    router.replace('/sign-in');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Revisa tu correo</Text>
        <Text style={styles.subtitle}>
          Si el correo que ingresaste existe en nuestro sistema, te enviamos un enlace para
          restablecer tu contraseña.
        </Text>

        <AuthButton label="Volver a iniciar sesión" onPress={handleGoToSignIn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
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
});
