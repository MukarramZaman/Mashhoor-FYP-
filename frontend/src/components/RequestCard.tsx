import { Link } from "react-router-dom";

type RequestCardProps = {
  title: string;
  brand: string;
  desc: string;
  price: string;
  deadline: string;
  deliverableCount: string;
  tags: string[];
  requestId?: string;
  campaignId?: string;
  onAccept?: () => void;
  onDecline?: () => void;
};

function RequestCard({
  title,
  brand,
  desc,
  price,
  deadline,
  deliverableCount,
  tags,
  requestId,
  campaignId,
  onAccept,
  onDecline,
}: RequestCardProps) {
  return (
    <div className="request-card" data-request-id={requestId}>
      <div className="card-header">
        <h3 className="req-title">{title}</h3>
        <span className="brand-badge">{brand}</span>
      </div>

      <p className="req-desc">{desc}</p>

      <div className="info-bar">
        <div>
          <div className="info-label">Compensation</div>
          <div className="info-value">{price}</div>
        </div>
        <div>
          <div className="info-label">Deadline</div>
          <div className="info-value">{deadline}</div>
        </div>
        <div className="pr-10">
          <div className="info-label">Requirements</div>
          <div className="info-value">{deliverableCount} deliverables</div>
        </div>
      </div>

      <div className="tags-section">
        <div>
          <span className="tags-label">Requirements:</span>
        </div>
        <div className="tags-row">
          {tags.map((tag: string, index: number) => (
            <span key={index} className="req-tag">
              {tag}
            </span>
          ))}
        </div>

        <div className="action-row">
          <button className="btn-req btn-accept" onClick={onAccept}>
            <img
              src="/assets/check.svg"
              alt="Accept"
              width={16}
              height={16}
            />
            Accept
          </button>

          <button className="btn-req btn-decline" onClick={onDecline}>
            <img src="/assets/x.svg" alt="Decline" width={16} height={16} />
            Decline
          </button>

          <Link to={`/campaign-details/${campaignId}`} className="btn-req btn-view">
            <img src="/assets/eye.svg" alt="View" width={16} height={16} />
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RequestCard;
