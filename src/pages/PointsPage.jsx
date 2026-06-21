import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import Pagination from "../components/common/Pagination";
import api from "../utils/api";
import { toast } from "react-toastify";
import { MapPin, Target, Package, Ruler, Lightbulb, Settings, Save, Search, User, History } from "lucide-react";

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

  // Custom points state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [customPoints, setCustomPoints] = useState("");
  const [customPointsNote, setCustomPointsNote] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // History state
  const [historyParams, setHistoryParams] = useState({ 
    page: 1, limit: 10, search: "", type: "all", source: "all", sort: "descending", sortBy: "date", from: "", to: "" 
  });
  const [historyData, setHistoryData] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/points/admin/history", { params: historyParams });
      if (res.data.status === "ok" || res.data.success) {
        setHistoryData(res.data.data.transactions);
        setHistoryMeta(res.data.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyParams]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Auto-search users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (userSearchQuery.trim().length >= 2 && !selectedUser) {
        setIsSearching(true);
        try {
          const res = await api.get(`/user/get-all-user?search=${userSearchQuery}&limit=5`);
          if (res.data.status === "ok") {
            setSearchResults(res.data.data);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [userSearchQuery, selectedUser]);

  const handleAssignCustomPoints = async () => {
    if (!selectedUser || !customPoints || parseInt(customPoints) <= 0) {
      toast.error(t.fillAllFields || "Please fill all fields properly");
      return;
    }
    setIsAssigning(true);
    try {
      const res = await api.post("/points/admin/assign-custom-points", {
        userId: selectedUser._id,
        points: parseInt(customPoints),
        note: customPointsNote || undefined
      });
      if (res.data.status === "ok" || res.data.success) {
        toast.success(t.pointsAssignedSuccess || "Points successfully assigned!");
        setSelectedUser(null);
        setUserSearchQuery("");
        setCustomPoints("");
        setCustomPointsNote("");
        const statsRes = await api.get("/points/admin/stats");
        if (statsRes.data.status === "ok" || statsRes.data.success) {
          setStats(statsRes.data.data);
        }
        fetchHistory(); // Refresh history table
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.pointsAssignedError || "Failed to assign points");
    } finally {
      setIsAssigning(false);
    }
  };

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

  const historyColumns = [
    {
      header: t.userLabel || "USER",
      accessor: "user",
      cell: (tx) => {
        const user = tx.user;
        if (!user) return <span className="text-[#9a8a7a]">N/A</span>;
        return (
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[#8B6914] font-bold text-xs shrink-0 border border-[#e8ddd0] overflow-hidden">
               {user.profileImage?.secure_url ? (
                 <img src={user.profileImage.secure_url} alt="" className="w-full h-full object-cover" />
               ) : (
                 user.firstName?.charAt(0).toUpperCase() || "U"
               )}
             </div>
             <div className="flex flex-col">
               <span className="font-bold text-[#3a2a1a] text-xs">{user.firstName} {user.lastName}</span>
               <span className="text-[10px] text-[#9a8a7a] truncate max-w-[150px]">{user.email}</span>
             </div>
          </div>
        );
      }
    },
    {
      header: t.points || "POINTS",
      accessor: "points",
      cell: (tx) => (
        <span className={`font-black text-sm ${tx.points > 0 ? "text-green-600" : "text-red-600"}`}>
          {tx.points > 0 ? `+${tx.points}` : tx.points}
        </span>
      )
    },
    {
      header: t.type || "TYPE",
      accessor: "type",
      cell: (tx) => (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.type === 'EARN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {t[tx.type] || tx.type}
        </span>
      )
    },
    {
      header: t.source || "SOURCE",
      accessor: "source",
      cell: (tx) => {
         // Convert ADMIN_CUSTOM to srcAdminCustom
         const translationKey = `src${tx.source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')}`;
         return (
           <span className="text-xs font-bold text-[#3a2a1a] uppercase tracking-wide">
             {t[translationKey] || tx.source.replace(/_/g, " ")}
           </span>
         );
      }
    },
    {
      header: t.note || "NOTE",
      accessor: "note",
      cell: (tx) => <span className="text-xs text-[#5a4a3a] max-w-[200px] truncate block" title={tx.note}>{tx.note || "—"}</span>
    },
    {
      header: t.dateLabel || "DATE",
      accessor: "createdAt",
      cell: (tx) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#3a2a1a]">{new Date(tx.createdAt).toLocaleDateString()}</span>
          <span className="text-[9px] text-[#9a8a7a] font-medium">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    }
  ];

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
          label={t.availablePointsLabel || "AVAILABLE"} 
          value={{ text: stats?.pending?.toLocaleString() || "0", color: "text-orange-500" }} 
          sub={t.usablePointsSub || "Currently usable"} 
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
        <div className="bg-white rounded-2xl border border-[#e8ddd0] flex flex-col overflow-hidden shadow-sm h-full">
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
          <div className="p-6 mt-auto bg-[#fcfaf7] border-t border-[#e8ddd0] flex flex-row gap-4 items-stretch">
             <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex gap-3 items-center flex-1">
              <Lightbulb className="w-5 h-5 text-orange-600 shrink-0" />
              <p className="text-[10px] text-orange-800 font-bold leading-relaxed m-0">
                 {t.configUpdateMsg || "Changes to the scale will be applied immediately for all future user actions. Existing points will not be affected."}
              </p>
             </div>
             
             <button 
               onClick={handleUpdateConfig}
               disabled={saving || loading}
               className="bg-[#3a2a1a] text-white text-[11px] font-black px-8 py-0 rounded-xl hover:bg-[#2a1a0a] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 shadow-md shrink-0 whitespace-nowrap"
             >
               {saving ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               ) : (
                 <Save className="w-4 h-4" />
               )}
               {t.saveBtn || "Save Configuration"}
             </button>
          </div>
        </div>

        {/* Usage Rules Card */}
        <div className="bg-white rounded-2xl border border-[#e8ddd0] flex flex-col p-6 gap-6 shadow-sm h-full">
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

        {/* Assign Custom Points Card */}
        <div className="bg-linear-to-br from-[#3a2a1a] to-[#2a1a0a] rounded-2xl p-6 text-white shadow-xl flex flex-col gap-3 relative overflow-hidden group h-full">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
             <div className="bg-[#8B6914] text-[8px] font-black px-2 py-0.5 rounded-full w-fit uppercase tracking-widest border border-white/20">{t.customPoints || "Custom Points"}</div>
             <h4 className="text-lg font-black leading-tight tracking-tight">{t.giveCustomPointsTitle || "Assign Custom Points"}</h4>
             <p className="text-[10px] text-white/60 font-bold leading-relaxed">{t.giveCustomPointsDesc || "Search for a user and directly assign points to their balance."}</p>
             
             <div className="flex flex-col gap-2 mt-2 bg-white/10 p-3 rounded-xl relative z-10">
               {/* User Search */}
               <div className="flex flex-col gap-1 relative">
                 <label className="text-[9px] font-bold text-white/80">{t.searchUser || "Search User"}</label>
                 <div className="relative">
                   <input
                     type="text"
                     name={`search_user_${Math.random()}`}
                     autoComplete="new-password"
                     spellCheck="false"
                     value={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})` : userSearchQuery}
                     onChange={(e) => {
                       if (selectedUser) setSelectedUser(null);
                       setUserSearchQuery(e.target.value);
                     }}
                     placeholder={t.searchUserPlaceholder || "Type name or email..."}
                     className="w-full bg-white/20 border border-white/30 rounded-lg pl-8 pr-2 py-2 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:border-transparent transition-all"
                   />
                   <Search className="w-4 h-4 text-white/50 absolute left-2 top-2.5" />
                 </div>

                 {/* Search Results Dropdown */}
                 {!selectedUser && searchResults.length > 0 && (
                   <div className="absolute top-full left-0 w-full mt-1 bg-white rounded-lg shadow-xl border border-[#e8ddd0] max-h-40 overflow-y-auto z-50">
                     {searchResults.map((user) => (
                       <div 
                         key={user._id} 
                         onClick={() => {
                           setSelectedUser(user);
                           setSearchResults([]);
                           setUserSearchQuery("");
                         }}
                         className="px-3 py-2 border-b border-[#f0e8d8] last:border-0 hover:bg-[#fcfaf7] cursor-pointer flex items-center gap-2"
                       >
                         <div className="w-6 h-6 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                           {user?.profileImage?.secure_url ? (
                             <img className="w-full h-full rounded-full object-cover" src={user.profileImage.secure_url} alt="" />
                           ) : (
                             user.firstName?.charAt(0).toUpperCase() || "U"
                           )}
                         </div>
                         <div className="flex flex-col overflow-hidden">
                           <span className="text-xs font-bold text-[#3a2a1a] truncate"> {user.firstName} {user.lastName}</span>
                           <span className="text-[10px] text-[#9a8a7a] truncate">{user.email}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>

               {/* Points & Note */}
               <div className="flex gap-2 mt-1">
                 <div className="flex flex-col gap-1 w-1/3">
                   <label className="text-[9px] font-bold text-white/80">{t.points || "Points"}</label>
                   <input
                     type="number"
                     value={customPoints}
                     onChange={(e) => setCustomPoints(e.target.value)}
                     placeholder="e.g. 100"
                     className="bg-white/20 border border-white/30 rounded-lg px-2 py-2 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:border-transparent"
                   />
                 </div>
                 <div className="flex flex-col gap-1 flex-1">
                   <label className="text-[9px] font-bold text-white/80">{t.note || "Note (Optional)"}</label>
                   <input
                     type="text"
                     value={customPointsNote}
                     onChange={(e) => setCustomPointsNote(e.target.value)}
                     placeholder={t.notePlaceholder || "Reason for points..."}
                     className="bg-white/20 border border-white/30 rounded-lg px-2 py-2 text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#8B6914] focus:border-transparent"
                   />
                 </div>
               </div>
             </div>

             <button 
              onClick={handleAssignCustomPoints}
              disabled={isAssigning || !selectedUser || !customPoints}
              className="mt-2 bg-[#8B6914] text-white text-[10px] font-black py-3 rounded-xl hover:bg-[#6a5010] transition-all active:scale-95 shadow-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
             >
                {isAssigning ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <User className="w-3 h-3" />
                )}
                {t.assignPoints || "ASSIGN POINTS"}
             </button>
        </div>
      </div>

      {/* Points History Section */}
      <div className="bg-white rounded-2xl border border-[#e8ddd0] flex flex-col overflow-hidden shadow-sm mt-4">
        <div className="p-5 border-b border-[#e8ddd0] bg-[#fcfaf7] flex items-center justify-between">
          <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2 uppercase tracking-tight">
            <History className="w-4 h-4 text-[#8B6914]" /> {t.pointsHistory || "POINTS HISTORY"}
          </h3>
        </div>

        <FilterBar
          onSearch={(val) => setHistoryParams((p) => (p.search === val ? p : { ...p, search: val, page: 1 }))}
          onFilterChange={(name, val) => setHistoryParams((p) => (p[name] === val ? p : { ...p, [name]: val, page: 1 }))}
          onSortChange={(sortBy, sort) => setHistoryParams((p) => (p.sortBy === sortBy && p.sort === sort ? p : { ...p, sortBy, sort, page: 1 }))}
          related={true}
          filters={[
            {
              name: "type",
              label: t.allTypes || "All Types",
              value: historyParams.type || 'all',
              options: [
                { label: t.earn || "Earned", value: "EARN" },
                { label: t.redeem || "Redeemed", value: "REDEEM" },
              ]
            },
            {
              name: "source",
              label: t.allSources || "All Sources",
              value: historyParams.source || 'all',
              options: [
                { label: t.srcAdminCustom || "Admin Custom", value: "ADMIN_CUSTOM" },
                { label: t.srcOnlineDonation || "Online Donation", value: "ONLINE_DONATION" },
                { label: t.srcPhysicalDonation || "Physical Donation", value: "PHYSICAL_DONATION" },
                { label: t.srcLocalMission || "Local Mission", value: "LOCAL_MISSION" },
                { label: t.srcAnimalReport || "Animal Report", value: "ANIMAL_REPORT" },
                { label: t.srcRedeem || "Redeem", value: "REDEEM" },
              ]
            }
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.pointsDesc || "Points (High-Low)", value: "points:descending" },
            { label: t.pointsAsc || "Points (Low-High)", value: "points:ascending" },
          ]}
        />

        <DataTable
          columns={historyColumns}
          data={historyData}
          loading={historyLoading}
        />

        <div className="bg-[#fcfaf7] border-t border-[#e8ddd0]">
          <Pagination
            meta={historyMeta}
            onPageChange={(page) => setHistoryParams((prev) => ({ ...prev, page }))}
          />
        </div>
      </div>

    </div>
  );
}
