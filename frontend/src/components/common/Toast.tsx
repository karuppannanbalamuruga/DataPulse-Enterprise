import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type = "success",
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(onClose, duration);

    return () => window.clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const styles = {
    success: {
      container: "border-green-200",
      icon: "bg-green-100 text-green-700",
      title: "Success!",
      symbol: "✓",
    },
    error: {
      container: "border-red-200",
      icon: "bg-red-100 text-red-700",
      title: "Error!",
      symbol: "✕",
    },
    warning: {
      container: "border-yellow-200",
      icon: "bg-yellow-100 text-yellow-700",
      title: "Warning!",
      symbol: "!",
    },
    info: {
      container: "border-blue-200",
      icon: "bg-blue-100 text-blue-700",
      title: "Information",
      symbol: "i",
    },
  };

  const style = styles[type];

  return (
    <div className="fixed right-5 top-5 z-[9999] w-[calc(100%-2.5rem)] max-w-sm animate-in slide-in-from-top-2 fade-in duration-300">
      <div
        role={type === "error" ? "alert" : "status"}
        aria-live={type === "error" ? "assertive" : "polite"}
        className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-xl ${style.container}`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${style.icon}`}
        >
          {style.symbol}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900">{style.title}</p>
          <p className="break-words text-sm text-gray-600">{message}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="self-start text-lg text-gray-400 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
}