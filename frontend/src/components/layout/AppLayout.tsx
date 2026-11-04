
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageDetails: Record<
  string,
  { title: string; description: string }
> = {
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
  "/organizations": {
    title: "Organizations",
    description: "Manage your organizations",
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
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 text-slate-800">

      <Sidebar />

      <main className="min-w-0 flex-1">
        <Header
          title={page.title}
          description={page.description}
        />

        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
