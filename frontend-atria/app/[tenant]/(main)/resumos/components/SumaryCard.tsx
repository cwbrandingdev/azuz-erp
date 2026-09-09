import { SummaryData } from "./types";
import { MetricCard } from "./MetricCard";
import { PlatformAnalyticsCharts } from "./PlatformAnalyticsCharts";
import {
  EyeIcon,
  UserPlusIcon,
  MessageSquareIcon,
  Share2Icon,
} from "lucide-react";

interface SummaryCardProps {
  data: SummaryData;
}

export function SummaryCard({ data }: SummaryCardProps) {
  const getPlatformDetails = (platform: SummaryData["platform"]) => {
    switch (platform) {
      case "tiktok":
        return {
          label: "TikTok API",
          badgeClass: "bg-slate-900 text-white",
          chartColor: "#0f172a",
        };
      case "instagram":
        return {
          label: "Instagram Graph",
          badgeClass: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
          chartColor: "#ec4899",
        };
      case "facebook":
        return {
          label: "Facebook Graph",
          badgeClass: "bg-blue-600 text-white",
          chartColor: "#2563eb",
        };
    }
  };

  const details = getPlatformDetails(data.platform);

  return (
    <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full ${details.badgeClass}`}
          >
            {details.label}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {data.date}
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          Engajamento {data.engagementRate}
        </span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900">{data.title}</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">
          {data.description}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Visualizações"
          value={data.views.toLocaleString("pt-BR")}
          change="+24%"
          isPositive={true}
          subtext="vs. média"
        />
        <MetricCard
          label="Novos Seguidores"
          value={`+${data.newFollowers.toLocaleString("pt-BR")}`}
          change="+18%"
          isPositive={true}
          subtext="conversão"
        />
        <MetricCard
          label="Comentários"
          value={data.totalComments.toLocaleString("pt-BR")}
          change="+5%"
          isPositive={true}
        />
        <MetricCard
          label="Compartilhamentos"
          value={data.sharesCount.toLocaleString("pt-BR")}
          change="-2%"
          isPositive={false}
        />
      </div>

      <PlatformAnalyticsCharts
        followerData={data.followerGrowth}
        viewsData={data.viewsTrend}
        color={details.chartColor}
      />

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4 text-slate-400" /> {data.views}
          </span>
          <span className="flex items-center gap-1">
            <UserPlusIcon className="w-4 h-4 text-slate-400" />{" "}
            {data.newFollowers}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquareIcon className="w-4 h-4 text-slate-400" />{" "}
            {data.totalComments}
          </span>
          <span className="flex items-center gap-1">
            <Share2Icon className="w-4 h-4 text-slate-400" /> {data.sharesCount}
          </span>
        </div>
        <button className="text-slate-700 font-bold hover:underline">
          Relatório Completo →
        </button>
      </div>
    </div>
  );
}
