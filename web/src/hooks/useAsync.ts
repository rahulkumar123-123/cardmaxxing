import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';

interface AsyncResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Settled<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/**
 * Runs an async task whenever `deps` change and tracks its state.
 *
 * Loading is *derived* from whether the settled result matches the current key rather
 * than being set inside the effect, which avoids a cascading render on every change.
 * Responses whose key is stale are discarded, so out-of-order replies can never
 * overwrite fresher data.
 */
export function useAsync<T>(task: () => Promise<T>, deps: unknown[]): AsyncResult<T> {
  const [nonce, setNonce] = useState(0);
  const key = useMemo(() => `${JSON.stringify(deps)}::${nonce}`, [deps, nonce]);

  const [settled, setSettled] = useState<Settled<T>>({ key: '', data: null, error: null });

  // Keep the latest task without depending on its identity, which changes every render.
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  });

  useEffect(() => {
    let active = true;

    taskRef
      .current()
      .then((data) => {
        if (active) setSettled({ key, data, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setSettled({
          key,
          data: null,
          error: error instanceof ApiError ? error.message : 'Unable to load data',
        });
      });

    return () => {
      active = false;
    };
  }, [key]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);
  const loading = settled.key !== key;

  return {
    data: loading ? null : settled.data,
    loading,
    error: loading ? null : settled.error,
    reload,
  };
}
