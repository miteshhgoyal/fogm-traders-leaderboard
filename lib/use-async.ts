import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * React 19 safe async data fetcher.
 * Initializes with loading: true so no synchronous setState happens in useEffect.
 * Uses an ignore cancellation flag to prevent state updates on unmounted components.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<number>(0);

  const reload = useCallback(() => {
    setLoading(true);
    setTrigger((v) => v + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    void fetcher()
      .then((result) => {
        if (!ignore) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, ...deps]);

  return { data, loading, error, reload, setData };
}
