import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { notificationApi, type AppNotification } from "../../api/notificationApi";
import { dashboardApi } from "../../api";

type DisplayNotif = {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  isUnread: boolean;
  iconColor: string;
  icon: React.ReactNode;
  link?: string;
};

function Notification() {
  const [activeTab, setActiveTab] = useState("All");
  const [notifications, setNotifications] = useState<DisplayNotif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [alerts, dashboard] = await Promise.all([
          notificationApi.list().catch(() => [] as AppNotification[]),
          dashboardApi.getBusinessDashboardStats(),
        ]);

        const fromAlerts: DisplayNotif[] = alerts.map((n) => ({
          id: n._id,
          type:
            n.type === "influencer_interested"
              ? "Approvals"
              : n.type === "campaign"
                ? "Campaigns"
                : "Messages",
          title: n.title,
          desc: n.body,
          time: new Date(n.createdAt).toLocaleString(),
          isUnread: !n.isRead,
          iconColor: n.type === "influencer_interested" ? "icon-green" : "icon-blue",
          icon: (
            <img
              src={
                n.type === "influencer_interested"
                  ? "/assets/message-square-green.svg"
                  : "/assets/message-square-green.svg"
              }
              alt=""
              width={20}
              height={20}
            />
          ),
          link: n.type === "influencer_interested" ? "/business-messages" : undefined,
        }));

        const fromActivity: DisplayNotif[] =
          dashboard.recentActivity?.map((activity, index: number) => ({
            id: activity.id || `activity-${index}`,
            type: activity.type === "campaign" ? "Campaigns" : "Messages",
            title: activity.type === "campaign" ? "Campaign Update" : "Outreach Update",
            desc: activity.text,
            time: new Date(activity.date).toLocaleString(),
            isUnread: false,
            iconColor: activity.type === "campaign" ? "icon-purple" : "icon-blue",
            icon: (
              <img
                src={
                  activity.type === "campaign"
                    ? "/assets/briefcase-business-.svg"
                    : "/assets/message-square-green.svg"
                }
                alt=""
                width={20}
                height={20}
              />
            ),
          })) ?? [];

        const merged = [...fromAlerts, ...fromActivity].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        setNotifications(merged);
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
      setTimeout(() => {
        window.dispatchEvent(new Event("dashboard_refresh"));
      }, 500);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications =
    activeTab === "All"
      ? notifications
      : notifications.filter((n) => n.type === activeTab);

  return (
    <div className="notifications-bg">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">
              Stay updated when influencers show interest in your campaigns
            </p>
          </div>
          <button type="button" className="btn-mark-read" onClick={markAllRead}>
            Mark all as read
          </button>
        </div>

        <div className="tabs-container">
          {["All", "Campaigns", "Messages", "Approvals"].map((tab) => (
            <div
              key={tab}
              className={`tab-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "All" && notifications.filter((n) => n.isUnread).length > 0 && (
                <span className="tab-count">
                  {notifications.filter((n) => n.isUnread).length}
                </span>
              )}
            </div>
          ))}
        </div>

        <div>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
              <img
                src="/assets/loader-circle.svg"
                alt="No notifications"
                className="w-12 h-12 mx-auto mb-4 opacity-50"
              />
              <p className="text-lg mb-2">You&apos;re all caught up!</p>
              <p className="text-sm">
                When an influencer shows interest in a campaign, you will be notified here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`notif-card ${item.isUnread ? "unread" : ""}`}
              >
                <div className={`notif-icon-box ${item.iconColor}`}>{item.icon}</div>

                <div className="flex-1">
                  <div className="notif-header">
                    <span className="notif-title">{item.title}</span>
                    <span className="notif-time">{item.time}</span>
                  </div>
                  <div className="notif-desc">{item.desc}</div>

                  {item.isUnread && <span className="badge-unread">Unread</span>}

                  {item.link && (
                    <Link
                      to={item.link}
                      className="text-sm text-purple-600 font-medium mt-2 inline-block"
                    >
                      Open Messages →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notification;
