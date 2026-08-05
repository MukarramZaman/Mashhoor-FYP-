import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { campaignApi } from "../../api";
import type { Campaign } from "../../api/campaignApi";

function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) return <div className="p-8 text-center">Loading campaign details...</div>;
  if (!campaign) return <div className="p-8 text-center">Campaign not found.</div>;

  const businessName = typeof campaign.business === 'object' ? campaign.business.name : 'Business';

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex gap-8 items-start">
          <div className="w-2/3 space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                      {campaign.title}
                    </h1>
                    <span className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-md font-medium border border-purple-100">
                      Campaign Request
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <span>{businessName}</span>
                    <span>•</span>
                    <span>Posted {new Date(campaign.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {/* <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-lg">
                  TS
                </div> */}
              </div>

              <div className="flex gap-2 mt-4">
                {campaign.niche?.map((n, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                About the Campaign
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap">
                {campaign.description}
              </p>

              <h3 className="font-semibold text-gray-900 mb-3">
                Key Objectives / Goals
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap">
                {campaign.goals || "No specific goals provided."}
              </p>

              <h3 className="font-semibold text-gray-900 mb-3">
                Requirements
              </h3>
              <div className="space-y-3">
                {campaign.requirements?.platforms?.map((platform, i) => (
                  <div key={`p-${i}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="p-2 bg-white rounded-md shadow-sm text-purple-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">Platform: {platform}</div>
                    </div>
                  </div>
                ))}
                {campaign.requirements?.contentType?.map((type, i) => (
                  <div key={`c-${i}`} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-gray-50">
                    <div className="p-2 bg-white rounded-md shadow-sm text-pink-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-gray-900">Content Type: {type}</div>
                    </div>
                  </div>
                ))}
                {(!campaign.requirements?.platforms?.length && !campaign.requirements?.contentType?.length) && (
                  <div className="text-sm text-gray-500">No specific deliverables listed.</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Offer & Actions */}
          <div className="w-1/3 space-y-6">
            {/* Offer Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
              <div className="text-center border-b border-gray-100 pb-6 mb-6">
                <div className="text-sm text-gray-500 mb-1">
                  Total Budget
                </div>
                <div className="text-4xl font-bold text-gray-900">
                  {campaign.budget?.currency} {campaign.budget?.total?.toLocaleString() || "0"}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Deadline</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(campaign.timeline?.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Deliverables</span>
                  <span className="text-gray-900 font-medium">
                    {(campaign.requirements?.platforms?.length || 0) + (campaign.requirements?.contentType?.length || 0)} Items
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="text-gray-900 font-medium capitalize">
                    {campaign.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <Link to="/influencer-messages" className="w-full block text-center text-purple-600 font-medium text-sm hover:underline mt-2">
                  Message Brand
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CampaignDetails;
