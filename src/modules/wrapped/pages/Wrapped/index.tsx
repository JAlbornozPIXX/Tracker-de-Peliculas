import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/modules/auth/context/AuthContext';
import { formatMinutes } from '@/modules/stats/utils/format';
import { getWrapped } from '@/modules/wrapped/api/wrapped';
import { WrappedCard } from '@/modules/wrapped/components/wrapped-card';
import { shareViewAsImage } from '@/modules/wrapped/utils/share-image';
import { isWrappedReady, WRAPPED_MIN_VIEWS, type WrappedSummary } from '@/modules/wrapped/utils/summary';

function PartialSummary({ summary, onSearch }: { summary: WrappedSummary; onSearch: () => void }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Registra más películas para tu Wrapped</Text>
      <Text style={styles.panelCopy}>
        Llevas {summary.views === 1 ? '1 vista' : `${summary.views} vistas`} en {summary.year}. Con {WRAPPED_MIN_VIEWS} se
        arma tu tarjeta del año.
      </Text>
      <View style={styles.partialTotals}>
        <Text style={styles.partialValue}>{summary.titles === 1 ? '1 título' : `${summary.titles} títulos`}</Text>
        <Text style={styles.partialValue}>{formatMinutes(summary.minutes)}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onSearch} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Buscar películas</Text>
      </Pressable>
    </View>
  );
}

export default function Wrapped() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const year = new Date().getFullYear();
  const cardRef = useRef<View>(null);
  const [summary, setSummary] = useState<WrappedSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let active = true;
      setLoadError(null);
      getWrapped(userId, year)
        .then((data) => active && setSummary(data))
        .catch((err) => active && setLoadError(err instanceof Error ? err.message : 'Inténtalo de nuevo.'));
      return () => {
        active = false;
      };
    }, [userId, year, attempt])
  );

  async function handleShare() {
    setSharing(true);
    try {
      const shared = await shareViewAsImage(cardRef, `wrapped-${year}`);
      if (!shared) Alert.alert('No se puede compartir', 'Este dispositivo no permite compartir imágenes.');
    } catch (err) {
      Alert.alert('No se pudo crear la imagen', err instanceof Error ? err.message : '');
    } finally {
      setSharing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          onPress={() => router.dismissTo('/explore')}
          style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Wrapped {year}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}>
        {loadError ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>No se pudo cargar tu Wrapped</Text>
            <Text style={styles.panelCopy}>{loadError}</Text>
            <Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : !summary ? (
          <ActivityIndicator color="#B94DFF" size="large" style={styles.loading} />
        ) : isWrappedReady(summary) ? (
          <>
            <WrappedCard ref={cardRef} summary={summary} />
            <Pressable
              accessibilityRole="button"
              disabled={sharing}
              onPress={handleShare}
              style={[styles.primaryButton, styles.shareButton, sharing && styles.buttonDisabled]}>
              {sharing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{Platform.OS === 'web' ? 'Descargar imagen' : 'Compartir'}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <PartialSummary summary={summary} onSearch={() => router.push('/search')} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  backButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#17151D', borderWidth: 1, borderColor: '#292431', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#F4F4F5', fontSize: 22, lineHeight: 22 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  content: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 6 },
  loading: { marginTop: 80 },
  panel: { alignSelf: 'stretch', backgroundColor: '#15131A', borderRadius: 15, borderWidth: 1, borderColor: '#27222D', padding: 18 },
  panelTitle: { color: '#F4F4F5', fontSize: 16, fontWeight: '800' },
  panelCopy: { color: '#8F8795', fontSize: 13, lineHeight: 19, marginTop: 6 },
  partialTotals: { flexDirection: 'row', gap: 16, marginTop: 14 },
  partialValue: { color: '#D78CFF', fontSize: 15, fontWeight: '700' },
  primaryButton: { alignSelf: 'flex-start', marginTop: 16, minWidth: 140, alignItems: 'center', backgroundColor: '#A83BDD', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  shareButton: { alignSelf: 'center', marginTop: 20 },
  buttonDisabled: { opacity: 0.6 },
});
