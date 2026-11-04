
interface HeaderProps {
  title: string;
  description?: string;
}

export default function Header({
  title,
  description,
}: HeaderProps) {
  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-5 md:px-7">
      <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/90 bg-white/90 px-4 py-3 shadow-[0_8px_30px_rgba(30,41,90,0.06)] backdrop-blur-2xl sm:px-6">

        {/* PAGE TITLE */}
        <div className="min-w-0 flex-1 pl-11 md:pl-0">
          {/* <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[10px] font-bold tracking-widest text-violet-500">
              WORKSPACE
            </span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs text-slate-400">
              {title}
            </span>
          </div> */}

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

          {/* SEARCH */}
          {/* <div className="hidden w-52 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition focus-within:border-violet-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-100 lg:flex xl:w-64">
            <svg
              className="h-4 w-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="search"
              placeholder="Search datasets, runs..."
              aria-label="Search"
              className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
            />
          </div> */}

          {/* NOTIFICATION */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-violet-600" />
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
