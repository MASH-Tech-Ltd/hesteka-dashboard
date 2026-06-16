import React, { useEffect, useState } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import { toast } from "react-toastify";
import { MapPin, Target, Package, Ruler, Lightbulb, Settings, Save } from "lucide-react";

// Helper to format ISO date to datetime-local input format
const formatDateForInput = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  return date.toISOString().slice(0, 16);
};

// Helper to convert datetime-local value to ISO date
const formatInputToISO = (inputValue) => {
  if (!inputValue) return null;
  return new Date(inputValue).toISOString();
};

const ScaleItem = React.memo(({ icon, label, points, onChange, t, loading, isVariable, variableText, subtitleText }) => (
  <div className="flex items-center justify-between p-4 border-b border-[#f0e8d8] last:border-0 hover:bg-[#fcfaf7] transition-all rounded-lg group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-[#f5f0e8] flex items-center justify-center text-xl shadow-inner group-hover:bg-white transition-colors">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-[#3a2a1a] uppercase tracking-wider">{label}</span>
        <span className="text-[9px] text-[#9a8a7a] italic">{subtitleText || t.currentValuePerAction || "Current value per action"}</span>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {isVariable ? (
        <div className="bg-[#f5f0e8] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs font-bold text-[#8B6914] text-center">
          {variableText || "Variable Points"}
        </div>
      ) : (
        <div className="relative">
          <input
            type="number"
            value={points}
            onChange={(e) => onChange(parseInt(e.target.value) || 0)}
            className="bg-white border border-[#e8ddd0] rounded-xl px-4 py-2 text-sm font-bold text-[#3a2a1a] w-24 text-center outline-none focus:ring-2 focus:ring-[#8B6914]/20 focus:border-[#8B6914] transition-all"
          />
          <div className="absolute -top-2 -right-2 bg-[#8B6914] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">PTS</div>
        </div>
      )}
    </div>
  </div>
));

export default function PointsPage() {
  const { t } = useLang();
  const [config, setConfig] = useState({
    pointsPerReport: 10,
    pointsPerMission: 0,
    pointsPerDonation: 15,
    validityMonths: 12,
    monthlyCeiling: 500,
    isDoublePointsActive: false,
    promotionStartTime: null,
    promotionEndTime: null,
    isPointsOnDonationsActive: true,
    isValidityDurationActive: true,
    isMonthlyCeilingActive: true
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [configRes, statsRes] = await Promise.all([
          api.get("/points/admin/config"),
          api.get("/points/admin/stats"),
        ]);
        
        if (configRes.data.status === "ok" || configRes.data.success) {
          const fetchedConfig = configRes.data.data;
          
          // Check if promotion has expired and auto-disable
          if (fetchedConfig.isDoublePointsActive && fetchedConfig.promotionEndTime) {
            const endTime = new Date(fetchedConfig.promotionEndTime);
            if (endTime <= new Date()) {
              fetchedConfig.isDoublePointsActive = false;
            }
          }
          
          setConfig(fetchedConfig);
        }
        if (statsRes.data.status === "ok" || statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch points data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleUpdateConfig = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/points/admin/config", config);
      if (res.data.status === "ok" || res.data.success) {
        toast.success(t.configUpdateSuccess || "Configuration updated successfully!");
      }
    } catch (err) {
      console.error("Failed to update config", err);
      toast.error(t.configUpdateError || "Error during update.");
    } finally {
      setSaving(false);
    }
  };

  const scale = [
    { key: "pointsPerReport", icon: <MapPin className="w-5 h-5 text-[#8B6914]" />, label: t.animalReports || "ANIMAL REPORTS", points: config?.pointsPerReport || 0 },
    { key: "pointsPerMission", icon: <Target className="w-5 h-5 text-[#8B6914]" />, label: t.localMissionsLabel || "LOCAL MISSIONS", isVariable: true, variableText: t.variable || "Variable", subtitleText: t.dependsOnMission || "Depends on specific mission" },
    { key: "pointsPerDonation", icon: <Package className="w-5 h-5 text-[#8B6914]" />, label: t.donationDeposits || "DONATION DEPOSITS", points: config?.pointsPerDonation || 0 },
  ];

  const rules = [
    { 
      key: "isValidityDurationActive", 
      label: t.validityDuration && t.validityDuration.includes(config.validityMonths) 
        ? t.validityDuration 
        : `${t.validityDuration || "Validity duration"} - ${config.validityMonths} months`, 
      active: config.isValidityDurationActive 
    },
    { 
      key: "isMonthlyCeilingActive", 
      label: t.monthlyCeiling && t.monthlyCeiling.includes(config.monthlyCeiling) 
        ? t.monthlyCeiling 
        : `${t.monthlyCeiling || "Monthly ceiling"} - ${config.monthlyCeiling} pts`, 
      active: config.isMonthlyCeilingActive 
    },
    { key: "isDoublePointsActive", label: t.doublePoints || "Double points active", active: config.isDoublePointsActive },
    { key: "isPointsOnDonationsActive", label: t.pointsOnDonations || "Points on donations", active: config.isPointsOnDonationsActive },
  ];

  const toggleRule = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="px-6 py-4 flex flex-col gap-4">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          loading={loading} 
          label={t.distributedLabel || "DISTRIBUTED"} 
          value={{ text: stats?.distributed?.total?.toLocaleString() || "0", color: "text-green-600" }} 
          sub={stats?.distributed?.thisMonth ? `+${stats.distributed.thisMonth.toLocaleString()} ${t.thisMonth || "This month"}` : t.thisMonth || "This month"} 
          subType="up" 
          color="bg-green-500"
        />
        <StatCard 
          loading={loading} 
          label={t.pendingLabel || "PENDING"} 
          value={{ text: stats?.pending?.toLocaleString() || "0", color: "text-orange-500" }} 
          sub={t.pendingLabel || "PENDING"} 
          subType="wait" 
          color="bg-orange-500"
        />
        <StatCard 
          loading={loading} 
          label={t.exchangedLabel || "EXCHANGED"} 
          value={{ text: stats?.exchanged?.total?.toLocaleString() || "0", color: "text-blue-600" }} 
          sub={t.converted || "Converted"} 
          subType="up" 
          color="bg-blue-500"
        />
        <StatCard 
          loading={loading} 
          label={t.expiredLabel || "EXPIRED"} 
          value={{ text: stats?.expired?.toLocaleString() || "0", color: "text-red-600" }} 
          sub={t.unused || "Unused"} 
          subType="down" 
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scale Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8ddd0] flex flex-col overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#e8ddd0] bg-[#fcfaf7] flex items-center justify-between">
            <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2 uppercase tracking-tight">
              <Ruler className="w-4 h-4 text-[#8B6914]" /> {t.pointsScale || "POINTS SCALE"}
            </h3>
            <div className="bg-[#8B6914]/10 text-[#8B6914] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">{t.globalConfig || "GLOBAL CONFIGURATION"}</div>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {scale.map((item, i) => (
              <ScaleItem 
                key={i} 
                {...item} 
                t={t} 
                loading={loading}
                onChange={(val) => setConfig({ ...config, [item.key]: val })}
              />
            ))}
          </div>
          <div className="p-6 mt-auto bg-[#fcfaf7] border-t border-[#e8ddd0]">
             <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 items-start">
              <Lightbulb className="w-5 h-5 text-orange-600 shrink-0" />
              <p className="text-[10px] text-orange-800 font-bold leading-relaxed">
                 {t.configUpdateMsg || "Changes to the scale will be applied immediately for all future user actions. Existing points will not be affected."}
              </p>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Usage Rules Card */}
          <div className="bg-white rounded-2xl border border-[#e8ddd0] flex flex-col p-6 gap-6 shadow-sm">
            <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2 uppercase tracking-tight">
              <Settings className="w-4 h-4 text-[#8B6914]" /> {t.usageRules || "USAGE RULES"}
            </h3>
            <div className="flex flex-col gap-6">
              {rules.map((rule, i) => (
                <div key={i} className="flex items-center justify-between group">
                  <span className="text-xs font-bold text-[#3a2a1a] transition-colors">{rule.label}</span>
                  <button 
                    onClick={() => toggleRule(rule.key)}
                    className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${rule.active ? "bg-[#8B6914]" : "bg-gray-200"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${rule.active ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-[#9a8a7a] font-bold italic mt-2 uppercase tracking-wider">
              {t.clickToEnable || "Click to enable/disable a rule (simulation)"}
            </p>
          </div>

          {/* Point Multiplier Promotion */}
          <div className="bg-linear-to-br from-[#3a2a1a] to-[#2a1a0a] rounded-2xl p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
             <div className="bg-[#8B6914] text-[8px] font-black px-2 py-0.5 rounded-full w-fit uppercase tracking-widest border border-white/20">Promotion</div>
             <h4 className="text-lg font-black leading-tight tracking-tight">{t.boosterTitle || "Boost donations this weekend?"}</h4>
             <p className="text-[10px] text-white/60 font-bold leading-relaxed">{t.boosterDesc || "Enable a x2 multiplier on all physical donation deposits to encourage the SPA."}</p>
             
             {/* Promotion Time Inputs */}
             <div className="flex flex-col gap-2 mt-2 bg-white/10 p-3 rounded-xl">
               <div className="flex flex-col gap-1">
                 <label className="text-[9px] font-bold text-white/80">Start Time</label>
                 <input
                   type="datetime-local"
                   value={formatDateForInput(config.promotionStartTime)}
                   onChange={(e) => setConfig(prev => ({ ...prev, promotionStartTime: formatInputToISO(e.target.value) }))}
                   className="bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:border-transparent"
                 />
               </div>
               <div className="flex flex-col gap-1">
                 <label className="text-[9px] font-bold text-white/80">End Time</label>
                 <input
                   type="datetime-local"
                   value={formatDateForInput(config.promotionEndTime)}
                   onChange={(e) => setConfig(prev => ({ ...prev, promotionEndTime: formatInputToISO(e.target.value) }))}
                   className="bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:border-transparent"
                 />
               </div>
             </div>

             {/* Show Promotion Status */}
             {config.isDoublePointsActive && (
               <div className="bg-green-500/20 border border-green-400 text-green-200 text-[9px] font-bold p-2 rounded-lg">
                 ✓ 2x Multiplier Active
                 {config.promotionEndTime && (
                   <div className="text-[8px] mt-1">
                     Until: {new Date(config.promotionEndTime).toLocaleString()}
                   </div>
                 )}
               </div>
             )}
             
             <div className="flex gap-2">
               <button 
                onClick={() => setConfig(prev => ({ 
                  ...prev, 
                  isDoublePointsActive: true,
                  promotionStartTime: new Date().toISOString()
                }))}
                className="flex-1 mt-2 bg-white text-[#3a2a1a] text-[10px] font-black py-3 rounded-xl hover:bg-[#8B6914] hover:text-white transition-all active:scale-95 shadow-lg uppercase tracking-wider"
               >
                  {t.activateNow || "ACTIVATE NOW"}
               </button>
               {config.isDoublePointsActive && (
                 <button 
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    isDoublePointsActive: false,
                    promotionEndTime: new Date().toISOString()
                  }))}
                  className="flex-1 mt-2 bg-red-600/80 text-white text-[10px] font-black py-3 rounded-xl hover:bg-red-600 transition-all active:scale-95 shadow-lg uppercase tracking-wider"
                 >
                    STOP NOW
                 </button>
               )}
             </div>
          </div>
        </div>
      </div>
       {/* Save button */}
      <div className="flex justify-center">
        <button 
          onClick={handleUpdateConfig}
          disabled={saving || loading}
          className="bg-[#3a2a1a] text-white text-[11px] font-black px-6 py-2.5 rounded-xl hover:bg-[#2a1a0a] transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t.saveBtn || "Save"}
        </button>
      </div>
    </div>
  );
}
