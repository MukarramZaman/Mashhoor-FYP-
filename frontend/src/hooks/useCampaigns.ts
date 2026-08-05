import { useState, useEffect, useCallback } from "react";
import { campaignApi, type Campaign, type CampaignStatus } from "../api";

interface UseCampaignsResult {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  deleteCampaign: (id: string) => Promise<void>;
}

export function useCampaigns(status?: CampaignStatus): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await campaignApi.getMyCampaigns(status);
      setCampaigns(Array.isArray(result?.data) ? result.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteCampaign = async (id: string) => {
    await campaignApi.delete(id);
    setCampaigns((prev) => prev.filter((c) => c._id !== id));
  };

  return { campaigns, loading, error, refetch: fetch, deleteCampaign };
}
