import axios, { type AxiosError, type AxiosInstance } from 'axios';
import type {
  Card,
  CardFilters,
  Facets,
  Favorite,
  Paginated,
  Preferences,
  RecommendationResponse,
  RecommendationRun,
  User,
} from '@/types';

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

/** Normalised error thrown by every client method, so UI code never touches Axios types. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: { field: string; message: string }[];

  constructor(message: string, code: string, status: number, details?: ApiErrorShape['details']) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

const client: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Transparent access-token refresh. A 401 triggers exactly one refresh attempt, and
 * concurrent 401s share that single in-flight refresh rather than stampeding the endpoint.
 */
let refreshPromise: Promise<void> | null = null;

async function runRefresh(): Promise<void> {
  refreshPromise ??= client
    .post('/auth/refresh')
    .then(() => undefined)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: ApiErrorShape }>) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      try {
        await runRefresh();
        return await client.request(original);
      } catch {
        // Fall through to the normalised rejection below.
      }
    }

    const payload = error.response?.data?.error;
    throw new ApiError(
      payload?.message ?? error.message ?? 'Something went wrong',
      payload?.code ?? 'NETWORK_ERROR',
      error.response?.status ?? 0,
      payload?.details,
    );
  },
);

interface Envelope<T> {
  success: boolean;
  data: T;
}

const unwrap = async <T>(promise: Promise<{ data: Envelope<T> }>): Promise<T> =>
  (await promise).data.data;

/** Converts a filter object into a query string the API's CSV-aware schemas accept. */
export function toQuery(filters: CardFilters): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) params[key] = value.join(',');
    } else {
      params[key] = String(value);
    }
  }
  return params;
}

export const api = {
  auth: {
    register: (input: { name: string; email: string; password: string }) =>
      unwrap<{ user: User }>(client.post('/auth/register', input)),
    login: (input: { email: string; password: string }) =>
      unwrap<{ user: User }>(client.post('/auth/login', input)),
    logout: () => unwrap<{ message: string }>(client.post('/auth/logout')),
    me: () => unwrap<{ user: User }>(client.get('/auth/me')),
    updateProfile: (
      input: Partial<Pick<User, 'name' | 'monthlyIncome' | 'creditScore' | 'city'>>,
    ) => unwrap<{ user: User }>(client.patch('/auth/me', input)),
  },
  cards: {
    list: (filters: CardFilters) =>
      unwrap<Paginated<Card>>(client.get('/cards', { params: toQuery(filters) })),
    get: (slug: string) => unwrap<{ card: Card }>(client.get(`/cards/${slug}`)),
    compare: (slugs: string[]) =>
      unwrap<{ cards: Card[] }>(
        client.get('/cards/compare', { params: { slugs: slugs.join(',') } }),
      ),
    facets: () => unwrap<Facets>(client.get('/cards/facets')),
  },
  recommendations: {
    create: (preferences: Preferences, options: { limit?: number; explain?: boolean } = {}) =>
      unwrap<RecommendationResponse>(
        client.post('/recommendations', {
          preferences,
          limit: options.limit ?? 5,
          explain: options.explain ?? false,
        }),
      ),
    engine: () =>
      unwrap<{ engineVersion: string; aiAvailable: boolean; baseWeights: Record<string, number> }>(
        client.get('/recommendations/engine'),
      ),
  },
  favorites: {
    list: () => unwrap<{ favorites: Favorite[] }>(client.get('/favorites')),
    add: (cardId: string, note?: string) =>
      unwrap<{ favorite: Favorite }>(client.post('/favorites', { cardId, note })),
    remove: (cardId: string) => unwrap<{ message: string }>(client.delete(`/favorites/${cardId}`)),
  },
  history: {
    list: (page = 1, pageSize = 10) =>
      unwrap<Paginated<RecommendationRun>>(client.get('/history', { params: { page, pageSize } })),
    get: (id: string) => unwrap<{ run: RecommendationRun }>(client.get(`/history/${id}`)),
    remove: (id: string) => unwrap<{ message: string }>(client.delete(`/history/${id}`)),
  },
};
