import { supabase } from '@/utils/supabase';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

type Movie = {
  id: number;
  title: string;
};

export default function ExploreScreen() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const { data, error } = await supabase
          .from('movies')
          .select('id, title')
          .order('title');

        if (error) {
          console.error('Error fetching movies:', error.message);
          return;
        }

        if (data) {
          setMovies(data);
        }
      } catch (error: any) {
        console.error('Error fetching movies:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catálogo de Películas</Text>
      <FlatList
        data={movies}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.movieTitle}>{item.title}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay películas registradas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { padding: 12, marginBottom: 8, backgroundColor: '#f0f0f0', borderRadius: 8 },
  movieTitle: { fontSize: 16 },
  empty: { textAlign: 'center', color: '#888', marginTop: 20 },
});