import { MetricCardProps } from "./types";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  change,
  isPositive,
  subtext,
}: MetricCardProps) {
  return (
    <div className="p-4 bg-slate-50/80 border border-slate-100 rounded-2xl flex flex-col justify-between">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </span>
      <div className="my-2">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span
          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold ${
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {isPositive ? (
            <TrendingUpIcon className="w-3 h-3" />
          ) : (
            <TrendingDownIcon className="w-3 h-3" />
          )}
          {change}
        </span>
        {subtext && <span className="text-slate-400">{subtext}</span>}
      </div>
    </div>
  );
}
