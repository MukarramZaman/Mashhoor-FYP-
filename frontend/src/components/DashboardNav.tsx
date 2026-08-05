import { Link } from "react-router-dom";
import Title from "./Title";
import NavBadge from "./NavBadge";
import { useNotificationSummary } from "../hooks/useNotificationSummary";

function DashboardNav() {
  const summary = useNotificationSummary(true);
  const requestsBadge = summary.pendingRequests;
  const messagesBadge = summary.unreadMessages;

  return (
    <div className="flex justify-between items-center bg-white p-4 border-b border-gray-200">
      <Link to="/influencer-dashboard">
        <Title />
      </Link>
      <div className="flex items-center gap-5 text-lg">
        <Link
          to="/influencer-messages"
          className="relative flex items-center cursor-pointer"
          title="Campaign messages"
        >
          <img src="/assets/message-square-green.svg" alt="Messages" width={22} height={22} />
          <NavBadge count={messagesBadge} className="absolute -top-2 -right-2" />
        </Link>
        <Link
          to="/influencer-requests"
          className="relative flex items-center gap-2 cursor-pointer"
          title="Campaign requests"
        >
          <img src="/assets/users.svg" alt="Requests" width={22} height={22} />
          <NavBadge count={requestsBadge} />
        </Link>
        <Link to="/influencer-settings" className="cursor-pointer">
          <img src="/assets/settings.svg" alt="Settings" width={22} height={22} />
        </Link>
      </div>
    </div>
  );
}

export default DashboardNav;
