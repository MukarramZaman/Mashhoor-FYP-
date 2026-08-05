import { useState, useEffect, useCallback } from "react";
import { influencerApi, type InfluencerProfile, type InfluencerFilters } from "../api";

interface UseInfluencersResult {
  influencers: InfluencerProfile[];
  loading: boolean;
  error: string | null;
  pagination: { total: number; page: number; pages: number } | null;
  setFilters: (filters: InfluencerFilters) => void;
  setPage: (page: number) => void;
  refetch: () => void;
}

export function useInfluencers(initialFilters: InfluencerFilters = {}): UseInfluencersResult {
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);
  const [filters, setFilters] = useState<InfluencerFilters>(initialFilters);
  const [page, setPage] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await influencerApi.getAll({ ...filters, page });
      setInfluencers(result.data);
      setPagination(result.pagination);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load influencers";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetch(); }, [fetch]);

  return { influencers, loading, error, pagination, setFilters, setPage, refetch: fetch };
}
