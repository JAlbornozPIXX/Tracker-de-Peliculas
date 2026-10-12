import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ProfileAvatarProps = {
  avatarUrl: string | null;
  label: string;
  size?: number;
  loading?: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
};

export function ProfileAvatar({
  avatarUrl,
  label,
  size = 72,
  loading = false,
  accessibilityLabel = 'Cambiar foto de perfil',
  onPress,
}: ProfileAvatarProps) {
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <Pressable accessibilityLabel={accessibilityLabel} onPress={onPress} style={[styles.wrapper, dimensionStyle]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={[styles.image, dimensionStyle]} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.placeholder, dimensionStyle]}>
          <Text style={[styles.initial, { fontSize: size * 0.36 }]}>{initial}</Text>
        </View>
      )}
      {loading && (
        <View style={[styles.overlay, dimensionStyle]}>
          <ActivityIndicator color="#FFFFFF" size="small" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden', borderWidth: 1, borderColor: '#4A315C' },
  image: { backgroundColor: '#21172A' },
  placeholder: { backgroundColor: '#25212D', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#D6A5FF', fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(11,11,15,0.55)', alignItems: 'center', justifyContent: 'center' },
});
