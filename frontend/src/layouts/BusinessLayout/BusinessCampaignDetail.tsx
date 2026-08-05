import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { campaignApi, type Campaign } from "../../api/campaignApi";

function BusinessCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        if (id) {
          const data = await campaignApi.getById(id);
          setCampaign(data);
        }
      } catch (err) {
        console.error("Failed to load campaign", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  if (loading) return <div className="p-8 text-center animate-pulse">Loading campaign details...</div>;
  if (!campaign) return <div className="p-8 text-center">Campaign not found.</div>;

  return (
    <div className="bg-[#f9fafb] min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        {/* Title and Actions */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="flex items-center gap-4 mb-2">
               <h1 className="text-4xl font-bold text-gray-900">{campaign.title}</h1>
               <span className={`status-badge capitalize px-3 py-1 text-sm ${
                 campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
               }`}>
                 {campaign.status}
               </span>
            </div>
            <p className="text-gray-500">Campaign created on {new Date(campaign.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <button 
            onClick={() => navigate(`/business-campaign/edit/${campaign._id}`)}
            className="px-8 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-50 shadow-sm transition-all"
          >
            Edit Campaign
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 text-gray-400 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                <span className="text-sm font-bold uppercase tracking-wider">Target Niche</span>
             </div>
             <div className="text-xl font-bold text-gray-900">{campaign.niche[0] || "General"}</div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 text-gray-400 mb-4">
                <span className="text-lg font-bold">Rs</span>
                <span className="text-sm font-bold uppercase tracking-wider">Budget</span>
             </div>
             <div className="text-2xl font-bold text-gray-900">Rs {campaign.budget.total.toLocaleString()}</div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3 text-gray-400 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="text-sm font-bold uppercase tracking-wider">Influencers</span>
             </div>
             <div className="text-xl font-bold text-gray-900">{campaign.selectedInfluencers.length} Selected</div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3 text-gray-400">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                   <span className="text-sm font-bold uppercase tracking-wider">Progress</span>
                </div>
                <span className="text-xl font-bold text-gray-900">{campaign.progress}%</span>
             </div>
             <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500" style={{ width: `${campaign.progress}%` }}></div>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
          <h2 className="text-xl font-bold text-gray-900 mb-8 border-b border-gray-50 pb-4">Campaign Overview</h2>
          
          <div className="space-y-10">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Description</h3>
              <p className="text-gray-600 leading-relaxed max-w-4xl">{campaign.description}</p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Objectives</h3>
              <p className="text-gray-600 leading-relaxed max-w-4xl">{campaign.goals || "No specific objectives listed."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessCampaignDetail;
