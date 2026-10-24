import {
  addDays,
  Challenge,
  challengeStatus,
  ChallengeView,
  countChallengeViews,
  daysBetween,
  monthRange,
  validateChallenge,
  validateExtension,
} from '../challenges';

const october: Challenge = {
  id: 1,
  title: '5 películas en octubre',
  targetCount: 5,
  filter: {},
  startsOn: '2026-10-01',
  endsOn: '2026-10-31',
};

const view = (movieId: number, viewedOn: string, genres: string[] = []): ChallengeView => ({ movieId, viewedOn, genres });

describe('validateChallenge', () => {
  const draft = { title: 'Reto', target: '5', startsOn: '2026-10-01', endsOn: '2026-10-31' };

  it('acepta un reto válido', () => {
    expect(validateChallenge(draft)).toBeNull();
    expect(validateChallenge({ ...draft, endsOn: draft.startsOn })).toBeNull();
  });

  it('rechaza meta 0 o negativa con un mensaje', () => {
    expect(validateChallenge({ ...draft, target: '0' })).toMatch(/al menos 1/);
    expect(validateChallenge({ ...draft, target: '-3' })).toMatch(/al menos 1/);
  });

  it('rechaza metas vacías, con decimales o que no son números', () => {
    expect(validateChallenge({ ...draft, target: '' })).toMatch(/número/);
    expect(validateChallenge({ ...draft, target: 'cinco' })).toMatch(/número/);
    expect(validateChallenge({ ...draft, target: '2.5' })).toMatch(/entero/);
  });

  it('rechaza un término anterior al inicio', () => {
    expect(validateChallenge({ ...draft, endsOn: '2026-09-30' })).toMatch(/anterior/);
  });

  it('pide un nombre', () => {
    expect(validateChallenge({ ...draft, title: '   ' })).toMatch(/nombre/);
  });
});

describe('countChallengeViews', () => {
  const views = [
    view(1, '2026-09-30'),
    view(1, '2026-10-01', ['Comedia']),
    view(2, '2026-10-10', ['Drama']),
    view(3, '2026-10-20', ['Comedia']),
    view(3, '2026-10-31', ['Comedia']),
    view(4, '2026-11-01'),
  ];

  it('cuenta solo las vistas dentro de las fechas, bordes incluidos', () => {
    expect(countChallengeViews(october, views, new Map())).toBe(4);
  });

  it('cuenta cada vista, también al volver a ver la misma película', () => {
    expect(countChallengeViews({ ...october, filter: { genre: 'Comedia' } }, views, new Map())).toBe(3);
  });

  it('filtra por lista', () => {
    const lists = new Map([[9, [2, 3]]]);
    expect(countChallengeViews({ ...october, filter: { list_id: 9 } }, views, lists)).toBe(3);
    expect(countChallengeViews({ ...october, filter: { list_id: 99 } }, views, lists)).toBe(0);
  });
});

describe('challengeStatus', () => {
  it('"5 películas en octubre" con 5 vistas en octubre está Cumplido', () => {
    expect(challengeStatus(october, 5, '2026-10-22')).toBe('completed');
    expect(challengeStatus(october, 5, '2026-11-15')).toBe('completed');
  });

  it('sin cumplir y con el plazo pasado está Vencido', () => {
    expect(challengeStatus(october, 3, '2026-11-01')).toBe('expired');
  });

  it('sin cumplir y dentro del plazo está En curso, incluido el último día', () => {
    expect(challengeStatus(october, 3, '2026-10-22')).toBe('active');
    expect(challengeStatus(october, 3, '2026-10-31')).toBe('active');
  });
});

describe('validateExtension', () => {
  it('pide una fecha posterior al término actual y no pasada', () => {
    expect(validateExtension(october, '2026-11-30', '2026-11-05')).toBeNull();
    expect(validateExtension(october, '2026-10-31', '2026-11-05')).toMatch(/posterior/);
    expect(validateExtension(october, '2026-11-02', '2026-11-05')).toMatch(/pasado/);
  });
});

describe('fechas', () => {
  it('calcula el mes completo', () => {
    expect(monthRange('2026-10-22')).toEqual({ startsOn: '2026-10-01', endsOn: '2026-10-31' });
    expect(monthRange('2028-02-10')).toEqual({ startsOn: '2028-02-01', endsOn: '2028-02-29' });
  });

  it('suma días y cuenta la diferencia', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
  });
});
