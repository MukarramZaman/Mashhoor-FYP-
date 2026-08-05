import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { campaignApi, type Campaign } from "../../api/campaignApi";

function EditCampaign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goals, setGoals] = useState("");
  const [niche, setNiche] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        if (id) {
          const data = await campaignApi.getById(id);
          setCampaign(data);
          setTitle(data.title);
          setDescription(data.description);
          setStatus(data.status);
          setBudget(data.budget.total);
          setStartDate(data.timeline.startDate.split('T')[0]);
          setEndDate(data.timeline.endDate.split('T')[0]);
          setGoals(data.goals || "");
          setNiche(data.niche?.[0] || "");
          setRegion(data.targetLocations?.[0] || "");
        }
      } catch (err) {
        console.error("Failed to load campaign", err);
        setError("Failed to load campaign data.");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    setError("");
    try {
      await campaignApi.update(id, {
        title,
        description,
        status: status as any,
        budget: { ...campaign?.budget, total: budget },
        timeline: { startDate, endDate },
        goals,
        niche: [niche],
        targetLocations: [region],
      });
      navigate(`/business-campaign/${id}`);
    } catch (err) {
      console.error(err);
      setError("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this campaign?")) return;
    setIsDeleting(true);
    try {
      await campaignApi.delete(id);
      navigate("/business-campaigns");
    } catch (err) {
      console.error(err);
      setError("Failed to delete campaign.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading campaign...</div>;
  if (!campaign) return <div className="p-8 text-center text-red-500">Campaign not found.</div>;

  return (
    <div className="bg-[#f9fafb] min-h-screen">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Campaign</h1>
            <p className="text-gray-500">Update your campaign details and settings</p>
            {error && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {error}
              </p>
            )}
          </div>
          <span className={`status-badge capitalize px-4 py-1.5 text-sm ${
            status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {status}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Influencers</div>
              <div className="text-2xl font-bold text-gray-900">{campaign.selectedInfluencers.length}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-6">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
               <span className="text-2xl font-bold">Rs</span>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Spent / Budget</div>
              <div className="text-2xl font-bold text-gray-900">Rs {campaign.budget.spent.toLocaleString()} / Rs {campaign.budget.total.toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-purple-600">{campaign.progress}%</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Progress</span>
             </div>
             <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400" style={{ width: `${campaign.progress}%` }}></div>
             </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Basic Information</h2>
            <p className="text-sm text-gray-400 mb-8">Update campaign name and description</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Campaign Name *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Campaign Description *</label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Campaign Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium appearance-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Budget & Timeline</h2>
            <p className="text-sm text-gray-400 mb-8">Set your budget and campaign duration</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Campaign Budget (Rs) *</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Campaign Objectives *</label>
                <textarea
                  rows={3}
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="w-full bg-gray-50 border border-transparent rounded-xl p-4 text-gray-900 focus:outline-none focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 flex justify-between items-center pb-20">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-8 py-3.5 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Delete Campaign
          </button>

          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(`/business-campaign/${id}`)}
              className="text-gray-500 font-bold hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-12 py-3.5 bg-[#6d28d9] text-white rounded-xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditCampaign;
