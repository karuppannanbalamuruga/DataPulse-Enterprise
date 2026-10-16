
import PageContainer from "../components/layout/PageContainer";

export default function Settings() {
  return (
    <PageContainer>
      <div className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Workspace Settings</h2>
        <p className="mt-2 text-sm text-slate-500">
          Workspace preferences and configuration will be added here.
        </p>
      </div>
    </PageContainer>
  );
}
