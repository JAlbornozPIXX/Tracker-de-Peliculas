import { Text } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import ExploreScreen from '@/app/(app)/explore';
import { getCatalogMovies } from '@/modules/movies/api/movies';
import { getTrackedMovies, type TrackedMovie } from '@/modules/movies/api/user-movies';

const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
    // En la prueba la pantalla siempre está enfocada.
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
  };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/components/golden-poster', () => ({ GoldenPoster: () => null }));
jest.mock('@/modules/auth/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1', email: 'ana@ejemplo.com' } } }),
}));
jest.mock('@/modules/movies/api/movies', () => ({ getCatalogMovies: jest.fn() }));
jest.mock('@/modules/movies/api/user-movies', () => ({ getTrackedMovies: jest.fn() }));
jest.mock('@/modules/profile/api/profile', () => ({ getProfile: jest.fn(async () => null) }));
jest.mock('@/modules/profile/components/profile-avatar', () => ({ ProfileAvatar: () => null }));
jest.mock('@/modules/watchlist/api/shame', () => ({ getShamePile: jest.fn(async () => []) }));
jest.mock('@/modules/lists/components/lists-section', () => ({ ListsSection: () => null }));

function tracked(movieId: number, status: TrackedMovie['status'], statusChangedAt = '2026-11-01'): TrackedMovie {
  return {
    movieId,
    status,
    rating: null,
    statusChangedAt,
    movie: { id: movieId, title: `Película ${movieId}`, overview: null, poster_url: null },
  };
}

function textsIn(node: ReactTestInstance): string[] {
  return node.findAllByType(Text).map((text) => [text.props.children].flat().join(''));
}

function texts(renderer: ReactTestRenderer): string[] {
  return textsIn(renderer.root);
}

function section(renderer: ReactTestRenderer, title: string): ReactTestInstance {
  return renderer.root.find((node) => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith(`${title},`));
}

function titlesIn(node: ReactTestInstance): string[] {
  return textsIn(node).filter((text) => text.startsWith('Película '));
}

let mounted: ReactTestRenderer | null = null;

async function renderHome() {
  await act(async () => {
    mounted = create(<ExploreScreen />);
  });
  return mounted!;
}

afterEach(() => {
  act(() => mounted?.unmount());
  mounted = null;
  jest.clearAllMocks();
});

describe('Inicio (L1)', () => {
  it('AC-30: con 2 Viendo y 5 Ver más tarde muestra buscar arriba, «Continuar viendo» (2) y «Para ver» (5)', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([
      tracked(1, 'watching'),
      tracked(2, 'watching'),
      ...[3, 4, 5, 6, 7].map((id) => tracked(id, 'watchlist')),
      tracked(8, 'watched'),
    ]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    const home = await renderHome();
    const all = texts(home);

    expect(all.indexOf('Buscar películas y series')).toBeLessThan(all.indexOf('Continuar viendo'));
    expect(all.indexOf('Continuar viendo')).toBeLessThan(all.indexOf('Para ver'));
    expect(titlesIn(section(home, 'Continuar viendo'))).toHaveLength(2);
    expect(titlesIn(section(home, 'Para ver'))).toHaveLength(5);
    // Una Terminada no aparece en ninguna de las dos.
    expect(titlesIn(section(home, 'Para ver'))).not.toContain('Película 8');
    expect(all).not.toContain('Busca tu primera película');
  });

  it('«Para ver» pone primero lo último que se marcó', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([
      tracked(1, 'watchlist', '2026-01-01'),
      tracked(2, 'watchlist', '2026-11-10'),
    ]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    const home = await renderHome();

    expect(titlesIn(section(home, 'Para ver'))).toEqual(['Película 2', 'Película 1']);
  });

  it('AC-38: un usuario nuevo sin títulos ve «Busca tu primera película», no secciones vacías', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    const home = await renderHome();
    const all = texts(home);

    expect(all).toContain('Busca tu primera película');
    expect(all).not.toContain('Continuar viendo');
    expect(all).not.toContain('Catálogo');
    expect(all).not.toContain('¿No sabes qué ver?');

    const button = home.root.find(
      (node) => node.props.accessibilityRole === 'button' && textsIn(node).includes('Buscar películas')
    );
    act(() => button.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it('los accesos a Ruleta, vergüenza y Wrapped siguen en Inicio (DEF-03), entre la búsqueda y las secciones', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([tracked(1, 'watching')]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    const all = texts(await renderHome());

    expect(all).toEqual(expect.arrayContaining(['Ruleta', 'Vergüenza', 'Wrapped']));
    expect(all.indexOf('Buscar películas y series')).toBeLessThan(all.indexOf('Ruleta'));
    expect(all.indexOf('Wrapped')).toBeLessThan(all.indexOf('Continuar viendo'));
  });

  it('con títulos para ver ofrece la Ruleta después de «Para ver»', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([tracked(1, 'watchlist'), tracked(2, 'watchlist')]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    const home = await renderHome();
    const all = texts(home);

    expect(all.indexOf('Para ver')).toBeLessThan(all.indexOf('¿No sabes qué ver?'));
    expect(all.join(' ')).toContain('Tienes 2 títulos para ver');

    const card = home.root.find((node) => node.props.accessibilityLabel === 'Abrir la Ruleta para elegir qué ver' && node.props.onPress);
    act(() => card.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/random');
  });

  it('saluda con el nombre sacado del correo cuando no hay perfil', async () => {
    jest.mocked(getTrackedMovies).mockResolvedValue([tracked(1, 'watching')]);
    jest.mocked(getCatalogMovies).mockResolvedValue([]);

    expect(texts(await renderHome())).toContain('Hola, Ana');
  });
});
