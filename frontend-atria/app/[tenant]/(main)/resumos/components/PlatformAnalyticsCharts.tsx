import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FollowerGrowthPoint, ViewsOverTimePoint } from "./types";

interface ChartsProps {
  followerData: FollowerGrowthPoint[];
  viewsData: ViewsOverTimePoint[];
  color: string;
}

export function PlatformAnalyticsCharts({
  followerData,
  viewsData,
  color,
}: ChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
      <div className="p-4 bg-white border border-slate-100 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Curva de Visualizações
          </span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={viewsData}>
              <XAxis
                dataKey="time"
                stroke="#cbd5e1"
                fontSize={10}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke={color}
                fill={color}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="p-4 bg-white border border-slate-100 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Ganho de Novos Seguidores
          </span>
        </div>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={followerData}>
              <XAxis
                dataKey="date"
                stroke="#cbd5e1"
                fontSize={10}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              />
              <Bar dataKey="followers" fill={color} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
