import "../App.css";
type CampaignCardProps = {
  title: string;
  status: string;
  influencers: number;
  budget: string;
  progress: number;
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};
function CampaignCard({
  title,
  status,
  influencers,
  budget,
  progress,
  onViewDetails,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  return (
    <>
      <div className="campaign-card">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <span className="status-badge">{status}</span>
          </div>
          <button 
            onClick={onDelete}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Delete Campaign"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <span className="meta-text">{influencers} influencers</span>
          <span className="meta-text">{budget} budget</span>
        </div>

        <div className="mb-8">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Progress</span>
            <span className="text-gray-900 font-medium">{progress}%</span>
          </div>
          <div className="progress-container">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onViewDetails} className="btn-action-outline">
            <img src="/assets/eye.svg" alt="View" width={16} height={16} />
            View Details
          </button>

          <button onClick={onEdit} className="btn-action-outline">
            <img
              src="/assets/square-pen.svg"
              alt="Edit"
              width={16}
              height={16}
            />
            Edit
          </button>
        </div>
      </div>
    </>
  );
}
export default CampaignCard;
