import { useState, useEffect } from "react";
import { InfluencerCard } from "../../components";
import { useInfluencers } from "../../hooks/useInfluencers";
import { campaignApi, isRegisteredOnPlatform, hasDeliverableEmail, resolveOutreachContactEmail, influencerApi, type Campaign } from "../../api";
import type { InfluencerProfile } from "../../api/influencerApi";

const NICHES = ["Politics", "Entertainment", "Gaming", "Cricket", "Fashion", "Tech", "Music", "Lifestyle"];

function FindInfluencers() {
  const [search, setSearch] = useState("");
  const [niche, setNiche] = useState("");
  const [country, setCountry] = useState("");
  const [platform, setPlatform] = useState<"instagram" | "youtube" | "">("");
  const [minTrustScore, setMinTrustScore] = useState("");
  const [minFollowers, setMinFollowers] = useState(0);
  const [sort, setSort] = useState<"trustScore" | "followers" | "engagement" | "newest">("newest");

  // Contact Modal State
  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    influencerId: string;
    influencerName: string;
    influencerEmail?: string;
    hasSignedUp?: boolean;
  }>({ isOpen: false, influencerId: "", influencerName: "" });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [outreachMessage, setOutreachMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (contactModal.isOpen) {
      campaignApi.getMyCampaigns()
        .then((res) => {
          setCampaigns(res.data);
          if (res.data.length > 0) setSelectedCampaignId(res.data[0]._id);
        })
        .catch(console.error);
    }
  }, [contactModal.isOpen]);

  const isOnPlatform = isRegisteredOnPlatform({ hasSignedUp: contactModal.hasSignedUp });
  const needsContactEmail =
    !isOnPlatform && !hasDeliverableEmail(contactModal.influencerEmail);

  const handleAddToCampaign = async () => {
    if (!selectedCampaignId || !outreachMessage.trim() || !contactModal.influencerId) return;

    const emailToSend = resolveOutreachContactEmail(
      contactModal.influencerEmail,
      contactEmail
    );
    if (!isOnPlatform && !emailToSend) {
      showToast("Add their real email — Mashhoor will send the invitation automatically.", "error");
      return;
    }
    setIsSending(true);
    try {
      const result = await campaignApi.addInfluencer(
        selectedCampaignId,
        contactModal.influencerId,
        outreachMessage,
        !isOnPlatform ? emailToSend : undefined
      );
      setContactModal({ isOpen: false, influencerId: "", influencerName: "" });
      setOutreachMessage("");
      setContactEmail("");
      setSelectedCampaignId("");
      showToast(
        result.channel === "email"
          ? "Added to campaign. Mashhoor emailed them an invitation to join."
          : "Added to campaign. They will see your invitation in Mashhoor.",
        "success"
      );
    } catch (err: unknown) {
      console.error(err);
      showToast(
        err instanceof Error ? err.message : "Failed to add influencer. They may already be on this campaign.",
        "error"
      );
    } finally {
      setIsSending(false);
    }
  };

  const { influencers, loading, error, pagination, setFilters, setPage } = useInfluencers({ sort: "newest" });

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isRecommendedMode, setIsRecommendedMode] = useState(false);
  const [recommendedInfluencers, setRecommendedInfluencers] = useState<InfluencerProfile[]>([]);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const fetchRecommendations = async () => {
    try {
      setIsRecommendedMode(true);
      const filters = {
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(niche && { targetNiche: niche }), // Use targetNiche for scoring
        ...(country && { country }),
        ...(platform && { platform }),
        ...(minTrustScore && { minTrustScore: Number(minTrustScore) }),
        ...(minFollowers > 0 && { minFollowers }),
      };
      const data = await influencerApi.getRecommendations(filters);
      setRecommendedInfluencers(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch recommendations", "error");
    }
  };

  const runCategorization = async () => {
    try {
      setIsCategorizing(true);
      await influencerApi.categorizeInfluencers();
      showToast("AI Categorization complete! Refreshing list...", "success");
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      showToast("Failed to run categorization", "error");
    } finally {
      setIsCategorizing(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setFilters({
      ...(debouncedSearch && { search: debouncedSearch }),
      ...(niche && { niche }),
      ...(country && { country }),
      ...(platform && { platform }),
      ...(minTrustScore && { minTrustScore: Number(minTrustScore) }),
      ...(minFollowers > 0 && { minFollowers }),
      sort,
    });
    setPage(1); // Reset page on filter change

    // If in recommended mode, refetch recommendations when niche changes
    if (isRecommendedMode) {
      fetchRecommendations();
    }
  }, [debouncedSearch, niche, country, platform, minTrustScore, minFollowers, sort, setFilters, setPage]);

  const resetFilters = () => {
    setSearch("");
    setNiche("");
    setCountry("");
    setPlatform("");
    setMinTrustScore("");
    setMinFollowers(0);
    setSort("newest");
    setIsRecommendedMode(false);
    setFilters({ sort: "newest" });
  };

  const displayedInfluencers = isRecommendedMode ? recommendedInfluencers : influencers;

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="p-4 md:p-8 flex flex-col md:flex-row gap-6 find-influencers-layout">
        {/* Filter Sidebar */}
        <div className="w-full md:w-1/4 bg-white border border-gray-200 rounded-xl p-6 h-fit md:sticky top-24">
          <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
            <img src="/assets/funnel.svg" alt="Filters" width={17} height={17} />
            <h2 className="font-bold text-lg text-gray-900">Filters</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as "instagram" | "youtube" | "")}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
              >
                <option value="">All platforms</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Niche</label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
              >
                <option value="">All niches</option>
                {NICHES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
              >
                <option value="">All countries</option>
                <option value="Pakistan">Pakistan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Min Followers: {minFollowers > 0 ? `${(minFollowers / 1000).toFixed(0)}K+` : "Any"}
              </label>
              <input
                type="range"
                min={0} max={500000} step={10000}
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
                className="w-full accent-purple-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Min Trust Score</label>
              <select
                value={minTrustScore}
                onChange={(e) => setMinTrustScore(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
              >
                <option value="">Any</option>
                <option value="90">90+</option>
                <option value="80">80+</option>
                <option value="70">70+</option>
              </select>
            </div>

            {/* Apply Filters button removed since filters apply dynamically */}
            <button
              onClick={resetFilters}
              className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="w-full md:w-3/4">
          {/* Search bar */}
          <div className="flex gap-4 mb-6">
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex-1 flex items-center gap-3 shadow-sm">
              <img src="/assets/search.svg" alt="Search" width={17} height={17} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                // Auto-debounced
                placeholder="Search by name, niche, or location..."
                className="w-full outline-none text-gray-700 placeholder-gray-400"
                disabled={isRecommendedMode}
              />
            </div>
            <button
              onClick={() => isRecommendedMode ? setIsRecommendedMode(false) : fetchRecommendations()}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${isRecommendedMode ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
            >
              <span>✨</span> {isRecommendedMode ? "Show All" : "AI Recommend"}
            </button>
            <button
              onClick={runCategorization}
              disabled={isCategorizing}
              className="px-4 py-2 rounded-lg font-medium whitespace-nowrap bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {isCategorizing ? "Running..." : "Run ML Clustering"}
            </button>
          </div>

          {/* Sort + count */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500">
              {loading ? "Loading..." : `${isRecommendedMode ? displayedInfluencers.length : (pagination?.total ?? displayedInfluencers.length)} influencers found`}
            </span>
            {!isRecommendedMode && (
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="bg-[#f3f4f6] border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none cursor-pointer"
              >
                <option value="trustScore">Highest Trust Score</option>
                <option value="followers">Most Followers</option>
                <option value="engagement">Best Engagement</option>
                <option value="newest">Newest Members</option>
              </select>
            )}
            {isRecommendedMode && (
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">Sorted by AI Match Score</span>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 mb-6">
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                    <div className="h-3 bg-gray-200 rounded w-4/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results grid */}
          {!loading && displayedInfluencers.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {displayedInfluencers.map((inf) => (
                <InfluencerCard
                  key={inf._id}
                  id={inf.user?._id ?? ""}
                  name={inf.user?.name ?? "Unknown"}
                  image={inf.user?.avatar || `https://ui-avatars.com/api/?name=${inf.user?.name || "Unknown"}&background=8b5cf6&color=fff`}
                  niche={inf.niche.join(", ")}
                  location={inf.location}
                  followers={inf.totalFollowers >= 1000 ? `${(inf.totalFollowers / 1000).toFixed(0)}K` : String(inf.totalFollowers)}
                  engagement={`${inf.avgEngagementRate.toFixed(1)}%`}
                  trustScore={inf.trustScore}
                  onContact={() => {
                    setContactEmail("");
                    setContactModal({
                      isOpen: true,
                      influencerId: inf.user?._id ?? "",
                      influencerName: inf.user?.name ?? "Unknown",
                      influencerEmail: inf.user?.email,
                      hasSignedUp: inf.user?.hasSignedUp,
                    });
                  }}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && displayedInfluencers.length === 0 && !error && (
            <div className="text-center py-16 text-gray-400">
              <img src="/assets/search.svg" alt="" className="mx-auto mb-4 opacity-30" width={48} height={48} />
              <p className="text-lg">No influencers found matching your filters.</p>
              <button onClick={resetFilters} className="mt-4 text-purple-600 hover:underline text-sm">
                Clear filters
              </button>
            </div>
          )}

          {/* Pagination */}
          {!isRecommendedMode && pagination && pagination.pages > 1 && (
            <div className="flex justify-center gap-2 flex-wrap">
              <button
                onClick={() => setPage(Math.max(1, pagination.page - 1))}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 font-medium text-sm disabled:opacity-40"
              >
                Previous
              </button>
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-10 h-10 rounded-lg font-medium flex items-center justify-center text-sm ${pagination.page === i + 1
                    ? "bg-purple-600 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(pagination.pages, pagination.page + 1))}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 font-medium text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Contact Modal */}
      {contactModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-1">Add {contactModal.influencerName} to campaign</h3>
            <p className="text-sm text-gray-500 mb-4">
              {isOnPlatform
                ? "They are registered on Mashhoor — they will receive your invite inside the app."
                : "This creator is not registered yet. Mashhoor will email them an invitation automatically."}
            </p>

            <div className="space-y-4">
              {needsContactEmail && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Their email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="creator@email.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for creators not on Mashhoor yet (seeded profiles use placeholder emails).
                  </p>
                </div>
              )}

              {!isOnPlatform && !needsContactEmail && contactModal.influencerEmail && (
                <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  Invitation will be emailed to{" "}
                  <strong>{contactModal.influencerEmail}</strong>
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Campaign</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
                >
                  <option value="" disabled>Select a campaign...</option>
                  {campaigns.map(c => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Outreach Message</label>
                <textarea
                  value={outreachMessage}
                  onChange={(e) => setOutreachMessage(e.target.value)}
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-600 outline-none focus:border-purple-500"
                  placeholder="Hi there, we'd love to collaborate with you on our new campaign..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setContactModal({ isOpen: false, influencerId: "", influencerName: "" })}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                  disabled={isSending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToCampaign}
                  disabled={
                    isSending ||
                    !selectedCampaignId ||
                    !outreachMessage.trim() ||
                    (needsContactEmail && !contactEmail.trim())
                  }
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 min-w-[148px]"
                >
                  {isSending
                    ? isOnPlatform
                      ? "Sending invite..."
                      : "Sending email..."
                    : isOnPlatform
                      ? "Send Invite"
                      : "Send Email Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 transform transition-all duration-300 ${toast.type === "success" ? "bg-gray-900 text-green-400" : "bg-red-600 text-white"
          }`}>
          {toast.type === "success" ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="font-medium text-sm text-white">{toast.text}</span>
        </div>
      )}
    </div>
  );
}

export default FindInfluencers;
