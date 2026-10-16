
import { useState } from "react";
import { NavLink } from "react-router-dom";

const navigationItems = [
  { label: "Dashboard", icon: "▦", href: "/" },
  { label: "Datasets", icon: "▤", href: "/datasets" },
  { label: "Validation Rules", icon: "✓", href: "/validation-rules" },
  { label: "Processing Runs", icon: "↻", href: "/processing-runs" },
  { label: "Organizations", icon: "🏢", href: "/organizations" },
  { label: "Settings", icon: "⚙", href: "/settings" },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = (
    <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 py-5">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Workspace
      </p>

      {navigationItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/"}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          <span className="w-5 text-center" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
        className="fixed left-4 top-4 z-50 rounded-lg border bg-white px-3 py-2 md:hidden"
      >
        ☰
      </button>

      <aside className="hidden min-h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-200 px-6 py-6">
          <h1 className="text-xl font-bold text-blue-600">DataPulse</h1>
          <p className="mt-1 text-xs text-slate-500">Enterprise Platform</p>
        </div>

        {navigation}

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          DataPulse Enterprise · v1.0.0
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 h-full w-full bg-slate-900/40"
          />
          <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-6">
              <h1 className="text-xl font-bold text-blue-600">DataPulse</h1>
              <p className="mt-1 text-xs text-slate-500">Enterprise Platform</p>
            </div>
            {navigation}
          </aside>
        </div>
      )}
    </>
  );
}
