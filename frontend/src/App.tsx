
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Datasets from "./pages/Datasets";
import ValidationRules from "./pages/ValidationRules";
import ProcessingRuns from "./pages/ProcessingRuns";
import Settings from "./pages/Settings";
import Organizations from "./pages/Organizations";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/validation-rules" element={<ValidationRules />} />
        <Route path="/processing-runs" element={<ProcessingRuns />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
