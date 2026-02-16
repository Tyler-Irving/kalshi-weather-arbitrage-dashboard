import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function usePolling<T>(
  url: string,
  intervalMs: number = 30000
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await apiClient.get<T>(url);
        if (isMounted) {
          setData(response.data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling
    const intervalId = setInterval(fetchData, intervalMs);

    // Cleanup
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [url, intervalMs]);

  return { data, loading, error };
}
