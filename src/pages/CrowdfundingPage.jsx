import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import DataTable from "../components/common/DataTable";
import { Scroll, Plus, X, Settings } from "lucide-react";
import { toast } from "react-toastify";

export default function CrowdfundingPage() {
  const { t, lang } = useLang();
  
  // Data States
  const [stats, setStats] = useState(null);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-project states
  const [slugs, setSlugs] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [activeSlug, setActiveSlug] = useState("");
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  
  // Donor details modal states
  const [selectedDonor, setSelectedDonor] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (selectedSlug) {
      fetchData(selectedSlug);
    }
  }, [selectedSlug]);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/crowdfunding/projects");
      if (res.data.status === "ok") {
        const configSlugs = res.data.data.map(p => p.slug) || [];
        setSlugs(configSlugs);
        
        const active = res.data.data.find(p => p.isActive)?.slug || (configSlugs.length > 0 ? configSlugs[0] : "");
        setActiveSlug(active);

        if (configSlugs.length > 0) {
          setSelectedSlug(active);
        } else {
          // fallback if no slugs configured yet
          setSelectedSlug("");
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin config", err);
      setLoading(false);
    }
  };

  const fetchData = async (slug) => {
    try {
      setLoading(true);
      const [statsRes, donorsRes] = await Promise.all([
        api.get(`/crowdfunding/stats?slug=${slug}`),
        api.get(`/crowdfunding/donors?slug=${slug}`)
      ]);
      
      if (statsRes.data.status === "ok") {
        setStats(statsRes.data.data);
      }
      if (donorsRes.data.status === "ok") {
        setDonors(donorsRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch crowdfunding data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlug = async (e) => {
    e.preventDefault();
    if (!newSlug.trim()) return;
    
    try {
      const res = await api.post("/crowdfunding/projects", { slug: newSlug.trim() });
      if (res.data.status === "ok") {
        const updatedSlugs = [...slugs, newSlug.trim()];
        setSlugs(updatedSlugs);
        setSelectedSlug(newSlug.trim());
        setNewSlug("");
        toast.success("Project added successfully!");
      }
    } catch (err) {
      console.error("Failed to add project slug", err);
      toast.error("Failed to add project.");
    }
  };

  const handleSetActiveSlug = async (slugToActive) => {
    try {
      const res = await api.put(`/crowdfunding/projects/${slugToActive}/active`);
      if (res.data.status === "ok") {
        setActiveSlug(slugToActive);
        toast.success("Project set as default successfully!");
      }
    } catch (err) {
      console.error("Failed to set project as default", err);
      toast.error("Failed to set project as default.");
    }
  };

  const handleRemoveSlug = async (slugToRemove) => {
    try {
      const res = await api.delete(`/crowdfunding/projects/${slugToRemove}`);
      if (res.data.status === "ok") {
        const updatedSlugs = slugs.filter(s => s !== slugToRemove);
        setSlugs(updatedSlugs);
        if (selectedSlug === slugToRemove) {
          setSelectedSlug(updatedSlugs.length > 0 ? updatedSlugs[0] : "");
        }
        toast.success("Project removed successfully!");
      }
    } catch (err) {
      console.error("Failed to remove project slug", err);
      toast.error("Failed to remove project.");
    }
  };

  const columns = [
    {
      header: t.donator,
      cell: (d) => <div className="font-bold text-[#3a2a1a]">{d.user}</div>
    },
    {
      header: t.amount,
      cell: (d) => <div className="font-bold text-[#3a2a1a]">{d.amount}€</div>
    },
    { header: t.counterpart, accessor: "counterpart" },
    { 
      header: t.dateLabel || "DATE", 
      cell: (d) => <span className="text-[#9a8a7a] font-medium">{new Date(d.date).toLocaleDateString()}</span>
    },
    {
      header: t.statusLabel || "STATUS",
      cell: (d) => (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${["Confirmed", "Confirmé", "payment_completed", 4, "4"].includes(d.status) ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
          {["payment_completed", 4, "4"].includes(d.status) ? "Confirmed" : d.status}
        </span>
      )
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      cell: (d) => (
        <div className="flex justify-end">
          <button 
            onClick={() => setSelectedDonor(d)}
            className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-blue-200 transition-colors"
          >
            {t.detailsBtn || "Details"}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Header & Project Selector */}
      <div className="flex justify-between items-center bg-white rounded-xl border border-[#e8ddd0] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[#9a8a7a] uppercase tracking-wider">Project</label>
          <select 
            className="bg-[#fcfaf7] border border-[#e8ddd0] text-[#3a2a1a] text-sm rounded-lg focus:ring-[#8B6914] focus:border-[#8B6914] block p-2 font-bold"
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          >
            {slugs.length === 0 && <option value="" disabled>No projects configured</option>}
            {slugs.map(slug => (
              <option key={slug} value={slug}>{slug}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setIsManageModalOpen(true)}
          className="flex items-center gap-2 bg-[#fcfaf7] text-[#3a2a1a] text-xs font-bold px-3 py-2 rounded-lg border border-[#e8ddd0] hover:bg-[#f0ebe1] transition-colors"
        >
          <Settings className="w-4 h-4" /> Manage Projects
        </button>
      </div>

      {/* Main Campaign Card */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-2 md:gap-3">
            <span className="text-3xl md:text-5xl font-bold text-[#3a2a1a]">{stats?.totalCollected?.toLocaleString() || 0}€</span>
            <span className="text-base md:text-xl text-[#9a8a7a] mb-1 md:mb-1.5">{t.of || "sur"} {stats?.goalAmount?.toLocaleString() || 0}€ {t.goal || "goal"}</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-6 md:h-8 bg-[#f5f0e8] rounded-full overflow-hidden relative border border-[#e8ddd0]">
            <div
              className="h-full bg-[#8B6914] transition-all duration-1000 flex items-center justify-end px-3"
              style={{ width: `${stats?.percentage || 0}%` }}
            >
              <span className="text-white text-[10px] font-bold">{Math.round(stats?.percentage || 0)}%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t.donors, value: donors?.length || stats?.donorsCount || "0", color: "bg-blue-500" },
            { label: t.averageBasket, value: (donors?.length || stats?.donorsCount) ? `${(stats.totalCollected / (donors?.length || stats?.donorsCount)).toFixed(1)}€` : "0€", color: "bg-green-500" },
            { label: t.remaining, value: stats?.dateEnd ? `${Math.max(0, Math.ceil((new Date(stats.dateEnd) - new Date()) / (1000 * 60 * 60 * 24)))}d` : "0d", color: "bg-orange-500" },
            { label: t.left, value: `${Math.max(0, (stats?.goalAmount || 0) - (stats?.totalCollected || 0))}€`, color: "bg-purple-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-[#fcfaf7] rounded-xl p-3 px-4 border border-[#e8ddd0] flex flex-col justify-between h-[85px] transition-all hover:shadow-sm relative overflow-hidden">
              <div className={`absolute left-0 top-0 w-1 h-full ${stat.color || "bg-[#8B6914]"}`}></div>
              <div>
                <span className="text-[10px] font-black text-[#9a8a7a] uppercase tracking-widest block mb-0.5">{stat.label}</span>
                <span className="text-2xl font-black text-[#3a2a1a] leading-none">{stat.value}</span>
              </div>
              <div className="mt-auto">
                <p className="text-[10px] invisible leading-none">&nbsp;</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donors List Table */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#e8ddd0] bg-[#fcfaf7]">
          <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
            <Scroll className="w-4 h-4 text-[#8B6914]" /> {t.donorsList}
          </h3>
        </div>
        
        <DataTable 
          columns={columns}
          data={donors}
          loading={loading}
          emptyMessage={t.noDataFound}
        />
      </div>
      
      {/* Action */}
      <div className="flex justify-start">
        <a href={`https://www.ulule.com/${selectedSlug}`} target="_blank" rel="noreferrer" className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2">
          <img src="/images/ulule.png" className="w-4 h-4" alt="Ulule" /> {t.viewOnUlule || "View on Ulule"}
        </a>
      </div>

      {/* Manage Projects Modal */}
      {isManageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Manage Ulule Projects</h3>
              <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Existing Projects</label>
                {slugs.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">No projects configured.</div>
                ) : (
                  <ul className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {slugs.map(s => (
                      <li key={s} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <span className="font-medium text-sm text-gray-800 flex items-center gap-2">
                          {s} {activeSlug === s && <span className="text-[9px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase">Default</span>}
                        </span>
                        <div className="flex gap-2">
                          {activeSlug !== s && (
                            <button onClick={() => handleSetActiveSlug(s)} className="text-blue-500 text-xs font-bold hover:underline">Set Default</button>
                          )}
                          <button onClick={() => handleRemoveSlug(s)} className="text-red-500 text-xs font-bold hover:underline">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              <form onSubmit={handleAddSlug} className="flex flex-col gap-2 pt-4 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 uppercase">Add New Project</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter ulule project slug..." 
                    className="flex-1 bg-gray-50 border border-gray-200 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value)}
                  />
                  <button type="submit" className="bg-[#8B6914] text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-[#6a5010] transition-colors">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Donor Details Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Donor Details</h3>
              <button onClick={() => setSelectedDonor(null)} className="text-gray-400 hover:text-gray-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-center items-center w-16 h-16 bg-[#f5f0e8] text-[#8B6914] rounded-full mx-auto mb-2 text-2xl font-bold">
                {selectedDonor.user?.charAt(0)?.toUpperCase()}
              </div>
              <div className="text-center">
                <h4 className="text-xl font-black text-[#3a2a1a]">{selectedDonor.user}</h4>
                <p className="text-sm font-bold text-gray-500">{new Date(selectedDonor.date).toLocaleString()}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-xl flex flex-col gap-3 mt-2 border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase">Amount</span>
                  <span className="font-black text-[#8B6914] text-lg">{selectedDonor.amount}€</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedDonor.status === "Confirmed" || selectedDonor.status === "Confirm\u00E9" || selectedDonor.status === "payment_completed" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
                    {selectedDonor.status === "payment_completed" ? "Confirmed" : selectedDonor.status}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase">Counterpart / Reward</span>
                  <span className="text-sm font-medium text-gray-800">{selectedDonor.counterpart}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setSelectedDonor(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

