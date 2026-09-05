import { Colors, FontSize, Radius, Spacing } from '@/theme';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';

export interface AuthButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'link';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AuthButton({ label, onPress, variant = 'primary', disabled, style }: AuthButtonProps) {
  if (variant === 'link') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.linkPressed, style]}>
        <Text style={styles.linkText}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
        style,
      ]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonPressed: {
    backgroundColor: Colors.primaryPressed,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  linkPressed: {
    opacity: 0.6,
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
