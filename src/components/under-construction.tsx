import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyNotice } from '@/components/empty-notice';
import { HomeBackButton } from '@/components/home-back-button';

// Pantalla provisoria para una zona que todavía no está hecha.
export function UnderConstruction({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <HomeBackButton />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.body}>
        <EmptyNotice title="En construcción" copy="Esta sección todavía no está lista. Vuelve pronto." />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0B0F' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  title: { flex: 1, color: '#F4F4F5', fontSize: 21, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 4 },
});
