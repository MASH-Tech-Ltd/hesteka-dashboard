import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import { useApiCache } from "../../context/ApiCacheContext";
import { socket } from "../../context/SocketContect";
import api from "../../utils/api";
import ProfileModal from "./ProfileModal";
import { toast } from "react-toastify";
import { Bell, Menu } from "lucide-react";

const Topbar = React.memo(({ onToggleSidebar }) => {
  const { lang, setLang, t } = useLang();
  const location = useLocation();
  const { fetchWithCache } = useApiCache();

  // Live stats for dynamic subtitles — declared first so PAGE_TITLES can use it
  const [liveStats, setLiveStats] = useState(null);

  const fetchStats = useCallback(() => {
    fetchWithCache("/admin/stats", { expireIn: 30000 })
      .then(res => { if (res.data.status === "ok") setLiveStats(res.data.data); })
      .catch(() => { });
  }, [fetchWithCache]);

  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000);

    const fetchOnlineUsers = async () => {
      try {
        const res = await api.get("/admin/online-users");
        if (res.data?.status === "ok") {
          setOnlineCount(res.data.data.online);
        }
      } catch (err) { }
    };
    fetchOnlineUsers();

    const handleOnlineUsers = (data) => {
      setOnlineCount(data.count);
    };

    socket.on("onlineUsersCount", handleOnlineUsers);

    return () => {
      clearInterval(interval);
      socket.off("onlineUsersCount", handleOnlineUsers);
    };
  }, [fetchStats]);

  // Per-route supplemental stats (for pages not covered by /admin/stats)
  const [contactsStats, setContactsStats] = useState(null);
  const [collectionPointsTotal, setCollectionPointsTotal] = useState(null);
  const [donationsStats, setDonationsStats] = useState(null);

  useEffect(() => {
    if (location.pathname === "/contacts") {
      fetchWithCache("/contacts/stats", { expireIn: 60000 })
        .then(res => { if (res.data.status === "ok" || res.data.data) setContactsStats(res.data.data); })
        .catch(() => { });
    }
    if (location.pathname === "/collection-points") {
      fetchWithCache("/partner-ads/get-all-partner-ads?type=collection_point&limit=1", { expireIn: 60000 })
        .then(res => { if (res.data.status === "ok") setCollectionPointsTotal(res.data.meta?.total ?? null); })
        .catch(() => { });
    }
    if (location.pathname === "/donations") {
      fetchWithCache("/donations/stats", { expireIn: 60000 })
        .then(res => { if (res.data.status === "ok" || res.data.success) setDonationsStats(res.data.data); })
        .catch(() => { });
    }
  }, [location.pathname, fetchWithCache]);

  const s = liveStats;
  const PAGE_TITLES = {
    "/dashboard": { title: t.overview, sub: s ? `${(s.users?.total || 0).toLocaleString()} ${t.users?.toLowerCase()} · ${(s.reports?.total || 0).toLocaleString()} ${t.reports?.toLowerCase()}` : t.dashboardSub },
    "/reports": { title: t.reports, sub: s ? `${(s.reports?.total || 0).toLocaleString()} ${t.totalCount} · ${(s.reports?.breakdown?.lost || 0).toLocaleString()} ${t.lost?.toLowerCase() || "lost"}` : t.reportsSub },
    "/users": { title: t.users, sub: s ? `${(s.users?.total || 0).toLocaleString()} ${t.registeredCount} · ${(s.users?.active || 0).toLocaleString()} ${t.active?.toLowerCase()}` : t.usersSub },
    "/partners": { title: t.partners, sub: s ? `${(s.partners?.total || 0).toLocaleString()} ${t.totalCount} · ${(s.partners?.pending || 0).toLocaleString()} ${t.pendingCountLabel}` : t.partnersSub },
    "/missions": { title: t.localMissions, sub: s ? `${(s.missions?.total || 0).toLocaleString()} ${t.missions?.toLowerCase()} · ${(s.missions?.inProgress || 0).toLocaleString()} ${t.inProgressCount}` : t.missionsSub },
    "/collection-points": { title: t.collectionPoints, sub: collectionPointsTotal !== null ? `${collectionPointsTotal.toLocaleString()} ${t.collectionPointsCount}` : t.collPointsSub },
    "/points": { title: t.pointsSystem, sub: s ? `${(s.points?.distributed?.total || 0).toLocaleString()} ${t.ptsDistributedCount}` : t.pointsSub },
    "/items": { title: t.physicalItems, sub: s ? `${(s.items?.total || 0).toLocaleString()} ${t.itemsInCatalog}` : t.itemsSub },
    "/donations": { title: t.donations, sub: donationsStats ? `${(donationsStats.totalDonations || donationsStats.total || 0).toLocaleString()} ${t.donationsCount} · ${(donationsStats.totalCollected || 0).toLocaleString()}€` : t.donationsSub },
    "/validation-donations": { title: t.validationDonationsTitle || "Donation Validation", sub: s ? `${(s.donationProofs?.pending || 0).toLocaleString()} ${t.pendingCountLabel}` : t.valDonationsSub },
    "/crowdfunding": { title: `${t.crowdfunding} (${t.futureLaunch})`, sub: s ? `${(s.crowdfunding?.totalCollected || 0).toLocaleString()}€ ${t.collected}` : t.crowdSub },
    "/analytics": { title: t.analytics, sub: t.analyticsSub },
    "/notifications": { title: t.notifications, sub: s ? `${(s.notifications?.total || 0).toLocaleString()} ${t.sentCount}` : t.notifsSub },
    "/settings": { title: t.settings, sub: t.settingsSub },
    "/contacts": { title: t.contacts, sub: contactsStats ? `${(contactsStats.all || 0).toLocaleString()} ${t.contacts?.toLowerCase()} · ${(contactsStats.active || 0).toLocaleString()} ${t.active?.toLowerCase()}` : "Manage contacts" },
    "/shopify-products": { title: t.shopifyProducts, sub: "Manage Shopify products" },
    "/faq": { title: t.faqTitle || "FAQ", sub: t.faqSub || "Manage FAQ content" },
    "/posts": { title: t.posts || "Posts (Temporary)", sub: t.managePostsDesc || "Manage community posts (chat messages)." },
  };

  const page = PAGE_TITLES[location.pathname] || { title: t.dashboard || "Dashboard", sub: "HESTEKA Admin" };

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("adminUser")); } catch { return null; }
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const updatedUser = JSON.parse(localStorage.getItem("adminUser"));
        if (updatedUser) setUser(updatedUser);
      } catch (err) { }
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);

  const initials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase()
    : "A";

  // Notifications State
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.get("/notifications/get-my-notifications?limit=10");
      if (res.data.status === "ok") {
        setNotifications(res.data.data);
        setUnreadCount(res.data.meta.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch personal notifications", err);
    }
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  // Listen to live socket events for Topbar dropdown
  useEffect(() => {
    const handleNewNotif = () => {
      fetchNotifs();
      fetchStats();
    };

    const handleRefetch = () => {
      fetchNotifs();
      fetchStats();
    };

    socket.on("notification:new", handleNewNotif);
    window.addEventListener("refetch-notifications", handleRefetch);
    window.addEventListener("refetch-stats", handleRefetch);
    
    return () => {
      socket.off("notification:new", handleNewNotif);
      window.removeEventListener("refetch-notifications", handleRefetch);
      window.removeEventListener("refetch-stats", handleRefetch);
    };
  }, [fetchNotifs, fetchStats]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark as read API
  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await api.patch(`/notifications/mark-as-read/${id}`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.patch("/notifications/mark-as-read/all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  const handleProfileUpdate = async () => {
    // Refresh profile data globally after successful update
    try {
      const profileRes = await api.get("/user/get-my-profile");
      if (profileRes.data.status === "ok") {
        localStorage.setItem("adminUser", JSON.stringify(profileRes.data.data));
        setUser(profileRes.data.data);
        window.dispatchEvent(new Event("user-profile-updated"));
      }
    } catch (err) {
      console.error("Failed to refresh profile after update", err);
    }
  };

  return (
    <header className="sticky top-0 z-[9997] bg-white border-b border-[#e8ddd0] px-4 md:px-6 h-[73px] flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden text-[#3a2a1a] p-1.5 -ml-1 hover:bg-[#f5f0e8] rounded-lg transition-colors"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-lg md:text-xl font-bold text-[#3a2a1a] truncate max-w-[150px] sm:max-w-none">{page.title}</h1>
          <p className="text-[10px] md:text-[11px] text-[#9a8a7a] mt-0.5 hidden sm:flex items-center gap-1.5">
            {page.sub}
            {location.pathname === "/dashboard" && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 text-green-600 font-bold ml-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  {onlineCount.toLocaleString()} {t.onlineRightNow || "online right now"}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <div className="flex gap-1 bg-[#f5f0e8] rounded-lg p-1">
          {["fr", "en"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${lang === l
                ? "bg-[#8B6914] text-white"
                : "text-[#9a8a7a] hover:text-[#3a2a1a]"
                }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative text-[#3a2a1a] text-lg hover:opacity-80 transition-opacity p-1"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm border border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Popup */}
          {showNotifs && (
            <div className="absolute top-10 right-0 w-80 bg-white border border-[#e8ddd0] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
              <div className="bg-[#f5f0e8] px-4 py-3 border-b border-[#e8ddd0] flex justify-between items-center">
                <h3 className="font-bold text-[#3a2a1a] text-sm">{t.notifications}</h3>
                <div className="flex gap-3 items-center">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-[10px] font-bold text-[#8B6914] hover:underline cursor-pointer"
                    >
                      {t.markAllRead || "Mark all read"}
                    </button>
                  )}
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifs(false)}
                    className="text-[10px] font-bold text-[#8B6914] hover:underline"
                  >
                    {t.viewAll}
                  </Link>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto flex flex-col">
                {notifications.filter(n => !n.isRead).length > 0 ? (
                  notifications.filter(n => !n.isRead).map((notif) => (
                    <div
                      key={notif._id}
                      onClick={() => handleMarkAsRead(notif._id, notif.isRead)}
                      className={`p-4 border-b border-[#f5f0e8] hover:bg-[#fcfaf7] cursor-pointer transition-colors ${!notif.isRead ? 'bg-orange-50/50' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-xs ${!notif.isRead ? 'font-bold text-[#3a2a1a]' : 'font-medium text-[#5a4a3a]'}`}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && <span className="w-2 h-2 bg-[#8B6914] rounded-full shrink-0 mt-1"></span>}
                      </div>
                      <p className="text-[10px] text-[#9a8a7a] line-clamp-2 leading-relaxed">
                        {notif.description}
                      </p>
                      <span className="text-[9px] text-[#c8b898] mt-2 block">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-[#9a8a7a] text-xs">
                    {t.noNotifs}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold text-sm cursor-pointer select-none hover:ring-2 hover:ring-[#8B6914] transition-all overflow-hidden"
          title={user ? `Edit Profile: ${user.firstName} ${user.lastName}` : "Admin"}
          onClick={() => setIsProfileModalOpen(true)}
        >
          {user?.profileImage?.secure_url ? (
            <img src={user.profileImage.secure_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
    </header>
  );
});

export default Topbar;
