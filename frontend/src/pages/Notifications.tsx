
import { useCallback, useEffect, useState } from "react";

import {
  Bell,
  CheckCheck,
  CheckCircle,
  RefreshCw,
  Mail,
  MailOpen,
  Clock,
} from "lucide-react";

import Toast, { type ToastType } from "../components/common/Toast";

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/api";

import type { Notification } from "../types/alertNotification";

const RECIPIENT_USER_ID = 1; // Temporary ID until authentication is integrated

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // TOAST STATE
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  }>({
    message: "",
    type: "success",
  });

  // SHOW TOAST
  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ message, type });
    },
    [],
  );

  // CLOSE TOAST
  const closeToast = useCallback(() => {
    setToast((current) => ({
      ...current,
      message: "",
    }));
  }, []);

  // FETCH NOTIFICATIONS
  // showLoader=false keeps existing cards visible during background refresh.
  const fetchNotifications = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await getNotifications({
          recipient_user_id: RECIPIENT_USER_ID,
          page,
          page_size: 10,
          ...(filter === "unread" ? { is_read: false } : {}),
          ...(filter === "read" ? { is_read: true } : {}),
        });

        setNotifications(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);
        setUnreadCount(response.unread_count);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);

        showToast(
          "Unable to load notifications. Please try again.",
          "error",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [page, filter, showToast],
  );

  // INITIAL FETCH AND FILTER/PAGE CHANGES
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // MARK SINGLE NOTIFICATION AS READ
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      setActionLoading(notificationId);

      await markNotificationAsRead(
        notificationId,
        RECIPIENT_USER_ID,
      );

      showToast(
        `Notification #${notificationId} marked as read.`,
        "success",
      );

      // Background refresh: preserve scroll position.
      await fetchNotifications(false);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);

      showToast(
        "Unable to update notification. Please try again.",
        "error",
      );
    } finally {
      setActionLoading(null);
    }
  };

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      setMarkAllLoading(true);

      const response = await markAllNotificationsAsRead(
        RECIPIENT_USER_ID,
      );

      showToast(
        response.message || "All notifications marked as read.",
        "success",
      );

      // Background refresh: cards will not disappear while loading.
      await fetchNotifications(false);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);

      showToast(
        "Unable to mark all notifications as read.",
        "error",
      );
    } finally {
      setMarkAllLoading(false);
    }
  };

  // DATE FORMAT
  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString();
  };

  // NOTIFICATION TYPE FORMAT
  const formatNotificationType = (value: string) => {
    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  return (
    <div className="space-y-5 p-4 sm:p-5 md:p-6">

      {/* TOAST NOTIFICATION */}
      <Toast
        message={toast.message}
        type={toast.type}
        duration={4000}
        onClose={closeToast}
      />

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

        {/* TOTAL NOTIFICATIONS */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Total Notifications
            </p>

            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
              <Bell size={18} />
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {total}
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Total matching notifications
          </p>
        </div>

        {/* UNREAD NOTIFICATIONS */}
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              Unread Notifications
            </p>

            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Mail size={18} />
            </div>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {unreadCount}
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Notifications waiting to be read
          </p>
        </div>
      </div>

      {/* FILTERS AND ACTION */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">

        <div className="mb-3">
          <h2 className="text-sm font-bold text-slate-800">
            Notification Filters
          </h2>

          <p className="mt-1 text-[11px] text-slate-400">
            Filter notifications by read status.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* FILTER BUTTONS */}
          <div className="flex flex-wrap gap-2">
            {(["all", "unread", "read"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setFilter(item);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${
                  filter === item
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-violet-50"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* MARK ALL AS READ */}
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={markAllLoading || unreadCount === 0}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck size={15} />

            {markAllLoading ? "Updating..." : "Mark All as Read"}
          </button>
        </div>
      </div>

      {/* NOTIFICATION LIST HEADING */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">
            Notification Activity
          </h2>

          <p className="mt-1 text-[11px] text-slate-500">
            Your latest system notifications.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700">
          {total} Notifications
        </span>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
          <RefreshCw
            size={24}
            className="mx-auto animate-spin text-violet-500"
          />

          <p className="mt-2 text-xs font-medium text-slate-500">
            Loading notifications...
          </p>
        </div>
      ) : notifications.length === 0 ? (

        /* EMPTY STATE */
        <div className="rounded-xl border border-slate-100 bg-white py-12 text-center shadow-sm">
          <CheckCircle
            className="mx-auto text-emerald-500"
            size={34}
          />

          <h3 className="mt-2 text-sm font-bold text-slate-800">
            No Notifications Found
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            There are no notifications in this category.
          </p>
        </div>
      ) : (

        /* COMPACT NOTIFICATION CARDS */
        <div className="grid grid-cols-1 gap-3">
          {notifications.map((notification) => {
            const isBusy = actionLoading === notification.id;

            return (
              <div
                key={notification.id}
                className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                  notification.is_read
                    ? "border-slate-200 bg-white"
                    : "border-violet-200 bg-white"
                }`}
              >

                {/* CARD HEADER */}
                <div className="flex items-center justify-between gap-3">

                  <div className="flex min-w-0 items-center gap-3">

                    <div
                      className={`shrink-0 rounded-lg p-2 ${
                        notification.is_read
                          ? "bg-slate-100 text-slate-500"
                          : "bg-violet-50 text-violet-600"
                      }`}
                    >
                      {notification.is_read ? (
                        <MailOpen size={18} />
                      ) : (
                        <Bell size={18} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800">
                        Alert #{notification.alert_id}
                      </h3>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Notification ID #{notification.id}
                      </p>
                    </div>
                  </div>

                  {/* READ / UNREAD BADGE */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      notification.is_read
                        ? "bg-slate-100 text-slate-600"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {notification.is_read ? "Read" : "Unread"}
                  </span>
                </div>

                {/* NOTIFICATION DETAILS */}
                <p className="mt-3 text-xs font-semibold text-slate-700">
                  {formatNotificationType(notification.notification_type)}
                </p>

                {/* METADATA */}
                <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Delivery Status
                    </p>

                    <p className="mt-1 text-xs font-semibold capitalize text-slate-700">
                      {notification.delivery_status.replaceAll("_", " ")}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <Clock size={11} />
                      Created At
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Recipient ID
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      #{notification.recipient_user_id}
                    </p>
                  </div>
                </div>

                {/* ACTION BUTTON */}
                {!notification.is_read ? (
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCheck size={14} />

                      {isBusy ? "Updating..." : "Mark as Read"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-emerald-600">
                    <CheckCircle size={14} />
                    This notification has been read.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION */}
      {!loading && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">

          <p className="text-xs font-medium text-slate-500">
            Page {page} of {totalPages} · {total} notifications
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
