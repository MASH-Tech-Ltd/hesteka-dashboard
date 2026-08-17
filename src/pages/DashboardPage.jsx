import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import MapCard from "../components/dashboard/MapCard";
import ActivityCard from "../components/dashboard/ActivityCard";
import ReportTypesCard from "../components/dashboard/ReportTypesCard";
import CrowdfundingCard from "../components/dashboard/CrowdfundingCard";

import { useEffect, useState } from "react";
import api from "../utils/api";

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-[#e8ddd0] p-5 flex flex-col justify-between shadow-sm animate-pulse h-[120px]">
    <div className="flex justify-between items-start">
      <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
      <div className="w-8 h-8 bg-gray-100 rounded-full"></div>
    </div>
    <div className="flex flex-col gap-2 mt-2">
      <div className="w-1/3 h-6 bg-gray-200 rounded"></div>
      <div className="w-2/3 h-3 bg-gray-100 rounded"></div>
    </div>
  </div>
);

const LargeCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-[#e8ddd0] p-6 shadow-sm animate-pulse h-[350px] flex flex-col gap-4">
    <div className="flex justify-between items-center border-b border-[#f0e8d8] pb-4">
      <div className="w-1/3 h-5 bg-gray-200 rounded"></div>
      <div className="w-16 h-4 bg-gray-100 rounded"></div>
    </div>
    <div className="w-full h-full bg-gray-50 rounded-xl"></div>
  </div>
);

export default function DashboardPage() {
  const { t } = useLang();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/stats");
        if (res.data.status === "ok") {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsRow1 = [
    {
      label: t.usersLabel,
      value: { text: (stats?.users?.total || 0).toLocaleString(), color: "text-[#3a2a1a]" },
      sub: stats?.users?.newThisWeek ? `+${stats.users.newThisWeek} ${t.thisWeek}` : `${(0).toLocaleString()} ${t.thisWeek}`,
      subType: "up",
    },
    {
      label: t.activeReports,
      value: { text: (stats?.reports?.total || 0).toLocaleString(), color: "text-orange-500" },
      sub: stats?.reports?.pending ? `${stats.reports.pending} ${t.pending}` : `${(0).toLocaleString()} ${t.pending}`,
      subType: "wait",
    },
    {
      label: t.resolved,
      value: { text: (stats?.reports?.resolved || 0).toLocaleString(), color: "text-green-600" },
      sub: stats?.reports?.resolutionRate ? `${t.rate} ${stats.reports.resolutionRate}%` : `${(0).toLocaleString()} ${t.rate}`,
      subType: "up",
    },
    {
      label: t.donationsCollected,
      value: { text: `${(stats?.donations?.collectedThisMonth || 0).toLocaleString()}€`, color: "text-orange-500" },
      sub: stats?.donations?.growthText || t.thisMonth206,
      subType: "up",
    },
  ];

  const statsRow2 = [
    {
      label: t.pointsDistributed,
      value: { text: (stats?.points?.totalEarnedThisMonth || 0).toLocaleString(), color: "text-red-600" },
      sub: stats?.points?.pending ? `${stats.points.pending?.toLocaleString()} ${t.pendingPoints}` : `${(0).toLocaleString() + " in"} ${t.pendingPoints}`,
      subType: "wait",
    },
    {
      label: t.partnersLabel,
      value: { text: (stats?.partners?.total || 0).toLocaleString(), color: "text-[#3a2a1a]" },
      sub: stats?.partners?.pending ? `${stats.partners.pending} ${t.inValidation}` : `${(0).toLocaleString()} ${t.inValidation}`,
      subType: "wait",
    },
    {
      label: t.activeMissions,
      value: { text: (stats?.missions?.active || 0).toLocaleString(), color: "text-[#3a2a1a]" },
      sub: stats?.missions?.inProgress ? `${stats.missions.inProgress} ${t.inProgress}` : `${(0).toLocaleString()} ${t.inProgress}`,
      subType: "neutral",
    },
    {
      label: t.downloads,
      value: { text: (stats?.downloads?.total || 0).toLocaleString(), color: "text-orange-500" },
      sub: stats?.downloads?.growth ? `+${stats.downloads.growth} ${t.thisMonth55}` : `${(0).toLocaleString()} ${t.thisMonth55}`,
      subType: "up",
    },
  ];

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
        {/* Stats Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        {/* Stats Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        {/* Map + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
        {/* Chart + Crowdfunding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LargeCardSkeleton />
          <LargeCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statsRow1.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statsRow2.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Map + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <MapCard data={stats?.reports?.map} total={stats?.reports?.pending} />
        <ActivityCard data={stats?.activity} />
      </div>

      {/* Chart + Crowdfunding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ReportTypesCard data={stats?.reports?.breakdown} total={stats?.reports?.total} />
        <CrowdfundingCard initialData={stats?.crowdfunding} />
      </div>
    </div>
  );
}
