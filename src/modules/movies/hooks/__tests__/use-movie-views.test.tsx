import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import { useMovieViews } from '../use-movie-views';
import { getViews, type ViewEntry } from '@/modules/movies/api/views';

const mockQueue = {
  days: [] as string[],
  listeners: new Set<() => void>(),
  notify() {
    mockQueue.listeners.forEach((listener) => listener());
  },
};

jest.mock('@/utils/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/modules/sync/queue', () => ({
  saveAutoView: jest.fn(),
  syncQueue: {
    pendingAutoViewDates: () => mockQueue.days,
    subscribe(listener: () => void) {
      mockQueue.listeners.add(listener);
      return () => mockQueue.listeners.delete(listener);
    },
  },
}));
jest.mock('@/modules/movies/api/views', () => ({
  ...jest.requireActual('@/modules/movies/api/views'),
  getViews: jest.fn(),
  addView: jest.fn(),
  deleteView: jest.fn(),
}));

const DAY = '2026-10-25';
const onViews = jest.fn<void, [ViewEntry[]]>();

// Lo último que devolvió el hook.
function latest(): ViewEntry[] {
  return onViews.mock.lastCall?.[0] ?? [];
}

function Probe() {
  const { views } = useMovieViews('user-1', 7);
  useEffect(() => {
    onViews(views);
  }, [views]);
  return null;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function renderWithPendingDay() {
  jest.mocked(getViews).mockResolvedValue([]);
  await act(async () => {
    create(<Probe />);
  });
  mockQueue.days = [DAY];
  await act(async () => mockQueue.notify());
  expect(latest()).toEqual([{ id: -1, viewedOn: DAY, source: 'auto', pending: true }]);
}

afterEach(() => {
  mockQueue.days = [];
  mockQueue.listeners.clear();
  jest.clearAllMocks();
});

describe('useMovieViews', () => {
  it('una vista que se sube sigue en la lista hasta que la recarga trae su fila (no parpadea)', async () => {
    await renderWithPendingDay();
    const reload = deferred<ViewEntry[]>();
    jest.mocked(getViews).mockImplementation(() => reload.promise);

    mockQueue.days = [];
    await act(async () => mockQueue.notify());
    expect(latest().map((view) => view.viewedOn)).toEqual([DAY]);

    await act(async () => reload.resolve([{ id: 9, viewedOn: DAY, source: 'auto' }]));
    expect(latest()).toEqual([{ id: 9, viewedOn: DAY, source: 'auto' }]);
  });

  it('si el servidor la descartó, desaparece con la recarga', async () => {
    await renderWithPendingDay();
    jest.mocked(getViews).mockResolvedValue([]);

    mockQueue.days = [];
    await act(async () => mockQueue.notify());
    expect(latest()).toEqual([]);
  });
});
