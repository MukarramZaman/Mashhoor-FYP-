import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminStats } from "../../api/adminApi";

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .getStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message || "Failed to load admin stats"))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
      {
        label: "Total Influencers",
        value: stats.totalInfluencers.toLocaleString(),
        sub: `${stats.pendingVerification} pending verification`,
        icon: "influencers",
      },
      {
        label: "Total Campaigns",
        value: stats.totalCampaigns.toLocaleString(),
        sub: `${stats.activeCampaigns} active`,
        icon: "campaigns",
        trend: "up" as const,
      },
      {
        label: "Business Accounts",
        value: stats.totalBusinesses.toLocaleString(),
        sub: "Registered brands",
        icon: "flag",
      },
      {
        label: "Outreach Requests",
        value: stats.totalOutreach.toLocaleString(),
        sub: `${stats.pendingOutreach} pending`,
        icon: "revenue",
      },
    ]
    : [];

  const recentActivity = stats?.recentActivity || [];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading admin dashboard...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 text-lg">Platform overview and management</p>
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 inline-block">
            {error}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
              <div className="text-gray-300">
                {stat.icon === 'influencers' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                {stat.icon === 'campaigns' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" /></svg>}
                {stat.icon === 'flag' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>}
                {stat.icon === 'revenue' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>}
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
            <div className={`text-xs font-bold ${stat.trend === 'up' ? 'text-green-500' : 'text-purple-500'
              }`}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-6 mb-8">
        {/* Real User Growth Chart */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex-1">
          <h2 className="text-lg font-bold text-gray-900 mb-8">User Growth</h2>
          {stats?.userGrowth && stats.userGrowth.length > 0 ? (
            <div className="h-64 flex items-end justify-between relative pt-10">
              {/* Grid lines */}
              <div className="absolute inset-0 border-b border-l border-gray-100 flex flex-col justify-between text-[10px] text-gray-300 pointer-events-none">
                <span>{Math.max(...stats.userGrowth.map((g: any) => g.count))}</span>
                <span>{Math.floor(Math.max(...stats.userGrowth.map((g: any) => g.count)) * 0.75)}</span>
                <span>{Math.floor(Math.max(...stats.userGrowth.map((g: any) => g.count)) * 0.5)}</span>
                <span>{Math.floor(Math.max(...stats.userGrowth.map((g: any) => g.count)) * 0.25)}</span>
                <span>0</span>
              </div>
              <div className="ml-10 w-full h-full flex items-end justify-around pb-4">
                {stats.userGrowth.map((growth: any, i: number) => {
                  const max = Math.max(...stats.userGrowth.map((g: any) => g.count)) || 1;
                  const heightPercent = Math.max((growth.count / max) * 100, 5);
                  return (
                    <div key={i} className="w-2 bg-purple-500 rounded-full relative" style={{ height: `${heightPercent}%` }}>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-[10px] whitespace-nowrap">{growth.month}</div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-gray-800 text-[10px] font-bold opacity-0 hover:opacity-100 cursor-pointer">{growth.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Not enough data for growth chart
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm w-1/3">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link to="/admin/verifications" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm group-hover:text-purple-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <span className="font-semibold text-gray-700">Verification Dashboard</span>
              </div>
            </Link>

            <Link to="/admin/verifications" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm group-hover:text-purple-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <span className="font-semibold text-gray-700">
                  Review Pending Verifications ({stats?.pendingVerification ?? 0})
                </span>
              </div>
            </Link>

            <Link to="/admin/reports" className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm group-hover:text-red-500">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                </div>
                <span className="font-semibold text-gray-700">Review Reported Users</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <h2 className="text-xl font-bold text-gray-900 mb-8">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-6">
            {recentActivity.map((activity: any) => (
              <div key={activity.id} className="flex justify-between items-center pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                <div>
                  <div className="font-bold text-gray-800 text-lg">{activity.text}</div>
                  <div className="text-gray-400 text-sm">{activity.time}</div>
                </div>
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize ${activity.type === 'user' ? 'bg-blue-50 text-blue-500' :
                    activity.type === 'campaign' ? 'bg-purple-50 text-purple-500' :
                      activity.type === 'verification' ? 'bg-green-50 text-green-500' :
                        activity.type === 'report' ? 'bg-red-50 text-red-500' :
                          'bg-gray-50 text-gray-500'
                  }`}>
                  {activity.type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-lg">
            No recent platform activity found.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
