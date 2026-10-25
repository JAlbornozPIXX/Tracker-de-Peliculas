import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChipOption, Chips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import type { Genre } from '@/modules/movies/api/tmdb';
import { tmdbDrawSource } from '@/modules/random/api/random';
import { DrawResult, drawStyles, PrimaryButton, SecondaryButton } from '@/modules/random/components/draw-result';
import { useDraw } from '@/modules/random/hooks/use-draw';
import {
  describeFilters,
  EMPTY_ROULETTE_FILTERS,
  loosenFilters,
  RouletteFilters,
  toDiscoverFilters,
} from '@/modules/random/utils/roulette';

const DURATION_OPTIONS: ChipOption<number | null>[] = [
  { key: null, label: 'Sin límite' },
  { key: 90, label: '90 min' },
  { key: 100, label: '100 min' },
  { key: 120, label: '120 min' },
  { key: 150, label: '150 min' },
];

// Ruleta: género + duración máxima entre todas las películas de TheMovieDB,
// sin las que el usuario terminó o abandonó (RN-03).
export function RouletteMode({ userId, genres }: { userId: string; genres: Genre[] }) {
  const draw = useDraw();
  const [filters, setFilters] = useState<RouletteFilters>(EMPTY_ROULETTE_FILTERS);
  const loosened = loosenFilters(filters);

  function spin(nextFilters: RouletteFilters) {
    setFilters(nextFilters);
    draw.draw(() => tmdbDrawSource(userId, toDiscoverFilters(nextFilters)), 'No se pudo girar la ruleta');
  }

  if (draw.phase !== 'setup') {
    return (
      <DrawResult
        draw={draw}
        loadingText="Girando la ruleta…"
        againLabel="Girar de nuevo"
        changeLabel="Cambiar filtros"
        exhaustedCopy={`Viste todas las sugerencias para: ${describeFilters(filters)}.`}
        exhaustedActions={loosened && <SecondaryButton label="Aflojar restricciones" onPress={() => spin(loosened)} />}
        empty={
          loosened ? (
            <EmptyNotice
              title="Sin coincidencias"
              copy={`Ninguna película de TheMovieDB cumple: ${describeFilters(filters)}.`}
              actionLabel="Aflojar restricciones"
              onAction={() => spin(loosened)}
            />
          ) : (
            <EmptyNotice title="Sin películas" copy="TheMovieDB no devolvió películas. Intenta de nuevo en un rato." />
          )
        }
      />
    );
  }

  return (
    <View>
      <Text style={drawStyles.intro}>
        Elige tus restricciones y la ruleta te sugiere al azar una película de TheMovieDB que no hayas terminado ni
        abandonado.
      </Text>
      <View style={drawStyles.group}>
        <Text style={drawStyles.label}>Género</Text>
        <Chips
          options={[{ key: null, label: 'Cualquiera' }, ...genres.map((genre) => ({ key: genre.id, label: genre.name }))]}
          value={filters.genre?.id ?? null}
          onChange={(genreId) =>
            setFilters((prev) => ({ ...prev, genre: genres.find((genre) => genre.id === genreId) ?? null }))
          }
          scroll
        />
      </View>
      <View style={drawStyles.group}>
        <Text style={drawStyles.label}>Duración máxima</Text>
        <Chips
          options={DURATION_OPTIONS}
          value={filters.maxDurationMinutes}
          onChange={(maxDurationMinutes) => setFilters((prev) => ({ ...prev, maxDurationMinutes }))}
        />
      </View>
      <View style={drawStyles.submit}>
        <PrimaryButton label="Girar" onPress={() => spin(filters)} />
      </View>
    </View>
  );
}
