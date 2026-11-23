
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { getUnreadNotificationCount } from "../../services/api";

interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({
  title,
  description,
}: HeaderProps) {
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchUnreadCount = async () => {
      try {
        // Temporary recipient ID.
        // Replace with authenticated user ID when authentication is available.
        const response = await getUnreadNotificationCount(1);

        if (isMounted) {
          setUnreadCount(response.unread_count);
        }
      } catch (error) {
        console.error("Failed to fetch unread notifications:", error);
      }
    };

    fetchUnreadCount();

    const intervalId = window.setInterval(fetchUnreadCount, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-5 md:px-7">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-[0_8px_30px_rgba(30,41,90,0.06)] backdrop-blur-2xl sm:px-6">

        {/* PAGE TITLE */}
        <div className="min-w-0 flex-1 pl-11 md:pl-0">
          <h2 className="mt-1 truncate text-lg font-extrabold text-slate-900 sm:text-xl">
            {title}
          </h2>

          {description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">

          {/* NOTIFICATION */}
          <button
            type="button"
            aria-label={`Notifications, ${unreadCount} unread`}
            title="View notifications"
            onClick={() => navigate("/notifications")}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
          >
            <Bell size={20} strokeWidth={1.8} />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-violet-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="hidden h-9 w-px bg-slate-200 sm:block" />

          {/* PROFILE */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-extrabold text-white shadow-md shadow-violet-200">
              AD
            </div>

            <div className="hidden sm:block">
              <p className="text-xs font-bold text-slate-800">
                Admin Workspace
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                DataPulse User
              </p>
            </div>

            <span className="hidden text-xs text-slate-400 sm:block">
              ⌄
            </span>
          </div>
        </div>
      </header>
    </div>
  );
}
