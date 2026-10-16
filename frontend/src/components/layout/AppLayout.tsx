
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageDetails: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Data quality and analytics overview",
  },
  "/datasets": {
    title: "Datasets",
    description: "Manage and monitor your datasets",
  },
  "/validation-rules": {
    title: "Validation Rules",
    description: "Configure data quality validation rules",
  },
  "/processing-runs": {
    title: "Processing Runs",
    description: "Track dataset processing activity",
  },
  "/settings": {
    title: "Settings",
    description: "Manage your workspace settings",
  },
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const page = pageDetails[pathname] ?? {
    title: "Page Not Found",
    description: "The requested page could not be found",
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header title={page.title} description={page.description} />
        <Outlet />
      </main>
    </div>
  );
}
