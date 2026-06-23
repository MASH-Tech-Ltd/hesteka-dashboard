import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import { socket } from "../context/SocketContect";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import DataTable from "../components/common/DataTable";
import { Package, MapPin, Search, Trophy, BarChart3, AlertTriangle, X, Download } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import CRUDModal from "../components/common/CRUDModal";
import { toast } from "react-toastify";

const PendingDonation = React.memo(({ item, onAction, onEnlarge, pointsPerDonation, t }) => (
  <div className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl p-4 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-white border border-[#e8ddd0] flex items-center justify-center text-2xl overflow-hidden shrink-0">
            {item.photo?.secure_url ? (
              <img src={item.photo.secure_url} alt="Proof" className="w-full h-full object-cover" />
            ) : <Package className="w-6 h-6 text-[#9a8a7a]" />}
          </div>
          <div>
             <h4 className="text-sm font-bold text-[#3a2a1a]">
               {item.user?.firstName} {item.user?.lastName}
             </h4>
              <p className="text-[10px] text-[#9a8a7a]">
                {t.physicalDonationLabel} — {item.collectionPoint?.title || t.unknownPoint} — {new Date(item.createdAt).toLocaleDateString()}
              </p>
              <p className="text-[11px] font-bold text-green-600">{t.ptsToAttribute}</p>
           </div>
       </div>
        <span className="bg-orange-50 text-orange-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-orange-100 uppercase">{t.pending}</span>
     </div>
    
    <div className="bg-[#f5f0e8] rounded-lg p-3 text-[11px] text-[#5a4a3a] flex flex-col gap-1">
       <div><span className="font-bold">{t.declaredQuantity || "Quantity"}:</span> {item.quantity ?? item.amount}</div>
       <div><span className="font-bold">{t.category || "Category"}:</span> <span className="capitalize">{item.category}</span></div>
       {item.collectionPoint?.address && <div className="text-[10px] italic flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {item.collectionPoint.address}</div>}
    </div>

    <div className="flex gap-2">
       <button 
         onClick={() => item.photo?.secure_url && onEnlarge(item.photo.secure_url)}
         className="flex-1 bg-white border border-[#e8ddd0] text-[#3a2a1a] text-[10px] font-bold py-2 rounded-xl hover:bg-[#f5f0e8] transition-colors flex items-center justify-center gap-2"
       >
          <Search className="w-3.5 h-3.5" /> {t.enlargePhoto || "Enlarge photo"}
       </button>
       <button 
         onClick={() => onAction(item._id, 'validate')}
         className="flex-1 bg-green-100 text-green-600 text-[10px] font-bold py-2 rounded-xl hover:bg-green-200 transition-colors"
       >
          {t.validateBtn} +{pointsPerDonation || 15} pts
       </button>
       <button 
         onClick={() => onAction(item._id, 'reject')}
         className="flex-1 bg-red-50 text-red-600 text-[10px] font-bold py-2 rounded-xl hover:bg-red-100 transition-colors"
       >
          {t.refuseBtn}
       </button>
    </div>
  </div>
));

export default function ValidationDonationsPage() {
  const { t } = useLang();
  const [pending, setPending] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acceptedValues, setAcceptedValues] = useState({ categories: [], refusalReasons: [] });
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, proofId: null });
  const [modalLoading, setModalLoading] = useState(false);
  const [imageModal, setImageModal] = useState({ isOpen: false, url: null });
  const [trendPeriod, setTrendPeriod] = useState("monthly");

  const [allProofs, setAllProofs] = useState([]);
  const [allMeta, setAllMeta] = useState(null);
  const [queryParams, setQueryParams] = useState({ 
    page: 1, 
    limit: 10, 
    search: "", 
    status: ""
  });
  const [allLoading, setAllLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get(`/donation-proofs/stats?period=${trendPeriod}`);
      if (res.data.status === "ok") {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, [trendPeriod]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, valuesRes] = await Promise.all([
        api.get(`/donation-proofs/pending?page=${page}&limit=6`),
        api.get("/donation-proofs/get-accepted-values"),
      ]);
      
      if (pendingRes.data.status === "ok") {
        setPending(pendingRes.data.data || []);
        setMeta(pendingRes.data.meta);
      }
      if (valuesRes.data.status === "ok") {
        setAcceptedValues(valuesRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch donation data", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchAllProofs = useCallback(async () => {
    setAllLoading(true);
    try {
      const query = new URLSearchParams({
        page: queryParams.page,
        limit: queryParams.limit,
        search: queryParams.search,
        ...(queryParams.status && queryParams.status !== "all" ? { status: queryParams.status } : {})
      }).toString();
      
      const res = await api.get(`/donation-proofs/all?${query}`);
      if (res.data.status === "ok") {
        setAllProofs(res.data.data || []);
        setAllMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch all proofs", err);
    } finally {
      setAllLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchAllProofs();
  }, [fetchAllProofs]);

  useEffect(() => {
    socket.connect();
    socket.on("donation_validation_updated", () => {
      fetchData();
      fetchStats();
      fetchAllProofs();
    });
    socket.on("donation_proof_new", () => {
      fetchData();
      fetchStats();
      fetchAllProofs();
    });
    return () => {
      socket.off("donation_validation_updated");
      socket.off("donation_proof_new");
    };
  }, [fetchData, fetchStats, fetchAllProofs]);

  const handleAction = (id, action) => {
    setActionModal({ isOpen: true, type: action, proofId: id });
  };

  const handleActionSubmit = async (formData) => {
    setModalLoading(true);
    try {
      if (actionModal.type === 'validate') {
        await api.patch(`/donation-proofs/validate/${actionModal.proofId}`, {
          pointsAwarded: Number(formData.pointsAwarded),
          amount: 0,
          adminNote: formData.adminNote || ""
        });
      } else {
        await api.patch(`/donation-proofs/reject/${actionModal.proofId}`, {
          adminNote: formData.adminNote,
          refusalReason: formData.refusalReason
        });
      }
      setActionModal({ isOpen: false, type: null, proofId: null });
      toast.success(actionModal.type === 'validate' ? "Donation validated successfully" : "Donation rejected successfully");
      fetchData();
    } catch (err) {
      console.error(`Failed to ${actionModal.type} proof`, err);
      toast.error(err.response?.data?.message || `Error during ${actionModal.type}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleValidateAll = async () => {
    if (!window.confirm(`Are you sure you want to validate all ${meta?.total || 0} pending donations?`)) return;
    
    setLoading(true);
    try {
      const res = await api.post("/donation-proofs/validate-all");
      if (res.data.status === "ok") {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      console.error("Failed to validate all proofs", err);
      toast.error(err.response?.data?.message || "Error during bulk validation");
    } finally {
      setLoading(false);
    }
  };

  const validateFields = [
    { name: "pointsAwarded", label: t.ptsToAttribute, type: "number", required: true },
    { name: "adminNote", label: t.optionalNote, type: "textarea" },
  ];

  const rejectFields = [
    { 
      name: "refusalReason", 
      label: t.rejectionReason, 
      type: "select", 
      required: true,
      options: acceptedValues.refusalReasons.map(val => ({
        label: val ? (t[val.replace(/_([a-z])/g, (g) => g[1]?.toUpperCase())] || val.replace(/_/g, ' ')) : t.rejected,
        value: val
      }))
    },
    { name: "adminNote", label: t.optionalNote, type: "textarea" },
  ];

  const columns = [
    {
      header: t.supportVia || "Support Via",
      cell: (d) => (
        <div className="font-bold text-[#3a2a1a]">{d.donorName || (d.user ? `${d.user.firstName} ${d.user.lastName}` : "Anonyme")}</div>
      )
    },
    {
      header: t.quantityLabel || "Quantity",
      cell: (d) => <div className="font-bold text-[#3a2a1a]">{d.quantity ?? d.amount}</div>
    },
    { header: t.category || "Category", accessor: "category" },
    {
      header: t.association || "Association",
      cell: (d) => <div className="text-[12px]">{d.collectionPoint?.title || "HESTEKA"}</div>
    },
    {
      header: t.dateLabel || "DATE",
      cell: (d) => new Date(d.createdAt).toLocaleDateString()
    },
    {
      header: t.statusLabel || "STATUS",
      cell: (d) => {
        const colors = {
          "approved": "bg-green-100 text-green-600",
          "pending": "bg-orange-100 text-orange-600",
          "rejected": "bg-red-100 text-red-600"
        };
        return (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[d.status] || 'bg-gray-100 text-gray-600'}`}>
            {d.status === 'approved' ? 'completed' : d.status}
          </span>
        );
      }
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      cell: (d) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => d.photo?.secure_url && setImageModal({ isOpen: true, url: d.photo.secure_url })}
            className="md:w-30 bg-[#fcfaf7] text-[#3a2a1a] text-[10px] font-bold px-3 py-1.5 rounded border border-[#e8ddd0] hover:bg-[#f0e8d8] transition-colors"
          >
            {t.viewImage || "View Image"}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4 relative">
      {/* Background loading overlay for the whole page if no data yet */}
      {loading && pending.length === 0 && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
             <div className="w-10 h-10 border-4 border-[#8B6914] border-t-transparent rounded-full animate-spin"></div>
             <p className="text-xs font-bold text-[#8B6914] uppercase tracking-widest animate-pulse">{t.loadingLabel}</p>
          </div>
        </div>
      )}

      {/* Validate All action */}
      {/* <div className="flex justify-end">
        <button 
          onClick={handleValidateAll}
          disabled={loading || !pending.length}
          className="bg-[#3a2a1a] text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:bg-[#2a1a0a] disabled:opacity-50 transition-colors flex items-center gap-2"
        >
           ✓ {t.validateAllDon} ({meta?.total || 0})
        </button>
      </div> */}

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard loading={loading} label={t.pendingValidationDon} value={{ text: stats?.pendingCount?.toString() || "0", color: "text-orange-500" }} sub={t.toValidate} subType="wait" />
        <StatCard loading={loading} label={t.validatedThisMonth} value={{ text: stats?.validatedThisMonth?.toString() || "0", color: "text-green-600" }} sub={`${(stats?.validatedGrowth || 0) >= 0 ? "+" : ""}${stats?.validatedGrowth || 0}% ${t.vsLastMonth}`} subType={(stats?.validatedGrowth || 0) >= 0 ? "up" : "down"} />
        <StatCard loading={loading} label={t.refused} value={{ text: stats?.refusedThisMonth?.toString() || "0", color: "text-red-600" }} sub={`${(stats?.refusedGrowth || 0) >= 0 ? "+" : ""}${stats?.refusedGrowth || 0}% ${t.vsLastMonth}`} subType={(stats?.refusedGrowth || 0) >= 0 ? "up" : "down"} />
        <StatCard loading={loading} label={t.ptsGranted} value={{ text: stats?.pointsGranted?.toLocaleString() || "0", color: "text-blue-600" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Pending List */}
         <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
               <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
                 <Trophy className="w-4 h-4 text-[#8B6914]" /> {t.donsPendingVal}
               </h3>
               <span className="text-[10px] text-[#9a8a7a] font-bold">{meta?.total || 0} {t.pending}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {loading && pending.length === 0 ? (
                 Array(4).fill(0).map((_, i) => (
                   <div key={i} className="bg-white rounded-xl h-64 animate-pulse border border-[#e8ddd0]"></div>
                 ))
               ) : pending.map((item) => (
                 <PendingDonation 
                   key={item._id} 
                   item={item} 
                   onAction={handleAction} 
                   onEnlarge={(url) => setImageModal({ isOpen: true, url })}
                   pointsPerDonation={acceptedValues.pointsPerDonation}
                   t={t} 
                 />
               ))}
               {pending.length === 0 && !loading && (
                 <div className="col-span-full bg-white border border-[#e8ddd0] rounded-xl p-20 text-center text-[#9a8a7a] italic">
                   {t.noPendingDons || "No pending donations to validate."}
                 </div>
               )}
            </div>

            <Pagination meta={meta} onPageChange={setPage} />

            {/* Category Trend Chart */}
            {stats?.categoryTrend && stats.categoryTrend.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-[#e8ddd0] shadow-sm mt-4 h-64 flex flex-col">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-[#3a2a1a] flex items-center gap-2 uppercase tracking-wider">
                       {t.categoryTrend || "Analytics"}
                    </h3>
                    <select
                      value={trendPeriod}
                      onChange={(e) => setTrendPeriod(e.target.value)}
                      className="bg-[#fcfaf7] border border-[#e8ddd0] text-[#3a2a1a] text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer focus:ring-1 focus:ring-[#8B6914] uppercase"
                    >
                      <option value="weekly">{t.weekly || "Weekly"}</option>
                      <option value="monthly">{t.monthly || "Monthly"}</option>
                      <option value="yearly">{t.yearly || "Yearly"}</option>
                      <option value="lifetime">{t.lifetime || "Lifetime"}</option>
                    </select>
                 </div>
                 <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.categoryTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFood" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorLitter" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorToys" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorMedicine" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e8d8" />
                        <XAxis 
                           dataKey="monthLabel" 
                           axisLine={false} 
                           tickLine={false} 
                           tickFormatter={(val) => t[val + "Short"] || val?.toUpperCase()} 
                           tick={{ fontSize: 10, fill: "#9a8a7a", fontWeight: "bold" }}
                           dy={10}
                        />
                        <YAxis 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fontSize: 10, fill: "#9a8a7a", fontWeight: "bold" }}
                        />
                        <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: '1px solid #e8ddd0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px', fontWeight: 'bold', color: '#3a2a1a' }}
                           labelFormatter={(val) => t[val + "Short"] || val?.toUpperCase()}
                        />
                        <Area type="monotone" dataKey="food" name={t.food || "Food"} stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorFood)" dot={{ r: 3, fill: "white", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="litter" name={t.litter || "Litter"} stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorLitter)" dot={{ r: 3, fill: "white", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="toys" name={t.toys || "Toys"} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorToys)" dot={{ r: 3, fill: "white", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        <Area type="monotone" dataKey="medicine" name={t.medicine || "Medicine"} stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorMedicine)" dot={{ r: 3, fill: "white", strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            )}
         </div>

         {/* Sidebar Stats & History */}
         <div className="flex flex-col gap-6">
            {/* Deposits Stats */}
            <div className="bg-white rounded-xl border border-[#e8ddd0] p-5 flex flex-col gap-5">
               <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
                 <BarChart3 className="w-4 h-4 text-[#8B6914]" /> {t.depositsThisMonth}
               </h3>
                 <div className="flex flex-col gap-4">
                   {(stats?.depositsByCategory?.length > 0 ? stats.depositsByCategory : [
                     { label: "food", val: 0 },
                     { label: "litter", val: 0 },
                     { label: "toys", val: 0 },
                     { label: "medicine", val: 0 },
                     { label: "other", val: 0 },
                   ]).map((s, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                       <div className="flex items-center justify-between text-[10px] font-bold text-[#3a2a1a]">
                          <span className="capitalize">{t[s.label] || s.label}</span>
                          <span>{s.val}%</span>
                       </div>
                       <div className="w-full h-1 bg-[#f5f0e8] rounded-full overflow-hidden">
                          <div className={`h-full ${i % 4 === 0 ? "bg-orange-600" : i % 4 === 1 ? "bg-green-600" : i % 4 === 2 ? "bg-blue-500" : "bg-purple-500"}`} style={{ width: `${s.val}%` }}></div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Refusal Reasons */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col gap-4">
               <h3 className="font-bold text-red-800 text-xs flex items-center gap-2">
                 <AlertTriangle className="w-4 h-4 text-red-600" /> {t.refusalReasons}
               </h3>
                <div className="flex flex-col gap-2">
                   {(stats?.refusalReasons?.length > 0 ? stats.refusalReasons : [
                     { label: "blurred_photo", count: 0 },
                     { label: "item_not_visible", count: 0 },
                     { label: "point_not_recognized", count: 0 },
                   ]).map((r, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/60 p-2 rounded-lg text-[10px] font-bold text-red-800">
                       <span className="capitalize">
                         {r.label ? (t[r.label.replace(/_([a-z])/g, (g) => g[1]?.toUpperCase())] || r.label.replace(/_/g, ' ')) : t.rejected}
                       </span>
                       <span className="opacity-60">x{r.count}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>

      {/* All Physical Supports Table */}
      <div className="mt-8 bg-white rounded-xl border border-[#e8ddd0] overflow-hidden shadow-sm flex flex-col">
        <FilterBar
          onSearch={(val) => setQueryParams(p => ({ ...p, search: val, page: 1 }))}
          onFilterChange={(name, val) => setQueryParams(p => ({ ...p, [name]: val, page: 1 }))}
          related={true}
          filters={[
            {
              name: "status", label: t.allStatuses || "ALL", options: [
                { label: t.approved || "COMPLETED", value: "approved" },
                { label: t.pending || "PENDING", value: "pending" },
                { label: t.rejected || "REJECTED", value: "rejected" }
              ]
            }
          ]}
          actionButton={
            <button className="bg-[#3a2a1a] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#2a1a0a] transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> {t.exportBtn}
            </button>
          }
        />
        
        <DataTable 
          columns={columns}
          data={allProofs}
          loading={allLoading}
          emptyMessage={t.noDataFound}
        />

        <div className="bg-[#fcfaf7]">
          <Pagination
            meta={allMeta}
            onPageChange={(page) => setQueryParams(p => ({ ...p, page }))}
          />
        </div>
      </div>

      <CRUDModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: null, proofId: null })}
        title={actionModal.type === 'validate' ? t.validateDonationTitle : t.rejectDonationTitle}
        fields={actionModal.type === 'validate' ? validateFields : rejectFields}
        initialData={actionModal.type === 'validate' ? { pointsAwarded: acceptedValues.pointsPerDonation || 15 } : {}}
        onSubmit={handleActionSubmit}
        loading={modalLoading}
      />

      {imageModal.isOpen && imageModal.url && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setImageModal({ isOpen: false, url: null })}
        >
          <div className="relative max-w-full max-h-[90vh] inline-flex" onClick={(e) => e.stopPropagation()}>
            <img 
              src={imageModal.url} 
              alt="Enlarged proof" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl cursor-default"
            />
            <button 
              className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 hover:scale-110 transition-all"
              onClick={() => setImageModal({ isOpen: false, url: null })}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
