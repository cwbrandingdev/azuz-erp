import { Platform } from "./types";

interface PlatformFilterProps {
  activeFilter: Platform;
  onFilterChange: (filter: Platform) => void;
}

export function PlatformFilter({
  activeFilter,
  onFilterChange,
}: PlatformFilterProps) {
  const platforms: { id: Platform; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "tiktok", label: "TikTok" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
  ];

  return (
    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 w-fit">
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => onFilterChange(platform.id)}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeFilter === platform.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {platform.label}
        </button>
      ))}
    </div>
  );
}
