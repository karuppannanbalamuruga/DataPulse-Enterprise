
interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loader({
  message = "Loading...",
  fullScreen = false,
}: LoaderProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 ${
        fullScreen ? "min-h-screen" : "min-h-32"
      }`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
