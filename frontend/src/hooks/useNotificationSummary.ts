import { useCallback, useState } from "react";
import { notificationApi, type NotificationSummary } from "../api/notificationApi";
import { useLiveRefresh } from "./useLiveRefresh";

const empty: NotificationSummary = {
  unreadNotifications: 0,
  pendingRequests: 0,
  unreadMessages: 0,
  newAcceptances: 0,
};

export function useNotificationSummary(enabled = true) {
  const [summary, setSummary] = useState<NotificationSummary>(empty);

  const refresh = useCallback(async () => {
    try {
      const data = await notificationApi.summary();
      setSummary(data);
    } catch {
      /* ignore polling errors */
    }
  }, []);

  useLiveRefresh(refresh, {
    enabled,
    intervalMs: 8_000,
    events: ["outreach_handled", "dashboard_refresh", "messages_updated"],
  });

  return summary;
}
