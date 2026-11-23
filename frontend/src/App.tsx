
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Datasets from "./pages/Datasets";
import ValidationRules from "./pages/ValidationRules";
import ProcessingRuns from "./pages/ProcessingRuns";
import Settings from "./pages/Settings";
import Organizations from "./pages/Organizations";
import Analytics from "./pages/Analytics";

// Alert and Notification pages
import Alerts from "./pages/Alerts";
import Notifications from "./pages/Notifications";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/validation-rules" element={<ValidationRules />} />
        <Route path="/processing-runs" element={<ProcessingRuns />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/settings" element={<Settings />} />

        {/* Alert and Notification Routes */}
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/notifications" element={<Notifications />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
