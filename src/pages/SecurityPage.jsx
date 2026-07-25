import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  ShieldOff,
  UserX,
  Activity,
  RefreshCw,
  Plus,
  Search,
  Unlock,
  Lock,
  Globe,
  Clock,
  AlertTriangle,
  X,
  Terminal,
  Eye,
} from "lucide-react";

const BlockIpModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLang();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("permanent");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ip.trim()) {
      toast.error("Please enter a valid IP address");
      return;
    }

    let expiresAt = null;
    if (duration !== "permanent") {
      const hours =
        duration === "24h" ? 24 : duration === "7d" ? 168 : duration === "30d" ? 720 : 0;
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }
    }

    setLoading(true);
    try {
      const res = await api.post("/security/block-ip", {
        ip: ip.trim(),
        reason: reason.trim() || "Blocked by Admin",
        expiresAt,
      });
      if (res.data.status === "ok") {
        toast.success(t.blockSuccess || "IP address blocked successfully");
        onSuccess();
        onClose();
        setIp("");
        setReason("");
        setDuration("permanent");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to block IP address");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center bg-[#fcfaf7]">
          <h2 className="text-lg font-bold text-[#3a2a1a] flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-red-600" />{" "}
            {t.blockIpBtn || "Block IP Address"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5a4a3a] uppercase tracking-wider mb-1.5">
              {t.ipAddressLabel || "IP Address"} *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 192.168.1.100 or 10.0.0.1"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ddd0] bg-white text-sm text-[#3a2a1a] focus:outline-none focus:border-[#8B6914] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a4a3a] uppercase tracking-wider mb-1.5">
              {t.reasonLabel || "Reason"}
            </label>
            <textarea
              rows={2}
              placeholder="Suspicious request frequency, SQL injection attempt, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ddd0] bg-white text-sm text-[#3a2a1a] focus:outline-none focus:border-[#8B6914] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5a4a3a] uppercase tracking-wider mb-1.5">
              {t.blockDurationLabel || "Duration"}
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8ddd0] bg-white text-sm text-[#3a2a1a] focus:outline-none focus:border-[#8B6914] transition-colors"
            >
              <option value="permanent">{t.permanentOption || "Permanent"}</option>
              <option value="24h">{t.hours24Option || "24 Hours"}</option>
              <option value="7d">{t.days7Option || "7 Days"}</option>
              <option value="30d">{t.days30Option || "30 Days"}</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#e8ddd0] text-[#3a2a1a] text-xs font-bold hover:bg-[#fcfaf7] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldOff className="w-4 h-4" />
              )}
              {t.blockIpBtn || "Block IP Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogDetailsModal = ({ isOpen, onClose, log }) => {
  const { t } = useLang();
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-[#3a2a1a] to-[#2a1a0a] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg">{t.securityLogDetails || "Security Log Details"}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-[#5a4a3a]">
          <div className="bg-[#fcfaf7] p-4 rounded-xl border border-[#ede7df] space-y-3">
            <div>
              <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                {t.incidentType || "Endpoint / Action"} (Full URL)
              </span>
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-[#e5ded5] font-mono text-xs break-all">
                <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                  {log.method || "GET"}
                </span>
                <span className="text-[#3a2a1a] font-semibold">{log.endpoint || "Unknown"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                  {t.ipAddressLabel || "IP Address"}
                </span>
                <span className="font-mono text-xs bg-white px-2.5 py-1.5 rounded-lg border border-[#e5ded5] block text-[#3a2a1a] font-bold">
                  {log.ip || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                  {t.dateLabel || "Timestamp"}
                </span>
                <span className="text-xs bg-white px-2.5 py-1.5 rounded-lg border border-[#e5ded5] block text-[#3a2a1a]">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                {t.users || "Associated User"}
              </span>
              <div className="bg-white p-2.5 rounded-lg border border-[#e5ded5] text-xs">
                {log.userId ? (
                  <span className="font-semibold text-[#3a2a1a]">
                    {log.userId.firstName || ""} {log.userId.lastName || ""} ({log.userId.email || ""})
                  </span>
                ) : (
                  <span className="text-gray-500 italic">Anonymous / Guest</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                {t.reasonLabel || "Reason / Details"}
              </span>
              <div className="bg-white p-3 rounded-lg border border-[#e5ded5] text-xs font-medium text-red-700 leading-relaxed break-words">
                {log.reason || "Security violation detected"}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-[#9a8a7a] block mb-1">
                User Agent / Browser
              </span>
              <div className="bg-white p-2.5 rounded-lg border border-[#e5ded5] font-mono text-[11px] text-gray-600 break-all max-h-24 overflow-y-auto">
                {log.userAgent || "N/A"}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#3a2a1a] text-white text-xs font-bold hover:bg-[#2a1a0a] transition-colors"
          >
            {t.close || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SecurityPage() {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState("ips"); // 'ips' | 'users' | 'logs'
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // Query state
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint = "/security/blocked-ips";
      if (activeTab === "users") endpoint = "/security/blocked-users";
      if (activeTab === "logs") endpoint = "/security/logs";

      const res = await api.get(
        `${endpoint}?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      if (res.data.status === "ok" && res.data.data) {
        setData(res.data.data.data || []);
        setMeta(res.data.data.pagination || null);
      }
    } catch (err) {
      console.error("Failed to fetch security data:", err);
      toast.error(err?.response?.data?.message || "Error loading security data");
      setData([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setSearchInput("");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleSyncCache = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/security/sync-cache");
      if (res.data.status === "ok") {
        toast.success(res.data.message || "IP block cache synchronized successfully!");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to sync IP cache");
    } finally {
      setSyncing(false);
    }
  };

  const handleUnblockIp = async (id, ipAddress) => {
    if (!window.confirm(`Are you sure you want to unblock IP ${ipAddress}?`)) return;
    try {
      const res = await api.delete(`/security/unblock-ip/${id}`);
      if (res.data.status === "ok") {
        toast.success(t.unblockSuccess || `IP ${ipAddress} unblocked successfully`);
        fetchData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to unblock IP");
    }
  };

  const handleUnblockUser = async (user) => {
    if (!window.confirm(`Are you sure you want to unblock user ${user.email}?`)) return;
    try {
      const res = await api.post("/security/toggle-block-user", {
        userIdOrEmail: user._id,
        block: false,
        reason: "Unblocked by Admin from Security Dashboard",
      });
      if (res.data.status === "ok") {
        toast.success(`User ${user.email} is now active.`);
        fetchData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to unblock user");
    }
  };

  // Define table columns based on activeTab
  const getColumns = () => {
    if (activeTab === "ips") {
      return [
        {
          header: t.ipAddressLabel || "IP Address",
          accessor: "ip",
          cell: (row) => (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <span className="font-bold text-[#3a2a1a] font-mono tracking-wide">
                {row.ip}
              </span>
            </div>
          ),
        },
        {
          header: t.reasonLabel || "Reason",
          accessor: "reason",
          cell: (row) => {
            const isAuto = row.reason?.includes("[AUTO-BLOCKED]") || row.blockedBy === "system";
            return (
              <div className="max-w-xl break-words whitespace-normal leading-relaxed text-xs py-0.5">
                {isAuto && (
                  <span className="inline-block bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded text-[10px] mr-1.5 mb-1 uppercase tracking-wider border border-red-200 shadow-sm">
                    ⚡ Auto-Protected
                  </span>
                )}
                <span className="text-[#5a4a3a] font-medium block">
                  {row.reason || "Blocked by Admin"}
                </span>
              </div>
            );
          },
        },
        {
          header: t.blockedAtLabel || "Blocked At",
          accessor: "createdAt",
          cell: (row) => (
            <span className="text-xs text-[#9a8a7a] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(row.createdAt).toLocaleString()}
            </span>
          ),
        },
        {
          header: t.expiresAtLabel || "Expires At",
          accessor: "expiresAt",
          cell: (row) => (
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                row.expiresAt ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"
              }`}
            >
              {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : t.permanentOption || "Permanent"}
            </span>
          ),
        },
        {
          header: t.actionsLabel || "Actions",
          align: "right",
          cell: (row) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnblockIp(row._id, row.ip);
              }}
              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
            >
              <Unlock className="w-3.5 h-3.5" />
              {t.unblockAction || "Unblock"}
            </button>
          ),
        },
      ];
    }

    if (activeTab === "users") {
      return [
        {
          header: t.users || "User",
          accessor: "email",
          cell: (row) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-xs uppercase shrink-0 overflow-hidden border border-red-200">
                {row?.profileImage?.secure_url ? (
                  <img
                    src={row.profileImage.secure_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  row?.firstName?.charAt(0) || "U"
                )}
              </div>
              <div>
                <p className="font-bold text-[#3a2a1a] text-xs">
                  {row.firstName} {row.lastName}
                </p>
                <p className="text-[#9a8a7a] text-[11px]">{row.email}</p>
              </div>
            </div>
          ),
        },
        {
          header: t.statusLabel || "Status",
          accessor: "status",
          cell: (row) => <StatusBadge status={row.status} />,
        },
        {
          header: "Role",
          accessor: "role",
          cell: (row) => (
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7a6a5a]">
              {row.role || "user"}
            </span>
          ),
        },
        {
          header: t.blockedAtLabel || "Updated At",
          accessor: "updatedAt",
          cell: (row) => (
            <span className="text-xs text-[#9a8a7a]">
              {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : "N/A"}
            </span>
          ),
        },
        {
          header: t.actionsLabel || "Actions",
          align: "right",
          cell: (row) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUnblockUser(row);
              }}
              className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-bold transition-all flex items-center gap-1.5 ml-auto"
            >
              <Unlock className="w-3.5 h-3.5" />
              {t.unblockAction || "Unblock"}
            </button>
          ),
        },
      ];
    }

    if (activeTab === "logs") {
      return [
        {
          header: t.incidentType || "Endpoint / Action",
          accessor: "endpoint",
          cell: (row) => (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                  row.method === "POST" || row.method === "DELETE"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {row.method || "GET"}
              </span>
              <span className="text-xs font-bold font-mono text-[#3a2a1a]">
                {row.endpoint ? row.endpoint.split("?")[0] : "Unknown"}
              </span>
            </div>
          ),
        },
        {
          header: t.ipAddressLabel || "IP Address",
          accessor: "ip",
          cell: (row) => (
            <span className="text-xs font-mono text-[#5a4a3a] bg-[#f5f0e8] px-2 py-1 rounded">
              {row.ip || "N/A"}
            </span>
          ),
        },
        {
          header: t.reasonLabel || "Reason / Details",
          accessor: "reason",
          cell: (row) => {
            const isAlert = row.reason?.includes("🚨") || row.reason?.includes("AUTO-BLOCKED") || row.reason?.includes("Probing");
            return (
              <div className="max-w-xl break-words whitespace-normal leading-relaxed text-xs py-1">
                {isAlert && (
                  <span className="inline-block bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] mr-1.5 mb-1 uppercase tracking-wider border border-amber-200 shadow-sm">
                    🛡️ Active Defense
                  </span>
                )}
                <span className={`block font-medium ${isAlert ? "text-red-700 font-bold" : "text-[#5a4a3a]"}`}>
                  {row.reason || "Security violation detected"}
                </span>
              </div>
            );
          },
        },
        {
          header: t.users || "Associated User",
          accessor: "userId",
          cell: (row) => (
            <span className="text-xs text-[#7a6a5a]">
              {row.userId ? `${row.userId.firstName || ""} (${row.userId.email || ""})` : "Anonymous / Guest"}
            </span>
          ),
        },
        {
          header: t.dateLabel || "Timestamp",
          accessor: "createdAt",
          align: "right",
          cell: (row) => (
            <span className="text-xs text-[#9a8a7a]">
              {new Date(row.createdAt).toLocaleString()}
            </span>
          ),
        },
        {
          header: "Actions",
          accessor: "_id",
          align: "center",
          cell: (row) => (
            <button
              onClick={() => setSelectedLog(row)}
              className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 mx-auto shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              Details
            </button>
          ),
        },
      ];
    }

    return [];
  };

  const getEmptyMessage = () => {
    if (activeTab === "ips") return t.noBlockedIps || "No blocked IP addresses found.";
    if (activeTab === "users") return t.noBlockedUsers || "No blocked users found.";
    return t.noSecurityLogs || "No security logs recorded.";
  };

  return (
    <div className="px-4 md:px-6 py-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner & Actions */}
      <div className="bg-gradient-to-r from-[#3a2a1a] via-[#4a3622] to-[#2a1a0a] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#5a4a3a]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <ShieldAlert className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-black tracking-tight">
                {t.security || "Security & IP Blocker"}
              </h1>
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Active Protection
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#d8c8b8] max-w-xl">
              {t.securitySub ||
                "Monitor security threats, manage blocked IP addresses in real-time, and review system access logs."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSyncCache}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
            title="Synchronize IP Block Cache across server instances"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync IP Cache</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t.blockIpBtn || "Block IP Address"}
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-[#e8ddd0] shadow-sm overflow-hidden flex flex-col">
        {/* Navigation Tabs & Search */}
        <div className="p-4 md:p-5 border-b border-[#f0e8d8] bg-[#fcfaf7] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-[#eae2d6] p-1 rounded-xl">
            <button
              onClick={() => handleTabChange("ips")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "ips"
                  ? "bg-white text-[#3a2a1a] shadow-sm"
                  : "text-[#7a6a5a] hover:text-[#3a2a1a]"
              }`}
            >
              <ShieldOff className="w-4 h-4 text-red-600" />
              {t.blockedIpsTab || "Blocked IPs"}
            </button>
            <button
              onClick={() => handleTabChange("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "users"
                  ? "bg-white text-[#3a2a1a] shadow-sm"
                  : "text-[#7a6a5a] hover:text-[#3a2a1a]"
              }`}
            >
              <UserX className="w-4 h-4 text-orange-600" />
              {t.blockedUsersTab || "Blocked Users"}
            </button>
            <button
              onClick={() => handleTabChange("logs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "logs"
                  ? "bg-white text-[#3a2a1a] shadow-sm"
                  : "text-[#7a6a5a] hover:text-[#3a2a1a]"
              }`}
            >
              <Activity className="w-4 h-4 text-blue-600" />
              {t.securityLogsTab || "Security Logs"}
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#9a8a7a] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={t.searchPlaceholder || "Search IP, reason, email..."}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#e8ddd0] bg-white text-xs text-[#3a2a1a] focus:outline-none focus:border-[#8B6914] transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9a8a7a] hover:text-[#3a2a1a]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <DataTable
            columns={getColumns()}
            data={data}
            loading={loading}
            emptyMessage={getEmptyMessage()}
          />
        </div>

        {/* Pagination Section */}
        <div className="bg-[#fcfaf7]">
          <Pagination meta={meta} onPageChange={(p) => setPage(p)} />
        </div>
      </div>

      {/* Modal for Blocking IP */}
      <BlockIpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          if (activeTab === "ips") fetchData();
          else handleTabChange("ips");
        }}
      />

      {/* Modal for Log Details */}
      <LogDetailsModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
      />
    </div>
  );
}
