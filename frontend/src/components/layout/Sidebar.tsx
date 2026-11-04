
import { useState } from "react";
import { NavLink } from "react-router-dom";

const navigationItems = [
  { label: "Dashboard", icon: "▦", href: "/" },
  { label: "Datasets", icon: "▤", href: "/datasets" },
  { label: "Validation Rules", icon: "☑", href: "/validation-rules" },
  { label: "Processing Runs", icon: "↻", href: "/processing-runs" },
  { label: "Organizations", icon: "▧", href: "/organizations" },
];

function SidebarContent({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/80 bg-white/55 text-slate-700 shadow-[0_12px_40px_rgba(71,85,130,0.12)] backdrop-blur-2xl">

      {/* BRAND */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/70 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-400 via-violet-400 to-purple-500 text-2xl font-bold text-white shadow-lg shadow-violet-300/40">
            ∿
          </div>

          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-800">
              DataPulse
            </h1>
            <p className="text-[10px] font-semibold tracking-wide text-slate-500">
              ENTERPRISE PLATFORM
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/70 text-slate-600 hover:bg-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* NAVIGATION */}
      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <p className="mb-4 px-3 text-[10px] font-extrabold uppercase tracking-[2px] text-slate-400">
          Workspace
        </p>

        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-1.5 text-[13px] font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-blue-400 to-violet-400 text-white shadow-lg shadow-violet-300/40"
                  : "text-slate-600 hover:translate-x-1 hover:bg-white/75 hover:text-violet-700"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-white/60 text-slate-600 group-hover:bg-violet-100 group-hover:text-violet-700"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0 flex-1">
                  {item.label}
                </span>

                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* SYSTEM HEALTH */}
      <div className="mx-4 mb-3 shrink-0 rounded-2xl border border-white/80 bg-white/65 p-3.5 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative h-3 w-3 rounded-full bg-emerald-500" />
          </span>

          <div>
            <p className="text-xs font-bold text-slate-800">
              System Health
            </p>
            <p className="mt-1 text-[10px] text-emerald-700">
              All Services Operational
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* MOBILE MENU */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-5 z-50 grid h-10 w-10 place-items-center rounded-xl border border-white bg-white/90 text-xl text-slate-700 shadow-lg backdrop-blur-xl md:hidden"
      >
        ☰
      </button>

      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden h-screen w-[270px] shrink-0 self-start p-2 md:block">
        <SidebarContent />
      </aside>

      {/* MOBILE DRAWER */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />

          <aside className="relative h-full w-[285px] max-w-[85vw] bg-gradient-to-br from-[#dcecff] via-[#e9e7ff] to-[#fce4f0] p-3 shadow-2xl">
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
