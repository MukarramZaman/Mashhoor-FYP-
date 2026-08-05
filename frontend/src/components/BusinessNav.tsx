import { Link, NavLink } from "react-router-dom";
import { Title } from "../components";
import NavBadge from "./NavBadge";
import { useNotificationSummary } from "../hooks/useNotificationSummary";

function BusinessNav() {
  const summary = useNotificationSummary(true);

  return (
    <>
      <div className="business-nav">
        <div className="flex items-center gap-8">
          <Link to="/business-dashboard">
            <Title />
          </Link>
          <div className="flex">
            <NavLink
              to="/business-dashboard"
              className={({ isActive }) => `${isActive ? "nav-link active" : "nav-link"}`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/find-influencers"
              className={({ isActive }) => `${isActive ? "nav-link active" : "nav-link"}`}
            >
              Find Influencers
            </NavLink>
            <NavLink
              to="/business-campaigns"
              className={({ isActive }) => `${isActive ? "nav-link active" : "nav-link"}`}
            >
              Campaigns
            </NavLink>
            <NavLink
              to="/business-messages"
              className={({ isActive }) => `${isActive ? "nav-link active" : "nav-link"}`}
            >
              Messages
            </NavLink>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/business-notifications"
            className="relative text-gray-500 hover:text-gray-900"
            title="Notifications"
          >
            <img src="/assets/bell.svg" alt="Notifications" width={20} height={20} />
            <NavBadge count={summary.unreadNotifications} className="absolute -top-2 -right-2" />
          </Link>
          <Link to="/business-settings" className="text-gray-500 hover:text-gray-900">
            <img src="/assets/settings.svg" alt="Settings" width={20} height={20} />
          </Link>
        </div>
      </div>
    </>
  );
}

export default BusinessNav;
