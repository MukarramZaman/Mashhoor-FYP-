import { Link } from "react-router-dom";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getBusinessDashboardStats, type BusinessDashboardStats } from "../../api/dashboardApi";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";

function BusinessDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BusinessDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const isFirstLoad = useRef(true);

  const fetchStats = useCallback(async () => {
    if (isFirstLoad.current) setLoading(true);
    try {
      setLoadError("");
      const data = await getBusinessDashboardStats();
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

  const maxCampaigns = Math.max(...(stats?.campaignActivity?.map((a: any) => a.count) || [0]), 1);
  const maxEngagement = Math.max(...(stats?.engagementTrend?.map((a: any) => a.rate) || [0]), 5);

  return (
    <div className="business-bg">
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] || "Business User"}
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your campaigns today.
          </p>
          {loadError && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {loadError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex justify-between items-start">
              <span className="stat-label">Total Campaigns</span>
              <div className="text-gray-400">
                <img
                  src="/assets/globe.svg"
                  alt="Campaigns"
                  width={20}
                  height={20}
                />
              </div>
            </div>
            <div className="stat-number">{loading ? "-" : stats?.totalCampaigns || 0}</div>
            <div className="stat-trend text-gray-400">Total created</div>
          </div>

          <div className="stat-card">
            <div className="flex justify-between items-start">
              <span className="stat-label">Influencers Contacted</span>
              <div className="text-gray-400">
                <img
                  src="/assets/user.svg"
                  alt="Contacted"
                  width={20}
                  height={20}
                />
              </div>
            </div>
            <div className="stat-number">{loading ? "-" : stats?.influencersContacted || 0}</div>
            <div className="stat-trend text-gray-400">Outreach requests</div>
          </div>

          <div className="stat-card">
            <div className="flex justify-between items-start">
              <span className="stat-label">Active Campaigns</span>
              <div className="text-gray-400">
                <img src="/assets/briefcase-business-.svg" alt="Active" width={20} height={20} />
              </div>
            </div>
            <div className="stat-number">{loading ? "-" : stats?.activeCampaigns || 0}</div>
            <div className="stat-trend text-gray-400">Currently running</div>
          </div>

          <div className="stat-card">
            <div className="flex justify-between items-start">
              <span className="stat-label">Shortlisted</span>
              <div className="text-gray-400">
                <img
                  src="/assets/eye.svg"
                  alt="Shortlisted"
                  width={20}
                  height={20}
                />
              </div>
            </div>
            <div className="stat-number">{loading ? "-" : stats?.shortlisted || 0}</div>
            <div className="stat-trend text-gray-400">Pending review</div>
          </div>

          <div className="stat-card">
            <div className="flex justify-between items-start">
              <span className="stat-label">Avg. Engagement</span>
              <div className="text-gray-400">
                <img
                  src="/assets/chart-line.svg"
                  alt="Engagement"
                  width={20}
                  height={20}
                />
              </div>
            </div>
            <div className="stat-number">{loading ? "-" : stats?.avgEngagement || "0.0%"}</div>
            <div className="stat-trend text-gray-400">Across campaigns</div>
          </div>
        </div>

        <div className="action-section">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500">
              Start working on your campaigns
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/create-campaigns" className="btn-create-campaign">
              <img
                src="/assets/plus (1).svg"
                alt="Create"
                width={20}
                height={20}
              />
              Create New Campaign
            </Link>

            <Link to="/find-influencers" className="search-influencer w-full flex items-center gap-2 justify-start decoration-transparent">
              <img
                src="/assets/search.svg"
                alt="Search"
                width={20}
                height={20}
              />
              <span>Find Influencers</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="dashboard-card">
            <div className="chart-title">Campaign Activity</div>
            <div className="chart-subtitle">Number of campaigns over time</div>

            <div className="flex items-end justify-between h-48 pt-4 pb-2 border-b border-gray-100">
              <div className="w-full flex justify-around items-end h-full">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                ) : stats?.campaignActivity ? stats.campaignActivity.map((item, i) => (
                  <div key={i} className="w-12 bg-[#8b5cf6] rounded-t-md transition-all duration-500 hover:bg-purple-700 relative group" 
                       style={{ height: item.count > 0 ? `${Math.max((item.count / maxCampaigns) * 100, 5)}%` : "4px" }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.count}
                    </div>
                  </div>
                )) : null}
              </div>
            </div>
            <div className="flex justify-around mt-2 text-xs text-gray-400">
              {stats?.campaignActivity ? stats.campaignActivity.map((item: any, i: number) => (
                <span key={i}>{item.month}</span>
              )) : (
                <><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></>
              )}
            </div>
          </div>

          <div className="dashboard-card">
            <div className="chart-title">Engagement Trend</div>
            <div className="chart-subtitle">Average engagement rate (%)</div>

            <div className="relative h-48 pt-4 pb-2 border-b border-gray-100">
              <div className="w-full h-full relative">
                {loading ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">Loading...</div>
                ) : stats?.engagementTrend ? (
                  <svg className="w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none">
                    <line x1="0" y1="37" x2="300" y2="37" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
                    <line x1="0" y1="75" x2="300" y2="75" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
                    <line x1="0" y1="112" x2="300" y2="112" stroke="#f3f4f6" strokeWidth="1" strokeDasharray="4" />
                    <polyline 
                      points={stats.engagementTrend.map((item: any, i: number) => `${25 + (i * 50)},${140 - ((item.rate / maxEngagement) * 120)}`).join(" ")} 
                      fill="none" stroke="#8b5cf6" strokeWidth="2" 
                    />
                    {stats.engagementTrend.map((item: any, i: number) => (
                      <circle 
                        key={i} 
                        cx={25 + (i * 50)} 
                        cy={140 - ((item.rate / maxEngagement) * 120)} 
                        r="4" fill="white" stroke="#8b5cf6" strokeWidth="2" 
                        className="cursor-pointer hover:r-6 transition-all"
                      >
                        <title>{item.rate}%</title>
                      </circle>
                    ))}
                  </svg>
                ) : null}
              </div>
            </div>
            <div className="flex justify-around mt-2 text-xs text-gray-400">
              {stats?.engagementTrend ? stats.engagementTrend.map((item: any, i: number) => (
                <span key={i}>{item.month}</span>
              )) : (
                <><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span></>
              )}
            </div>
          </div>
        </div>

        <div className="dashboard-card mb-8">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Your Campaigns</h3>
              <p className="text-sm text-gray-500">Latest campaigns you created</p>
            </div>
            <Link to="/business-campaigns" className="text-sm font-medium text-purple-600 hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="text-gray-400 py-4">Loading campaigns...</div>
          ) : stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
            <div className="flex flex-col gap-3">
              {stats.recentCampaigns.map((campaign) => (
                <Link
                  key={campaign._id}
                  to={`/business-campaign/${campaign._id}`}
                  className="activity-item hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-gray-900 font-medium">{campaign.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Created {new Date(campaign.createdAt).toLocaleDateString()}
                      {campaign.budget?.total != null && ` · Rs ${campaign.budget.total.toLocaleString()}`}
                    </div>
                  </div>
                  <span className="tag tag-purple capitalize">{campaign.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
              <p>No campaigns yet.</p>
              <Link to="/create-campaigns" className="text-sm text-purple-600 font-medium mt-2 inline-block hover:underline">
                Create your first campaign →
              </Link>
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 text-lg">
              Recent Activity
            </h3>
            <p className="text-sm text-gray-500">Your latest interactions</p>
          </div>

          <div className="flex flex-col">
            {loading ? (
              <div className="text-gray-400 py-4">Loading activity...</div>
            ) : (!stats?.recentActivity || stats.recentActivity.length === 0) ? (
              <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                <p>No recent activity.</p>
                <p className="text-sm mt-1">Create a campaign to get started!</p>
              </div>
            ) : (
              stats.recentActivity.map((activity: any) => (
                <div key={activity.id} className="activity-item">
                  <div>
                    <div className="text-gray-900 font-medium">
                      {activity.text}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`tag ${activity.type === 'campaign' ? 'tag-purple' : 'tag-blue'}`}>
                    {activity.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessDashboard;
