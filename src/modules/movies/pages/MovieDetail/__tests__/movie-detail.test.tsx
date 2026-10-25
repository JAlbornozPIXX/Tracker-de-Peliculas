import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import MovieDetail from '..';
import { addMovieToList } from '@/modules/lists/api/lists';
import { saveUserMovie } from '@/modules/sync/queue';
import { confirmUnsavedChanges, showAlert } from '@/utils/alert';
import { usePreventRemove } from 'expo-router';

const mockRegisterAutoView = jest.fn(async (_movieId: number) => {});
// Cola de sincronización simulada: si hay cambios de la película en el teléfono.
const mockQueue = {
  pending: false,
  listeners: new Set<() => void>(),
  setPending(pending: boolean) {
    mockQueue.pending = pending;
    mockQueue.listeners.forEach((listener) => listener());
  },
};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '7' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  usePreventRemove: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/components/golden-poster', () => ({ GoldenPoster: () => null }));
jest.mock('@/modules/auth/context/AuthContext', () => ({ useAuth: () => ({ session: { user: { id: 'user-1' } } }) }));
jest.mock('@/modules/movies/api/movies', () => ({
  getMovieById: jest.fn(async () => ({
    id: 7,
    title: 'Matrix',
    overview: null,
    poster_url: null,
    release_date: '1999-03-31',
    genre: ['Acción'],
    duration_minutes: 136,
  })),
  findMovieIdByTmdb: jest.fn(),
  ensureMovieFromTmdb: jest.fn(),
}));
jest.mock('@/modules/movies/api/tmdb', () => ({ getMovieDetails: jest.fn() }));
jest.mock('@/modules/movies/api/user-movies', () => ({ getUserMovie: jest.fn(async () => null) }));
jest.mock('@/modules/movies/api/reactions', () => ({
  REACTION_EMOJI_MAX: 16,
  REACTION_NAME_MAX: 20,
  getReactions: jest.fn(async () => []),
  getReactionIdsForMovie: jest.fn(async () => []),
  createReaction: jest.fn(),
}));
jest.mock('@/modules/lists/api/lists', () => ({
  getLists: jest.fn(async () => [{ id: 4, name: 'Favoritas', kind: 'list', movieCount: 0 }]),
  getListIdsForMovie: jest.fn(async () => []),
  addMovieToList: jest.fn(async () => ({ error: null })),
  removeMovieFromList: jest.fn(async () => ({ error: null })),
}));
jest.mock('@/modules/movies/hooks/use-movie-views', () => ({
  useMovieViews: () => ({ views: [], registerView: jest.fn(), registerAutoViewToday: mockRegisterAutoView, removeView: jest.fn() }),
}));
jest.mock('@/modules/sync/queue', () => ({
  saveUserMovie: jest.fn(async () => 'saved'),
  saveMovieReaction: jest.fn(async () => 'saved'),
  withPendingUserMovie: async (_userId: string, _movieId: number, row: unknown) => row,
  withPendingReactions: async (_userId: string, _movieId: number, ids: number[]) => ids,
  syncQueue: {
    subscribe(listener: () => void) {
      mockQueue.listeners.add(listener);
      return () => mockQueue.listeners.delete(listener);
    },
    subscribeDiscarded: () => () => {},
    hasPending: () => mockQueue.pending,
  },
}));
jest.mock('@/utils/alert', () => ({
  ...jest.requireActual('@/utils/alert'),
  showAlert: jest.fn(),
  confirmUnsavedChanges: jest.fn(),
}));

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((node) => [node.props.children].flat().join(''));
}

// El elemento tocable con esa etiqueta de accesibilidad o ese texto.
function pressable(renderer: ReactTestRenderer, label: string): ReactTestInstance {
  const byLabel = renderer.root.findAll(
    (node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function'
  );
  if (byLabel.length > 0) return byLabel[0];
  let node: ReactTestInstance | null = renderer.root.findAllByType(Text).find((text) => text.props.children === label) ?? null;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`No hay nada tocable con «${label}»`);
  return node;
}

// ¿La ficha está protegida contra salir sin guardar? (último render)
function leaveIsGuarded(): boolean {
  return jest.mocked(usePreventRemove).mock.lastCall?.[0] ?? false;
}

let mounted: ReactTestRenderer | null = null;

async function renderDetail() {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<MovieDetail />);
  });
  mounted = renderer;
  return renderer;
}

// Toca la cuarta estrella completa, escribe una nota y marca una lista.
async function editEverything(renderer: ReactTestRenderer) {
  await act(async () => {
    pressable(renderer, 'Calificar 4 de 5 estrellas').props.onPress({ nativeEvent: { locationX: 36 } });
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Nota privada', multiline: true }).props.onChangeText('Gran final');
  });
  await act(async () => {
    pressable(renderer, 'Favoritas').props.onPress();
  });
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => mounted?.unmount());
  mounted = null;
  mockQueue.pending = false;
  mockQueue.listeners.clear();
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('MovieDetail', () => {
  it('la pastilla de pendiente va en la fila de Volver y solo aparece si el cambio sigue en el teléfono', async () => {
    const renderer = await renderDetail();
    const PILL = 'Pendiente de sincronizar';

    // Con red el cambio sube enseguida: un pendiente breve no muestra nada.
    act(() => mockQueue.setPending(true));
    act(() => mockQueue.setPending(false));
    act(() => mockQueue.setPending(true));
    expect(texts(renderer)).not.toContain(PILL);

    act(() => jest.advanceTimersByTime(800));
    expect(texts(renderer)).toContain(PILL);
    // Comparte la fila (de alto fijo) con el botón Volver: no corre el resto.
    const headerRow = pressable(renderer, 'Volver').parent!;
    expect(headerRow.findAllByType(Text).some((text) => text.props.children === PILL)).toBe(true);

    act(() => mockQueue.setPending(false));
    expect(texts(renderer)).not.toContain(PILL);
  });

  it('estrellas, nota y listas no se guardan hasta tocar Guardar, y ahí van juntas', async () => {
    const renderer = await renderDetail();
    expect(pressable(renderer, 'Guardar').props.disabled).toBe(true);

    await editEverything(renderer);

    expect(saveUserMovie).not.toHaveBeenCalled();
    expect(addMovieToList).not.toHaveBeenCalled();
    // Calificar sin estado deja el borrador en Terminado (A1).
    expect(pressable(renderer, 'Terminado').props.accessibilityState).toEqual({ selected: true });
    expect(texts(renderer)).toContain('Tienes cambios sin guardar.');
    expect(leaveIsGuarded()).toBe(true);

    await act(async () => {
      pressable(renderer, 'Guardar').props.onPress();
    });

    expect(saveUserMovie).toHaveBeenCalledTimes(1);
    expect(saveUserMovie).toHaveBeenCalledWith('user-1', 7, { status: 'watched', rating: 4, notes: 'Gran final' });
    expect(mockRegisterAutoView).toHaveBeenCalledWith(7);
    expect(addMovieToList).toHaveBeenCalledWith(4, 7);
    expect(texts(renderer)).toContain('Cambios guardados.');
    expect(pressable(renderer, 'Guardar').props.disabled).toBe(true);
    expect(leaveIsGuarded()).toBe(false);
  });

  it('si guardar falla, avisa y los cambios siguen sin guardar', async () => {
    jest.mocked(saveUserMovie).mockRejectedValueOnce(new Error('rechazado'));
    const renderer = await renderDetail();
    await editEverything(renderer);

    await act(async () => {
      pressable(renderer, 'Guardar').props.onPress();
    });

    expect(showAlert).toHaveBeenCalledWith('No se pudieron guardar los cambios', 'rechazado');
    expect(addMovieToList).not.toHaveBeenCalled();
    expect(pressable(renderer, 'Guardar').props.disabled).toBe(false);
    expect(leaveIsGuarded()).toBe(true);
  });

  // Simula intentar salir (botón, gesto o atrás de Android) y devuelve lo que
  // ofrece el aviso y la función que completa la salida.
  function tryToLeave() {
    const onRemovePrevented = jest.mocked(usePreventRemove).mock.lastCall![1]!;
    const repeat = jest.fn();
    act(() => onRemovePrevented({ data: { action: { type: 'GO_BACK' } }, repeat }));
    return { choices: jest.mocked(confirmUnsavedChanges).mock.lastCall![0], repeat };
  }

  it('al salir con cambios, descartar sale sin guardar', async () => {
    const renderer = await renderDetail();
    await editEverything(renderer);

    const { choices, repeat } = tryToLeave();
    act(() => choices.onDiscard());

    expect(repeat).toHaveBeenCalledTimes(1);
    expect(saveUserMovie).not.toHaveBeenCalled();
    expect(leaveIsGuarded()).toBe(false);
  });

  it('al salir con cambios, guardar guarda todo y recién después sale', async () => {
    const renderer = await renderDetail();
    await editEverything(renderer);

    const { choices, repeat } = tryToLeave();
    await act(async () => choices.onSave());

    expect(saveUserMovie).toHaveBeenCalledWith('user-1', 7, { status: 'watched', rating: 4, notes: 'Gran final' });
    expect(addMovieToList).toHaveBeenCalledWith(4, 7);
    expect(repeat).toHaveBeenCalledTimes(1);
  });
});
