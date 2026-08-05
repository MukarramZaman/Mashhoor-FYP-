import { useState, useEffect, useCallback } from "react";
import { outreachApi, type Outreach } from "../api";

interface UseOutreachResult {
  requests: Outreach[];
  loading: boolean;
  error: string | null;
  reply: (id: string, message: string, accept?: boolean) => Promise<void>;
  refetch: () => void;
}

export function useMyRequests(): UseOutreachResult {
  const [requests, setRequests] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await outreachApi.getMyRequests();
      setRequests(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const reply = async (id: string, message: string, accept?: boolean) => {
    const updated = await outreachApi.reply(id, message, accept);
    setRequests((prev) => prev.map((r) => (r._id === id ? updated : r)));
  };

  return { requests, loading, error, reply, refetch: fetch };
}
