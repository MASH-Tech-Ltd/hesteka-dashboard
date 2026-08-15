import React, { useState, useEffect, useMemo } from "react";
import { useLang } from "../context/LanguageContext";
import { BarChart3, Globe, TrendingUp, TrendingDown, Clock, Activity, Search, MapPin } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from "../utils/api";

const AnalyticsCard = React.memo(({ label, value, trend, color, icon: Icon }) => (
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
    <div className="mt-4">
      {trend !== undefined ? (
        <div className={`text-[11px] font-bold flex items-center gap-1.5 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`p-0.5 rounded-full ${trend >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </div>
          <span>{Math.abs(trend)}% {trend >= 0 ? 'increase' : 'decrease'}</span>
        </div>
      ) : (
        <div className="text-[11px] font-bold text-[#9a8a7a] flex items-center gap-1.5">
          <div className="p-0.5 rounded-full bg-gray-100">
            <Activity className="w-3 h-3" />
          </div>
          <span>Stable performance</span>
        </div>
      )}
    </div>
  </div>
));

const ZoneRow = React.memo(({ label, percentage, color }) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-center justify-between text-[11px] font-bold text-[#3a2a1a]">
      <span className="truncate pr-2">{label}</span>
      <span className="text-[#9a8a7a]">{percentage}%</span>
    </div>
    <div className="w-full h-2 bg-[#fcfaf7] rounded-full overflow-hidden border border-[#e8ddd0]/50">
      <div 
        className={`h-full ${color} transition-all duration-1000 ease-out rounded-full shadow-sm`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  </div>
));

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#3a2a1a] text-white p-3 rounded-xl border border-white/20 shadow-2xl backdrop-blur-md">
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black">{payload[0].value} Reports</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [locationStats, setLocationStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [res, statsRes] = await Promise.all([
          api.get("/admin/analytics"),
          api.get("/location/stats").catch(() => ({ data: { data: [] } }))
        ]);
        if (res.data.status === "ok") {
          setData(res.data.data);
        }
        if (statsRes.data?.data) {
          setLocationStats(statsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const apiCounts = useMemo(() => {
    const counts = { map_load: 0, autocomplete: 0, details: 0, geocode: 0 };
    if (Array.isArray(locationStats)) {
      locationStats.forEach(stat => {
        if (stat && stat.apiType && counts[stat.apiType] !== undefined) {
          counts[stat.apiType] += (stat.count || 0);
        }
      });
    }
    return counts;
  }, [locationStats]);

  const sourceBreakdown = useMemo(() => {
    const sources = { admin_dashboard: 0, partner_dashboard: 0, mobile_app: 0 };
    if (Array.isArray(locationStats)) {
      locationStats.forEach(stat => {
        if (stat && stat.apiType === "map_load" && stat.source) {
          if (sources[stat.source] !== undefined) {
            sources[stat.source] += (stat.count || 0);
          }
        }
      });
    }
    return sources;
  }, [locationStats]);

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-[#8B6914]/20 border-t-[#8B6914] rounded-full animate-spin"></div>
        <p className="text-[#9a8a7a] font-bold animate-pulse uppercase tracking-widest text-xs">{t.loadingLabel || "Loading performance data..."}</p>
      </div>
    );
  }

  const overview = data?.overview || {
    sessionsMonth: { value: 0, trend: 0 },
    retention: { value: 0, trend: 0 },
    avgDuration: "0m00s",
    conversion: 0
  };

  const zones = data?.activeZones || [];
  const chartData = data?.reportsPerMonth || [];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-6 bg-[#fcfaf7]/50 min-h-screen">
      
      {/* Location API Usage Bar */}
      <div>
        <h3 className="text-xs font-black text-[#3a2a1a] uppercase tracking-widest mb-4">Location API Usage (Free OSM & Map Loads)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard 
            label="Map Views"
            value={apiCounts.map_load.toLocaleString()} 
            color="bg-indigo-600" 
            icon={Globe}
          />
          <AnalyticsCard 
            label="Autocomplete (OSM)"
            value={apiCounts.autocomplete.toLocaleString()} 
            color="bg-teal-600" 
            icon={Search}
          />
          <AnalyticsCard 
            label="Place Details (OSM)"
            value={apiCounts.details.toLocaleString()} 
            color="bg-rose-600" 
            icon={MapPin}
          />
          <AnalyticsCard 
            label="Geocode (OSM)"
            value={apiCounts.geocode.toLocaleString()} 
            color="bg-cyan-600" 
            icon={MapPin}
          />
        </div>
        
        {/* Device Map Load Breakdown */}
        <div className="mt-4 flex flex-wrap gap-4 items-center">
           <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-widest mr-2">Map Views By Device:</span>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#e8ddd0] shadow-sm transition hover:-translate-y-0.5">
             <span className="text-xs font-bold text-[#3a2a1a]">🖥️ Admin</span>
             <div className="w-1 h-4 bg-indigo-200 rounded-full"></div>
             <span className="text-sm font-black text-indigo-600">{sourceBreakdown.admin_dashboard.toLocaleString()}</span>
           </div>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#e8ddd0] shadow-sm transition hover:-translate-y-0.5">
             <span className="text-xs font-bold text-[#3a2a1a]">🏢 Partner</span>
             <div className="w-1 h-4 bg-teal-200 rounded-full"></div>
             <span className="text-sm font-black text-teal-600">{sourceBreakdown.partner_dashboard.toLocaleString()}</span>
           </div>
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[#e8ddd0] shadow-sm transition hover:-translate-y-0.5">
             <span className="text-xs font-bold text-[#3a2a1a]">📱 App</span>
             <div className="w-1 h-4 bg-rose-200 rounded-full"></div>
             <span className="text-sm font-black text-rose-600">{sourceBreakdown.mobile_app.toLocaleString()}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Reports Chart Card */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#e8ddd0] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
              <div className="p-2 bg-[#8B6914]/10 rounded-lg">
                <BarChart3 className="w-4 h-4 text-[#8B6914]" />
              </div>
              {t.reportsMonth}
            </h3>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#9a8a7a]">
                <div className="w-2 h-2 rounded-full bg-[#8B6914]"></div> Active Reports
              </span>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B6914" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B6914" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9a8a7a', fontSize: 10, fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9a8a7a', fontSize: 10, fontWeight: 'bold' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="reports" 
                  stroke="#8B6914" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorReports)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zones Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8ddd0] p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
              <div className="p-2 bg-[#8B6914]/10 rounded-lg">
                <Globe className="w-4 h-4 text-[#8B6914]" />
              </div>
              {t.activeZones}
            </h3>
          </div>
          <div className="flex flex-col gap-6">
            {zones.map((z, i) => (
              <ZoneRow 
                key={i} 
                label={t[`zone${i+1}`] || z.name} 
                percentage={z.percentage} 
                color={z.color} 
              />
            ))}
            {zones.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[#fcfaf7] rounded-full flex items-center justify-center mb-4">
                  <Globe className="w-8 h-8 text-[#e8ddd0]" />
                </div>
                <p className="text-xs font-bold text-[#9a8a7a] uppercase tracking-widest">{t.noDataFound || "No regional data yet"}</p>
              </div>
            )}
          </div>
          
          <div className="mt-auto pt-6 border-t border-[#f0f0f0]">
             <p className="text-[10px] text-[#9a8a7a] font-medium leading-relaxed italic">
               * Data updated in real-time based on geolocated animal reports submitted by the community.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
