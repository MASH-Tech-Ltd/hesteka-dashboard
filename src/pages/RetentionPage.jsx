import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { Download, Trash2, Activity, Clock, LogIn, LineChart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from "../utils/api";

const RetentionCard = React.memo(({ label, value, color, icon: Icon }) => (
  <div className="bg-white rounded-2xl p-5 border border-[#e8ddd0] flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
    <div className={`absolute left-0 top-0 w-1.5 h-full ${color}`}></div>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-black text-[#9a8a7a] tracking-widest uppercase mb-1">{label}</p>
        <p className="text-3xl font-black text-[#3a2a1a] leading-none">{value}</p>
      </div>
      <div className={`p-2 rounded-xl ${color.replace('bg-', 'bg-').replace('600', '100')} ${color.replace('bg-', 'text-')}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
));

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#3a2a1a] text-white p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-green-400">Installs: {payload[0]?.value || 0}</p>
        <p className="text-sm font-black text-red-400">Uninstalls: {payload[1]?.value || 0}</p>
      </div>
    );
  }
  return null;
};

const RetentionCardSkeleton = () => (
  <div className="bg-white rounded-2xl p-5 border border-[#e8ddd0] flex justify-between items-start animate-pulse h-[94px]">
    <div className="flex flex-col gap-2 w-1/2">
      <div className="w-20 h-3 bg-gray-200 rounded"></div>
      <div className="w-24 h-8 bg-gray-100 rounded"></div>
    </div>
    <div className="w-9 h-9 bg-gray-200 rounded-xl"></div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-2xl border border-[#e8ddd0] p-4 md:p-6 shadow-sm mt-4 animate-pulse h-[400px]">
    <div className="flex items-center gap-2 mb-6">
      <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
      <div className="w-48 h-4 bg-gray-200 rounded"></div>
    </div>
    <div className="w-full h-[300px] bg-gray-50 rounded-xl"></div>
  </div>
);

export default function RetentionPage() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRetention = async () => {
      try {
        const res = await api.get("/app-analytics/admin/retention");
        if (res.data.status === "ok") {
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch retention stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRetention();
  }, []);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-4 flex flex-col gap-6 bg-[#fcfaf7]/50 min-h-screen">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <RetentionCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  const chartData = data?.chartData || [];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-6 bg-[#fcfaf7]/50 min-h-screen">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <RetentionCard 
          label={t.downloadsLabel || "Downloads"} 
          value={data?.downloads?.toLocaleString() || 0} 
          color="bg-blue-600" 
          icon={Download}
        />
        <RetentionCard 
          label={t.uninstallsLabel || "Uninstalls"} 
          value={data?.uninstalls?.toLocaleString() || 0} 
          color="bg-red-600" 
          icon={Trash2}
        />
        <RetentionCard 
          label={t.sessionsMonthLabel || "Sessions/Month"} 
          value={data?.sessionsMonth?.toLocaleString() || 0} 
          color="bg-green-600" 
          icon={Activity}
        />
        <RetentionCard 
          label={t.retentionLabel || "Retention"} 
          value={`${data?.retention || 0}%`} 
          color="bg-purple-600" 
          icon={LineChart}
        />
        <RetentionCard 
          label={t.avgDurationLabel || "Avg Duration"} 
          value={data?.avgDuration || "0m00s"} 
          color="bg-orange-600" 
          icon={Clock}
        />
        <RetentionCard 
          label={t.conversionLabel || "Conversion"} 
          value={`${data?.conversion || 0}%`} 
          color="bg-pink-600" 
          icon={LogIn}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#e8ddd0] p-4 md:p-6 shadow-sm mt-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 rounded-lg bg-[#8B6914]/10 text-[#8B6914]">
            <LineChart size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#3a2a1a] uppercase tracking-widest">{t.installUninstallTrend || "Installs & Uninstalls Trend"}</h3>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInstalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUninstalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ddd0" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9a8a7a', fontSize: 10, fontWeight: 700 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9a8a7a', fontSize: 10, fontWeight: 700 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="installs" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorInstalls)" 
              />
              <Area 
                type="monotone" 
                dataKey="uninstalls" 
                stroke="#dc2626" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorUninstalls)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
