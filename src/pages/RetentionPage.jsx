import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { Download, Trash2, Activity, Clock, LogIn, LineChart, Smartphone } from "lucide-react";
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
  const [timeframe, setTimeframe] = useState("monthly");
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data.status === "ok") {
          setDevMode(res.data.data.devMode || false);
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchRetention = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/app-analytics/admin/retention?timeframe=${timeframe}`);
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
  }, [timeframe]);

  if (loading) {
    return (
      <div className="px-4 md:px-6 py-4 flex flex-col gap-6 bg-[#fcfaf7]/50 min-h-screen">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <RetentionCardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  const chartData = data?.chartData || [];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-6 bg-[#fcfaf7]/50 min-h-screen">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <RetentionCard 
          label={t.uniqueDevices || "Unique Devices"} 
          value={data?.uniqueDevices?.toLocaleString() || 0} 
          color="bg-teal-600" 
          icon={Smartphone}
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#e8ddd0] p-4 md:p-6 shadow-sm mt-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#8B6914]/10 text-[#8B6914]">
              <LineChart size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#3a2a1a] uppercase tracking-widest">{t.installUninstallTrend || "Installs & Uninstalls Trend"}</h3>
            </div>
          </div>
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-[#fcfaf7] border-2 border-[#e8ddd0] text-[#3a2a1a] text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2.5 outline-none focus:border-[#8B6914] transition-all cursor-pointer shadow-sm hover:bg-white hover:shadow"
          >
            <option value="weekly">{t.weekly || "Weekly"}</option>
            <option value="monthly">{t.monthly || "Monthly"}</option>
            <option value="yearly">{t.yearly || "Yearly"}</option>
            <option value="lifetime">{t.lifetime || "Lifetime"}</option>
          </select>
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

      {devMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <div className="bg-white rounded-2xl border border-[#e8ddd0] p-4 md:p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#3a2a1a] uppercase tracking-widest mb-4">OS Breakdown (Installs)</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center bg-[#fcfaf7] p-3 rounded-xl border border-[#e8ddd0]"><span className="text-sm font-bold text-[#5a4a3a]">Android</span><span className="text-sm font-black text-[#3a2a1a]">{data?.osBreakdown?.android || 0}</span></div>
              <div className="flex justify-between items-center bg-[#fcfaf7] p-3 rounded-xl border border-[#e8ddd0]"><span className="text-sm font-bold text-[#5a4a3a]">iOS</span><span className="text-sm font-black text-[#3a2a1a]">{data?.osBreakdown?.ios || 0}</span></div>
              <div className="flex justify-between items-center bg-[#fcfaf7] p-3 rounded-xl border border-[#e8ddd0]"><span className="text-sm font-bold text-[#5a4a3a]">Web</span><span className="text-sm font-black text-[#3a2a1a]">{data?.osBreakdown?.web || 0}</span></div>
              <div className="flex justify-between items-center bg-[#fcfaf7] p-3 rounded-xl border border-[#e8ddd0]"><span className="text-sm font-bold text-[#5a4a3a]">Unknown</span><span className="text-sm font-black text-[#3a2a1a]">{data?.osBreakdown?.unknown || 0}</span></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#e8ddd0] p-4 md:p-6 shadow-sm">
            <h3 className="text-sm font-black text-[#3a2a1a] uppercase tracking-widest mb-4">Metadata & Device Logs</h3>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {data?.metadataSamples && data.metadataSamples.length > 0 ? (
                data.metadataSamples.map((sample, idx) => (
                  <div key={idx} className="bg-[#fcfaf7] p-3 rounded-xl border border-[#e8ddd0]">
                    <div className="flex justify-between mb-2 pb-2 border-b border-[#e8ddd0]/50">
                      <span className="text-[10px] font-bold text-[#8B6914] uppercase">{sample.eventType} • {sample.os}</span>
                      <span className="text-[10px] font-bold text-[#9a8a7a]">{new Date(sample.createdAt).toLocaleString()}</span>
                    </div>
                    <pre className="text-[9px] text-[#5a4a3a] overflow-x-auto whitespace-pre-wrap font-mono bg-white p-2 rounded border border-[#e8ddd0]">
                      {JSON.stringify(sample.metadata, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="bg-[#fcfaf7] p-4 rounded-xl border border-[#e8ddd0] text-center">
                  <p className="text-sm font-bold text-[#9a8a7a]">No metadata events found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
