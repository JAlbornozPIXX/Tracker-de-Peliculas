import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipOption, Chips } from '@/components/chips';
import { HomeBackButton } from '@/components/home-back-button';
import { useAuth } from '@/modules/auth/context/AuthContext';
import { getDistinctGenres } from '@/modules/movies/api/movies';
import { RouletteMode } from '@/modules/random/components/roulette-mode';
import { SimpleDrawMode } from '@/modules/random/components/simple-draw-mode';

type Mode = 'simple' | 'roulette';

const MODE_OPTIONS: ChipOption<Mode>[] = [
  { key: 'simple', label: 'Sorteo simple' },
  { key: 'roulette', label: 'Ruleta' },
];

export default function Random() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [mode, setMode] = useState<Mode>('roulette');
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;
    getDistinctGenres(userId)
      .then(setGenres)
      .catch((err) => Alert.alert('No se pudieron cargar los géneros', err instanceof Error ? err.message : ''));
  }, [userId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <HomeBackButton />
        <View style={styles.headerText}>
          <Text style={styles.title}>{mode === 'roulette' ? 'Ruleta' : 'Sorteo simple'}</Text>
          <Text style={styles.subtitle}>Una película al azar</Text>
        </View>
      </View>
      <View style={styles.modeRow}>
        <Chips options={MODE_OPTIONS} value={mode} onChange={setMode} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* Los dos modos quedan montados para no perder su sorteo al cambiar. */}
        {userId && (
          <>
            <View style={mode !== 'simple' && styles.hidden}>
              <SimpleDrawMode userId={userId} />
            </View>
            <View style={mode !== 'roulette' && styles.hidden}>
              <RouletteMode userId={userId} genres={genres} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerText: { flex: 1 },
  title: { color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  subtitle: { color: '#7D7382', fontSize: 12, marginTop: 2 },
  modeRow: { paddingHorizontal: 16, paddingBottom: 16 },
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 4 },
  hidden: { display: 'none' },
});
