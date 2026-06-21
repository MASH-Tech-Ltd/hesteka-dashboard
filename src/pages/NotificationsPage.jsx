import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";

import ConfirmModal from "../components/common/ConfirmModal";
import { Bell, Coins, Target, MapPin, Megaphone, Rocket, ClipboardList, Gift, Users, FileText, CreditCard, ArrowUp } from "lucide-react";

const NotifItem = React.memo(({ icon, title, sub, stats, date, isRead, onClick }) => (
  <div
    onClick={onClick}
    className={`border rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer ${isRead ? 'bg-[#fcfaf7] border-[#e8ddd0] opacity-80' : 'bg-white border-[#8B6914] shadow-sm hover:shadow-md'}`}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRead ? 'bg-[#e8ddd0]' : 'bg-[#8B6914] text-white'}`}>
        {icon || <Bell className="w-5 h-5" />}
      </div>
      <div>
        <h4 className={`text-sm ${isRead ? 'font-medium text-[#5a4a3a]' : 'font-bold text-[#3a2a1a]'}`}>{title}</h4>
        <p className="text-[10px] text-[#9a8a7a] line-clamp-1">{sub}</p>
        {date && <p className="text-[8px] text-[#c8b898] italic">{new Date(date).toLocaleString()}</p>}
      </div>
    </div>
    <div className="text-right flex flex-col items-end gap-1">
      {!isRead && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
      {stats && (
        <>
          <p className="text-[10px] text-[#9a8a7a] font-bold">{stats.sent} {t.sentCount || "sent"} \u00B7 {t.opening || "Open"} {stats.open}%</p>
          <p className="text-[10px] text-[#9a8a7a] font-bold">{t.clicks || "Clicks"} {stats.clicks}%</p>
        </>
      )}
    </div>
  </div>
));

const CustomSelect = ({ value, onChange, options, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
      <label className="text-[9px] font-bold text-[#9a8a7a] uppercase">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2.5 text-xs text-[#3a2a1a] cursor-pointer hover:border-[#8B6914] transition-colors flex justify-between items-center"
      >
        <span className="truncate pr-4 font-medium">{selectedOption?.label || "Select..."}</span>
        <svg className={`w-4 h-4 text-[#9a8a7a] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      
      {isOpen && (
        <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-[#e8ddd0] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((opt, idx) => (
            <div 
              key={idx}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`px-4 py-2.5 text-xs cursor-pointer transition-colors ${value === opt.value ? 'bg-[#f5f0e8] text-[#8B6914] font-bold' : 'text-[#3a2a1a] hover:bg-[#fcfaf7]'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function NotificationsPage() {
  const { t } = useLang();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [viewMode, setViewMode] = useState("my");

  const [alertTarget, setAlertTarget] = useState("all_france");
  const [alertRole, setAlertRole] = useState("all");
  const [alertMessage, setAlertMessage] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  const listRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [uniqueCities, setUniqueCities] = useState([]);

  const handleScroll = () => {
    if (listRef.current) {
      setShowBackToTop(listRef.current.scrollTop > 200);
    }
  };

  const scrollToTop = () => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const lastNotifElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    setHistory([]);
    setPage(1);
    setHasMore(true);
  }, [viewMode]);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const endpoint = viewMode === "all"
          ? `/notifications/get-all-admin-notifications?page=${page}&limit=20`
          : `/notifications/get-my-notifications?page=${page}&limit=20`;
        const res = await api.get(endpoint);
        if (res.data.status === "ok") {
          const newNotifs = res.data.data;
          setHistory(prev => {
            const existingIds = new Set(prev.map(n => n._id));
            const filteredNew = newNotifs.filter(n => !existingIds.has(n._id));
            return page === 1 ? newNotifs : [...prev, ...filteredNew];
          });
          setHasMore(newNotifs.length === 20);
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [viewMode, page]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await api.get('/user/get-unique-locations');
        if (res.data.status === "ok") {
          setUniqueCities(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch unique locations", err);
      }
    };
    fetchCities();
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case "points_earned": return <Coins className="w-5 h-5" />;
      case "new_mission": return <Target className="w-5 h-5" />;
      case "report_update": return <MapPin className="w-5 h-5" />;
      case "new_report": return <FileText className="w-5 h-5" />;
      case "new_payment": return <CreditCard className="w-5 h-5" />;
      case "new_donation": return <Gift className="w-5 h-5" />;
      case "new_partner": return <Users className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const handleNotifClick = async (notif) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/mark-as-read/${notif._id}`);
        setHistory((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error("Failed to mark notification as read", error);
      }
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) return;
    setSendingAlert(true);
    try {
      const res = await api.post("/notifications/send-admin-alert", {
        geoTarget: alertTarget,
        userType: alertRole,
        message: alertMessage
      });
      if (res.data.status === "ok") {
        setAlertMessage("");
        setViewMode("all"); // Refresh to show the new alert in history
      }
    } catch (err) {
      console.error("Failed to send alert", err);
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Create Alert Form */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5">
          <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#8B6914]" /> {t.createAlert || "Create an alert"}
          </h3>
          <div className="flex flex-col gap-4">
            <CustomSelect
              label={t.geoTarget || "GEOGRAPHIC TARGETING"}
              value={alertTarget}
              onChange={setAlertTarget}
              options={[
                { label: t.allFrance || "Toute la France", value: "all_france" },
                { label: t.pacaRegion || "Provence-Alpes-Côte d'Azur", value: "paca" },
                { label: "CSFS", value: "CSFS" },
                ...uniqueCities.map(city => ({ label: city, value: city }))
              ]}
            />
            <CustomSelect
              label={t.userType || "USER TYPE"}
              value={alertRole}
              onChange={setAlertRole}
              options={[
                { label: t.allRoles || "Tous", value: "all" },
                { label: t.userRole || "Propriétaires", value: "user" },
                { label: t.partnerRole || "Partenaires", value: "partner" }
              ]}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-[#9a8a7a] uppercase">{t.message || "MESSAGE"}</label>
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder={t.enterAlertMessage || "Enter your alert message..."}
                className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs text-[#3a2a1a] outline-none h-32 resize-none"
              />
            </div>
            <button
              onClick={handleSendAlert}
              disabled={sendingAlert || !alertMessage.trim()}
              className="bg-[#8B6914] text-white text-[11px] font-bold py-3 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Rocket className="w-4 h-4" /> {sendingAlert ? "Sending..." : (t.sendAlert || "Send alert")}
            </button>
          </div>
        </div>

        {/* History Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e8ddd0] p-4 flex flex-col gap-4 relative h-[calc(100vh-110px)]">
          <div className="flex items-center justify-between shrink-0">
            <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#8B6914]" /> {t.notifHistory}
            </h3>
            <div className="flex gap-1 bg-[#fcfaf7] border border-[#e8ddd0] p-1 rounded-lg">
              <button
                onClick={() => setViewMode("my")}
                className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${viewMode === "my" ? "bg-[#8B6914] text-white shadow-sm" : "text-[#9a8a7a] hover:text-[#3a2a1a]"}`}
              >
                {t.myAlertsLabel || "My Alerts"}
              </button>
              <button
                onClick={() => setViewMode("all")}
                className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${viewMode === "all" ? "bg-[#8B6914] text-white shadow-sm" : "text-[#9a8a7a] hover:text-[#3a2a1a]"}`}
              >
                {t.allSystemLabel || "All System"}
              </button>
            </div>
          </div>

          <div
            className="flex flex-col gap-3 overflow-y-auto pr-1 pb-4 flex-1 scrollbar-thin scrollbar-thumb-[#8B6914]/20 scrollbar-track-transparent"
            ref={listRef}
            onScroll={handleScroll}
          >
            {history.map((item, index) => {
              if (history.length === index + 1) {
                return (
                  <div ref={lastNotifElementRef} key={item._id}>
                    <NotifItem
                      icon={getIcon(item.type)}
                      title={item.title}
                      sub={item.description}
                      date={item.createdAt}
                      isRead={item.isRead}
                      onClick={() => handleNotifClick(item)}
                    />
                  </div>
                );
              } else {
                return (
                  <NotifItem
                    key={item._id}
                    icon={getIcon(item.type)}
                    title={item.title}
                    sub={item.description}
                    date={item.createdAt}
                    isRead={item.isRead}
                    onClick={() => handleNotifClick(item)}
                  />
                );
              }
            })}
            {history.length === 0 && !loading && (
              <p className="text-[10px] text-[#9a8a7a] text-center py-8 italic">{t.noNotifHistory}</p>
            )}
          </div>

          {/* Back to top button */}
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="absolute bottom-6 right-6 bg-[#8B6914] text-white p-2.5 rounded-full shadow-lg hover:bg-[#6a5010] transition-all z-10 hover:scale-105"
              title="Back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {selectedNotif && (
        <ConfirmModal
          isOpen={!!selectedNotif}
          onClose={() => setSelectedNotif(null)}
          title="Notification Details"
          message={
            <div className="flex flex-col gap-4 mt-2 text-left">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8B6914] to-[#c0501a] flex items-center justify-center text-3xl shadow-lg shrink-0 text-white">
                  {getIcon(selectedNotif.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#3a2a1a] text-lg leading-tight">{selectedNotif.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-[#f5f0e8] text-[#8B6914] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {selectedNotif.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[#9a8a7a]">
                      {new Date(selectedNotif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#fcfaf7] border border-[#e8ddd0] p-4 rounded-xl">
                <h4 className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">Message</h4>
                <p className="text-sm text-[#5a4a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedNotif.description}
                </p>
              </div>

              {selectedNotif.user && typeof selectedNotif.user === 'object' && (
                <div className="bg-[#f5f0e8] p-3 rounded-xl border border-[#e8ddd0]">
                  <h4 className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">Target Recipient</h4>
                  <p className="text-xs text-[#3a2a1a] font-medium">
                    {selectedNotif.user.firstName} {selectedNotif.user.lastName}
                    <span className="text-[#9a8a7a] font-normal ml-1">({selectedNotif.user.email})</span>
                  </p>
                  <span className="bg-white px-2 py-0.5 rounded text-[9px] mt-1 inline-block border border-[#e8ddd0] text-[#9a8a7a]">
                    Role: {selectedNotif.user.role}
                  </span>
                </div>
              )}
            </div>
          }
          confirmText="Close"
          onConfirm={() => setSelectedNotif(null)}
          hideCancel={true}
        />
      )}
    </div>
  );
}
