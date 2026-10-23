import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { ChipOption, Chips } from '@/components/chips';
import { EmptyNotice } from '@/components/empty-notice';
import type { RouletteFilters } from '@/modules/movies/api/movies';
import { getRouletteCandidates } from '@/modules/random/api/random';
import { DrawResult, drawStyles, PrimaryButton, SecondaryButton } from '@/modules/random/components/draw-result';
import { useDraw } from '@/modules/random/hooks/use-draw';
import { describeFilters, EMPTY_ROULETTE_FILTERS, loosenFilters } from '@/modules/random/utils/roulette';

const DURATION_OPTIONS: ChipOption<number | null>[] = [
  { key: null, label: 'Sin límite' },
  { key: 90, label: '90 min' },
  { key: 100, label: '100 min' },
  { key: 120, label: '120 min' },
  { key: 150, label: '150 min' },
];

// Ruleta: género + duración máxima + no vista (RN-03).
export function RouletteMode({ userId, genres }: { userId: string; genres: string[] }) {
  const router = useRouter();
  const draw = useDraw();
  const [filters, setFilters] = useState<RouletteFilters>(EMPTY_ROULETTE_FILTERS);
  const loosened = loosenFilters(filters);

  function spin(nextFilters: RouletteFilters) {
    setFilters(nextFilters);
    draw.draw(() => getRouletteCandidates(userId, nextFilters), 'No se pudo girar la ruleta');
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
              copy={`Ninguna película sin ver de tu catálogo cumple: ${describeFilters(filters)}.`}
              actionLabel="Aflojar restricciones"
              onAction={() => spin(loosened)}
            />
          ) : (
            <EmptyNotice
              title="No hay películas sin ver en tu catálogo"
              copy="La ruleta solo sugiere títulos que guardaste o agregaste a tus listas y que no terminaste ni abandonaste."
              actionLabel="Buscar películas"
              onAction={() => router.push('/search')}
            />
          )
        }
      />
    );
  }

  return (
    <View>
      <Text style={drawStyles.intro}>Elige tus restricciones y la ruleta te sugiere una película sin ver de tu catálogo.</Text>
      <View style={drawStyles.group}>
        <Text style={drawStyles.label}>Género</Text>
        <Chips
          options={[{ key: null, label: 'Cualquiera' }, ...genres.map((genre) => ({ key: genre, label: genre }))]}
          value={filters.genre}
          onChange={(genre) => setFilters((prev) => ({ ...prev, genre }))}
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
