import { Text, TextInput } from 'react-native';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import Search from '..';
import { searchMovies, TmdbConfigError } from '@/modules/movies/api/tmdb';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/modules/movies/api/tmdb', () => ({
  ...jest.requireActual('@/modules/movies/api/tmdb'),
  searchMovies: jest.fn(),
  discoverMoviesByGenres: jest.fn(),
  getMovieGenres: jest.fn(() => Promise.resolve([])),
}));

const ERROR_COPY = 'No se pudo completar la búsqueda. Intenta nuevamente.';

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root.findAllByType(Text).map((node) => [node.props.children].flat().join(''));
}

// El botón que contiene el texto indicado.
function button(renderer: ReactTestRenderer, label: string): ReactTestInstance | undefined {
  let node: ReactTestInstance | null | undefined = renderer.root
    .findAllByType(Text)
    .find((text) => text.props.children === label);
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  return node ?? undefined;
}

let mounted: ReactTestRenderer | null = null;

async function renderAndSearch(text: string) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<Search />);
  });
  mounted = renderer;
  act(() => renderer.root.findByType(TextInput).props.onChangeText(text));
  // Pasa la espera de la búsqueda (debounce) y llega la respuesta.
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
  return renderer;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => mounted?.unmount());
  mounted = null;
  jest.useRealTimers();
  jest.clearAllMocks();
  // Si una prueba falla a mitad, sus respuestas encoladas no pasan a la siguiente.
  jest.mocked(searchMovies).mockReset();
});

describe('Search (AC-10)', () => {
  it('si TheMovieDB falla muestra el error con «Reintentar» y al tocarlo vuelve a buscar', async () => {
    jest
      .mocked(searchMovies)
      .mockRejectedValueOnce(new Error('TheMovieDB respondió con un error (503).'))
      .mockResolvedValueOnce({
        results: [{ id: 603, mediaType: 'movie', title: 'Matrix', year: '1999', posterUrl: null }],
        totalPages: 1,
      });

    const renderer = await renderAndSearch('matrix');
    expect(texts(renderer)).toContain(ERROR_COPY);

    await act(async () => {
      button(renderer, 'Reintentar')!.props.onPress();
    });

    expect(searchMovies).toHaveBeenCalledTimes(2);
    expect(jest.mocked(searchMovies).mock.calls[1][0]).toBe('matrix');
    expect(texts(renderer)).not.toContain(ERROR_COPY);
    expect(texts(renderer)).toContain('Matrix');
  });

  it('si falta la clave de TheMovieDB lo avisa sin ofrecer «Reintentar»', async () => {
    const message = 'Falta configurar EXPO_PUBLIC_TMDB_API_KEY para poder buscar en TheMovieDB.';
    jest.mocked(searchMovies).mockRejectedValueOnce(new TmdbConfigError(message));

    const renderer = await renderAndSearch('matrix');

    expect(texts(renderer)).toContain(message);
    expect(button(renderer, 'Reintentar')).toBeUndefined();
  });
});
