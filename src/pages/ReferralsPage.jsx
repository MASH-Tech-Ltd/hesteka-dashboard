import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import { Users, Filter, ChevronDown, ChevronUp, Database } from "lucide-react";
import { toast } from "react-toastify";
import Pagination from "../components/common/Pagination";

export default function ReferralsPage() {
  const { t } = useLang();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        api.get("/settings"),
        api.get(`/user/referrals/stats`, {
          params: {
            page,
            limit: meta.limit,
            provider: providerFilter,
          },
        })
      ]);

      if (settingsRes.data?.data?.devMode !== true) {
        window.location.href = "/dashboard";
        return;
      }

      if (statsRes.data.status === "ok") {
        setData(statsRes.data.data);
        setMeta(statsRes.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch referral stats", err);
      toast.error("Failed to fetch referral stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1);
  }, [providerFilter]);

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
          <Users className="w-6 h-6 text-[#8B6914]" /> Referral System
        </h2>
        
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#e8ddd0] p-1.5 shadow-sm w-full md:w-auto">
          <Filter className="w-4 h-4 text-[#9a8a7a] ml-2" />
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-[#3a2a1a] outline-none cursor-pointer pr-4"
          >
            <option value="all">All Providers</option>
            <option value="local">Local</option>
            <option value="google">Google</option>
            <option value="apple">Apple</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8ddd0] shadow-sm overflow-hidden w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#fcfaf7] border-b border-[#e8ddd0]">
              <th className="p-4 text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider w-[10%]"></th>
              <th className="p-4 text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider w-[30%]">Referrer</th>
              <th className="p-4 text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider w-[25%]">Code</th>
              <th className="p-4 text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider w-[35%]">Referrals Count</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-[#f5f0e8] animate-pulse">
                  <td className="p-4"><div className="h-4 bg-gray-200 rounded w-4"></div></td>
                  <td className="p-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  <td className="p-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                  <td className="p-4"><div className="h-4 bg-gray-200 rounded w-10"></div></td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-[#9a8a7a] text-sm">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No referral data found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <React.Fragment key={row._id}>
                  <tr className="border-b border-[#f5f0e8] hover:bg-[#fcfaf7] transition-colors cursor-pointer group" onClick={() => toggleRow(row._id)}>
                    <td className="p-4 text-[#8B6914]">
                      {expandedRow === row._id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold uppercase overflow-hidden shrink-0 shadow-sm border-2 border-white">
                          {row.referrerImage?.secure_url ? (
                            <img src={row.referrerImage.secure_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            row.referrerName?.charAt(0) || "U"
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-[#3a2a1a]">{row.referrerName}</span>
                          <span className="text-[10px] text-[#9a8a7a]">{row.referrerEmail}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-[#8B6914] bg-[#f5f0e8] px-2 py-1 rounded border border-[#e8ddd0]">
                        {row.referrerCode || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#8B6914]" />
                        <span className="text-xs font-bold text-[#3a2a1a]">{row.referralsCount}</span>
                      </div>
                    </td>
                  </tr>
                  
                  {expandedRow === row._id && (
                    <tr className="bg-[#fcfaf7] border-b border-[#e8ddd0]">
                      <td colSpan="4" className="p-0">
                        <div className="px-12 py-4 bg-gradient-to-r from-transparent to-[#f5f0e8]/30">
                          <h4 className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-3 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Referred Users ({row.referredUsers?.length || 0})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {row.referredUsers?.map((user) => (
                              <div key={user._id} className="bg-white border border-[#e8ddd0] rounded-lg p-3 flex flex-col gap-2 shadow-sm hover:border-[#8B6914] transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[#8B6914] font-bold uppercase overflow-hidden shrink-0 border border-[#e8ddd0]">
                                    {user.profileImage?.secure_url ? (
                                      <img src={user.profileImage.secure_url} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                      user.name?.charAt(0) || "U"
                                    )}
                                  </div>
                                  <div className="flex flex-col overflow-hidden">
                                    <span className="text-xs font-bold text-[#3a2a1a] truncate">{user.name}</span>
                                    <span className="text-[10px] text-[#9a8a7a] truncate">{user.email}</span>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#f5f0e8]">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                    user.provider === 'google' ? 'bg-red-100 text-red-600' :
                                    user.provider === 'apple' ? 'bg-gray-200 text-gray-700' :
                                    'bg-blue-100 text-blue-600'
                                  }`}>
                                    {user.provider}
                                  </span>
                                  <span className="text-[9px] text-[#9a8a7a]">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          meta={meta}
          onPageChange={(page) => fetchData(page)}
          loading={loading}
        />
      </div>
    </div>
  );
}
