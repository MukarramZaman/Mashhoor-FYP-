import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CampaignCard } from "../../components";
import { useCampaigns } from "../../hooks/useCampaigns";

function Campaigns() {
  const navigate = useNavigate();
  const { campaigns, loading, error, deleteCampaign, refetch } = useCampaigns();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="campaigns-bg min-h-screen">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Campaigns</h1>
            <p className="text-gray-500 mt-1">Manage all your influencer marketing campaigns</p>
          </div>
          <Link to="/create-campaigns" className="btn-create-purple whitespace-nowrap">
            <img src="/assets/plus (1).svg" alt="Create" width={20} height={20} />
            Create Campaign
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 mb-6 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={refetch} className="text-sm underline">Retry</button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-1/4 mb-6" />
                <div className="h-2 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!loading && campaigns.length === 0 && !error && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300"><path d="M12 2v20m10-10H2"/></svg>
            </div>
            <p className="text-lg mb-4">No campaigns yet.</p>
            <Link to="/create-campaigns" className="text-purple-600 hover:underline font-medium">
              Create your first campaign →
            </Link>
          </div>
        )}

        {!loading && campaigns.length > 0 && (
          <div className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign._id}
                title={campaign.title}
                status={campaign.status}
                influencers={campaign.selectedInfluencers.length}
                budget={`${campaign.budget.currency} ${campaign.budget.total.toLocaleString()}`}
                progress={campaign.progress}
                onDelete={() => {
                  if (window.confirm("Delete this campaign?")) {
                    deleteCampaign(campaign._id);
                    showToast("Campaign deleted", "success");
                  }
                }}
                onViewDetails={() => navigate(`/business-campaign/${campaign._id}`)}
                onEdit={() => navigate(`/business-campaign/edit/${campaign._id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-[60] animate-in slide-in-from-right duration-300 ${
          toast.type === "success" ? "bg-gray-900 text-white" : "bg-red-600 text-white"
        }`}>
          <span className="font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default Campaigns;
