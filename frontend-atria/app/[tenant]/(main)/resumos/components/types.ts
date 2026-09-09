export type Platform = "all" | "tiktok" | "instagram" | "facebook";

export interface FollowerGrowthPoint {
  date: string;
  followers: number;
}

export interface ViewsOverTimePoint {
  time: string;
  views: number;
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  subtext?: string;
}

export interface SummaryData {
  id: string;
  platform: "tiktok" | "instagram" | "facebook";
  title: string;
  description: string;
  views: number;
  newFollowers: number;
  engagementRate: string;
  totalComments: number;
  sharesCount: number;
  date: string;
  viewsTrend: ViewsOverTimePoint[];
  followerGrowth: FollowerGrowthPoint[];
}
