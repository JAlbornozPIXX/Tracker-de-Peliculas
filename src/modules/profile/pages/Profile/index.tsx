import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { getProfile, updateDisplayName, uploadAvatar } from '@/modules/profile/api/profile';
import { ProfileAvatar } from '@/modules/profile/components/profile-avatar';

export default function Profile() {
  const router = useRouter();
  const { session, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const userId = session?.user.id;
  const email = session?.user.email ?? 'Sin correo';

  useEffect(() => {
    if (!userId) return;
    async function loadProfile() {
      try {
        const profile = await getProfile(userId!);
        setDisplayName(profile?.displayName ?? '');
        setSavedName(profile?.displayName ?? '');
        setAvatarUrl(profile?.avatarUrl ?? null);
      } catch (err) {
        Alert.alert('No se pudo cargar tu perfil', err instanceof Error ? err.message : undefined);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [userId]);

  const trimmedName = displayName.trim();
  const canSave = !savingName && trimmedName.length > 0 && trimmedName !== savedName;

  const handleSaveName = useCallback(async () => {
    if (!canSave || !userId) return;
    setSavingName(true);
    try {
      await updateDisplayName(userId, trimmedName);
      setSavedName(trimmedName);
    } catch (err) {
      Alert.alert('No se pudo guardar tu nombre', err instanceof Error ? err.message : undefined);
    } finally {
      setSavingName(false);
    }
  }, [canSave, trimmedName, userId]);

  const handlePickAvatar = useCallback(async () => {
    if (!userId) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el acceso a tus fotos para cambiar tu avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) return;

    setUploadingAvatar(true);
    try {
      const newUrl = await uploadAvatar(userId, result.assets[0]);
      setAvatarUrl(`${newUrl}?t=${Date.now()}`);
    } catch (err) {
      Alert.alert('No se pudo subir tu foto', err instanceof Error ? err.message : undefined);
    } finally {
      setUploadingAvatar(false);
    }
  }, [userId]);

  async function handleSignOut() {
    await signOut();
  }

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#B94DFF" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <ProfileAvatar
            avatarUrl={avatarUrl}
            label={savedName || email}
            size={96}
            loading={uploadingAvatar}
            onPress={handlePickAvatar}
          />
          <Text style={styles.avatarHint}>Toca la foto para cambiarla</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="¿Cómo quieres que te llamemos?"
            placeholderTextColor="#7D7382"
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />
          <Pressable
            disabled={!canSave}
            onPress={handleSaveName}
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            {savingName ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Correo</Text>
          <Text style={styles.readOnlyValue}>{email}</Text>
        </View>

        <Pressable onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  loadingScreen: { flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  headerTitle: { color: '#F4F4F5', fontSize: 17, fontWeight: '800' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 22 },
  avatarSection: { alignItems: 'center', gap: 10, marginTop: 8 },
  avatarHint: { color: '#8F8795', fontSize: 12 },
  field: { gap: 8 },
  label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#F4F4F5', fontSize: 15 },
  readOnlyValue: { backgroundColor: '#15131A', borderWidth: 1, borderColor: '#27222D', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#8F8795', fontSize: 15 },
  saveButton: { alignSelf: 'flex-start', backgroundColor: '#A83BDD', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 18 },
  saveButtonDisabled: { backgroundColor: '#432653', opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  signOutButton: { marginTop: 10, alignItems: 'center', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#F87171' },
  signOutText: { color: '#F87171', fontSize: 14, fontWeight: '700' },
});
