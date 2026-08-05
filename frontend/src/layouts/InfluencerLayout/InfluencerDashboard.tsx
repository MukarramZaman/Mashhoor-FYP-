import { useCallback, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getInfluencerDashboardStats, type InfluencerDashboardStats } from "../../api/dashboardApi";
import { Link } from "react-router-dom";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";

function InfluencerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<InfluencerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const isFirstLoad = useRef(true);

  const fetchStats = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    try {
      setLoadError("");
      const data = await getInfluencerDashboardStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load dashboard stats", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
    }
  }, []);

  useLiveRefresh(fetchStats, {
    intervalMs: 8_000,
    events: ["outreach_handled", "dashboard_refresh", "messages_updated"],
  });

  const analytics = stats?.profileAnalytics;
  const breakdown = analytics?.trustScoreBreakdown ?? {
    engagementAuthenticity: 0,
    followerQuality: 0,
    contentConsistency: 0,
    collaborationHistory: 0,
  };
  const maxEarnings = Math.max(...(stats?.earningsByMonth?.map((e) => e.amount) || [0]), 1);
  const trustScore = stats?.trustScore ?? 0;
  const followersLabel =
    (analytics?.totalFollowers || 0) >= 1000
      ? `${((analytics?.totalFollowers || 0) / 1000).toFixed(1)}K`
      : String(analytics?.totalFollowers || 0);

  return (
    <>
      <div className="dashboard-bg ">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Welcome back, {user?.name || "Influencer"}!
              </h1>
              <p className="text-gray-400 mt-2 text-lg">
                Here's your performance overview
              </p>
              {loadError && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-xl">
                  {loadError}
                </div>
              )}
            </div>
          </div>

          <div className="card-white mb-8">
            <div className="text-lg font-semibold mb-1">Your Profile Analytics</div>
            <p className="text-sm text-gray-500 mb-4">
              Live social metrics and trust breakdown for your account
            </p>
            {loading ? (
              <p className="text-gray-400 text-sm">Loading profile analytics...</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">Total Followers</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{followersLabel}</div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">Avg. Engagement</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {(analytics?.avgEngagementRate || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">YouTube Subscribers</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {(analytics?.platforms?.youtube?.subscribers || 0).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                  <div className="text-sm text-gray-500">Primary Niche</div>
                  <div className="text-lg font-bold text-gray-900 mt-1 capitalize">
                    {analytics?.niche?.[0] || "—"}
                  </div>
                </div>
              </div>
            )}
            {!loading && analytics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Engagement authenticity", value: breakdown.engagementAuthenticity },
                  { label: "Follower quality", value: breakdown.followerQuality },
                  { label: "Content consistency", value: breakdown.contentConsistency },
                ].map((item) => (
                  <div key={item.label} className="text-center rounded-lg border border-purple-100 py-3 px-2">
                    <div className="text-xl font-bold text-purple-700">{item.value}%</div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            )}
            {!loading && analytics && analytics.totalFollowers === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-4">
                Add your YouTube or Instagram handle in Settings to pull your follower and engagement analytics.
              </p>
            )}
          </div>

          <div className="flex gap-6 mb-8">
            <div className="card-white flex-1">
              <div className="flex justify-between text-gray-500">
                <span>Total Earnings</span>
                <span className="font-bold text-gray-400">Rs</span>
              </div>
              <div className="stat-value">
                {loading ? "-" : `Rs ${(stats?.totalEarnings || 0).toLocaleString()}`}
              </div>
              <div className="stat-sub text-gray-400">Lifetime earnings</div>
            </div>

            <div className="card-white flex-1">
              <div className="flex justify-between text-gray-500">
                <span>Active Campaigns</span>
                <span>
                  <img src="/assets/briefcase-business.svg" alt="" />
                </span>
              </div>
              <div className="stat-value">{loading ? "-" : stats?.activeCampaigns || 0}</div>
              <div className="stat-sub text-gray-400">Currently running</div>
            </div>

            <div className="card-white flex-1">
              <div className="flex justify-between text-gray-500">
                <span>Pending Requests</span>
                <span>
                  <img src="/assets/loader-circle.svg" alt="" />
                </span>
              </div>
              <div className="stat-value">{loading ? "-" : stats?.pendingRequests || 0}</div>
              <Link to="/influencer-requests" className="stat-sub text-purple-600 cursor-pointer block mt-1">
                View requests →
              </Link>
            </div>

            <div className="card-white flex-1">
              <div className="flex justify-between text-gray-500">
                <span>Trust Score</span>
                <span>
                  <img src="/assets/chart-line.svg" alt="" />
                </span>
              </div>
              <div className="stat-value">{loading ? "-" : `${trustScore}/100`}</div>
              <div className="stat-sub text-green">
                {trustScore > 80 ? "Excellent rating" : trustScore > 0 ? "Good rating" : "New account"}
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-8">
            <div className="card-white w-2/3">
              <div className="text-lg font-semibold mb-2">
                Earnings Overview
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pb-8">
                  <span>8000</span>
                  <span>6000</span>
                  <span>4000</span>
                  <span>2000</span>
                  <span>0</span>
                </div>

                <div className="ml-10">
                  <div className="chart-container">
                    {loading ? (
                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                    ) : (
                      stats?.earningsByMonth?.map((item, i) => (
                        <div
                          key={i}
                          className="bar"
                          style={{
                            height: item.amount > 0 ? `${Math.max((item.amount / maxEarnings) * 100, 8)}%` : "4px",
                          }}
                          title={`Rs ${item.amount.toLocaleString()}`}
                        />
                      ))
                    )}
                  </div>
                  <div className="flex justify-between mt-2 text-gray-400 text-sm px-2">
                    {stats?.earningsByMonth?.map((item, i) => (
                      <span key={i}>{item.month}</span>
                    )) ?? (
                      <>
                        <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="w-1/3 flex flex-col gap-4">
              <div className="text-lg font-semibold mb-2 ml-1">
                Quick Actions
              </div>

              <Link to="/influencer-settings" className="action-btn block">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-md flex-shrink-0">
                    <img src="/assets/square-pen.svg" alt="" />
                  </div>
                  <div className="font-medium">Update Profile</div>
                </div>
              </Link>

              <Link to="/influencer-requests" className="action-btn block">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-md flex-shrink-0">
                    <img src="/assets/users.svg" alt="" />
                  </div>
                  <div className="font-medium">View Campaign Requests</div>
                </div>
              </Link>

              <Link to="/influencer-settings" className="action-btn block">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-md flex-shrink-0">
                    <img src="/assets/lock.svg" alt="" />
                  </div>
                  <div className="font-medium">Privacy & Consent Settings</div>
                </div>
              </Link>
            </div>
          </div>

          <div className="card-white">
            <div className="text-lg font-semibold mb-4">Active Campaigns</div>
            
            {loading ? (
               <div className="text-gray-400 py-4">Loading campaigns...</div>
            ) : (!stats?.recentCampaigns || stats.recentCampaigns.length === 0) ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                <p>No active campaigns yet.</p>
                <p className="text-sm mt-1">When businesses hire you, campaigns will appear here.</p>
              </div>
            ) : (
              stats.recentCampaigns.map((camp: any) => (
                <div key={camp._id} className="campaign-row">
                  <div>
                    <div className="font-medium text-lg">{camp.title}</div>
                    <div className="text-gray-400 text-sm">{camp.business?.name || "Business"}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="badge badge-blue capitalize">{camp.status}</span>
                    <span className="font-semibold text-lg">
                      Rs {camp.budget?.total?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default InfluencerDashboard;
