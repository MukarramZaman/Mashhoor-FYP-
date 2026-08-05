import { useCallback, useState } from "react";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import RequestCard from "../../components/RequestCard";
import { outreachApi } from "../../api";
import type { Outreach } from "../../api/outreachApi";

function Requests() {
  const [requests, setRequests] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const data = await outreachApi.getMyRequests();
      setRequests(data);
    } catch (err) {
      console.error("Failed to load requests", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useLiveRefresh(fetchRequests, {
    intervalMs: 10_000,
    events: ["outreach_handled", "dashboard_refresh"],
  });

  const handleAccept = async (id: string) => {
    try {
      await outreachApi.reply(id, "I am interested!", true);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      window.dispatchEvent(new Event("outreach_handled"));
      window.dispatchEvent(new Event("dashboard_refresh"));
      // Optionally show a success toast here
    } catch (err) {
      console.error("Failed to accept request", err);
      alert("Failed to accept request.");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await outreachApi.reply(id, "Not interested at this time.", false);
      setRequests((prev) => prev.filter((r) => r._id !== id));
      window.dispatchEvent(new Event("outreach_handled"));
      window.dispatchEvent(new Event("dashboard_refresh"));
      // Optionally show a success toast here
    } catch (err) {
      console.error("Failed to decline request", err);
      alert("Failed to decline request.");
    }
  };

  const pendingRequests = requests.filter(r => r.status === "sent" || r.status === "pending" || r.status === "opened");

  return (
    <>
      <div className="requests-container">
        <div className="page-header">
          <h1 className="page-title">Campaign Requests</h1>
          <p className="page-subtitle">
            Review and respond to collaboration opportunities
          </p>
        </div>

        <div>
          {loading ? (
            <div className="text-gray-500 py-8 text-center">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
              <img
                src="/assets/loader-circle.svg"
                alt="No requests"
                className="w-12 h-12 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg mb-2">No campaign requests yet.</p>
              <p className="text-sm">
                When a brand wants to collaborate with you, their requests will appear here.
              </p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
              <img
                src="/assets/loader-circle.svg"
                alt="No requests"
                className="w-12 h-12 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg mb-2">No pending requests right now.</p>
              <p className="text-sm">
                Check back later!
              </p>
            </div>
          ) : (
            pendingRequests.map((item) => {
              // Format data for the RequestCard
              const { campaign, business } = item;

              // Safely extract requirements
              // @ts-ignore - The campaign object from API might have more fields than typed
              const platforms = campaign.requirements?.platforms || [];
              // @ts-ignore
              const contentType = campaign.requirements?.contentType || [];

              return (
                <RequestCard
                  key={item._id}
                  title={campaign.title || "Collaboration Opportunity"}
                  brand={business.name || "A Brand"}
                  desc={item.message || campaign.description || "No description provided."}
                  // @ts-ignore
                  price={`${campaign.budget?.currency || "$"} ${campaign.budget?.total?.toLocaleString() || "0"}`}
                  // @ts-ignore
                  deadline={new Date(campaign.timeline?.endDate).toLocaleDateString()}
                  deliverableCount={platforms.length + contentType.length + ""}
                  tags={[...platforms, ...contentType, item.status]}
                  requestId={item._id}
                  campaignId={campaign._id}
                  onAccept={() => handleAccept(item._id)}
                  onDecline={() => handleDecline(item._id)}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default Requests;
