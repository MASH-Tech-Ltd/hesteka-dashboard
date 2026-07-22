import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";
import api from "../../utils/api";
import { socket } from "../../context/SocketContect";
import {
  LayoutDashboard,
  Flag,
  Users,
  Handshake,
  Phone,
  Map,
  MapPin,
  ShoppingBag,
  FileText,
  Coins,
  Package,
  Gift,
  Rocket,
  BarChart,
  Bell,
  HelpCircle,
  MessageSquare,
  Settings,
  LogOut,
  X,
} from "lucide-react";

const Sidebar = React.memo(({ isOpen, setIsOpen }) => {
  const { t } = useLang();
  const location = useLocation();
  const [stats, setStats] = React.useState(null);
  const [user, setUser] = React.useState(
    () =>
      JSON.parse(localStorage.getItem("adminUser")) || {
        firstName: "Admin",
        lastName: "",
      },
  );

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/user/get-my-profile");
        if (res.data.status === "ok" && res.data.data) {
          setUser(res.data.data);
          localStorage.setItem("adminUser", JSON.stringify(res.data.data));
          window.dispatchEvent(new Event("user-profile-updated"));
        }
      } catch (err) {
        console.error("Failed to fetch admin profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminRefreshToken");
    window.location.href = "/login";
  };

  const fetchStats = React.useCallback(async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.data.status === "ok") {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Sidebar stats fetch failed", err);
    }
  }, []);

  React.useEffect(() => {
    fetchStats();

    // Refresh stats on real-time events
    const handleRefetch = () => fetchStats();

    // Listen to various events that should trigger a stats refresh
    socket.on("notification:new", handleRefetch);
    socket.on("report_new", handleRefetch);
    socket.on("donation_new", handleRefetch);
    window.addEventListener("refetch-stats", handleRefetch);

    // Refresh stats every minute
    const interval = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(interval);
      socket.off("notification:new", handleRefetch);
      socket.off("report_new", handleRefetch);
      socket.off("donation_new", handleRefetch);
      window.removeEventListener("refetch-stats", handleRefetch);
    };
  }, [fetchStats]);

  const navSections = (t, stats) => [
    {
      label: t.principal,
      items: [
        {
          icon: LayoutDashboard,
          key: "overview",
          path: "/dashboard",
          badge: null,
        },
        {
          icon: Flag,
          key: "reports",
          path: "/reports",
          badge:
            stats?.reports?.breakdown?.lost > 0
              ? stats.reports.breakdown.lost
              : null,
          badgeColor: "bg-red-600",
        },
        { icon: Users, key: "users", path: "/users", badge: null },
        { icon: MapPin, key: "liveMap", path: "/live-map", badge: null },
        {
          icon: Handshake,
          key: "partners",
          path: "/partners",
          badge: stats?.partners?.pending > 0 ? stats.partners.pending : null,
          badgeColor: "bg-orange-500",
        },
        { icon: Phone, key: "contacts", path: "/contacts", badge: null },
      ],
    },
    {
      label: t.community,
      items: [
        { icon: MessageSquare, key: "posts", path: "/posts", badge: null },
        { icon: Map, key: "localMissions", path: "/missions", badge: null },
        {
          icon: MapPin,
          key: "collectionPoints",
          path: "/collection-points",
          badge: null,
        },
      ],
    },
    {
      label: t.economy,
      items: [
        {
          icon: ShoppingBag,
          key: "shopifyProducts",
          path: "/shopify-products",
          badge: null,
        },
        {
          icon: FileText,
          key: "validation-donations",
          path: "/validation-donations",
          badge:
            stats?.donationProofs?.pending > 0
              ? stats.donationProofs.pending
              : null,
          badgeColor: "bg-orange-500",
        },
        { icon: Coins, key: "pointsSystem", path: "/points", badge: null },
        { icon: Package, key: "physicalItems", path: "/items", badge: null },
        { icon: Gift, key: "donations", path: "/donations", badge: null },
        {
          icon: Rocket,
          key: "crowdfunding",
          path: "/crowdfunding",
          badge: null,
        },
      ],
    },
    {
      label: t.config,
      items: [
        { icon: BarChart, key: "analytics", path: "/analytics", badge: null },
        {
          icon: Bell,
          key: "notifications",
          path: "/notifications",
          badge: null,
        },
        {
          icon: MessageSquare,
          key: "supportMessages",
          path: "/support-messages",
          badge:
            stats?.supportMessages?.pending > 0
              ? stats.supportMessages.pending
              : null,
          badgeColor: "bg-red-600",
        },
        { icon: HelpCircle, key: "faq", path: "/faq", badge: null },
        { icon: Settings, key: "settings", path: "/settings", badge: null },
      ],
    },
  ];

  const sections = navSections(t, stats);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen w-52 bg-[#3a2a1a] flex flex-col overflow-y-auto z-[9999] transform transition-transform duration-300 md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      {/* Logo */}
      <div className="bg-[#2a1a0a] px-3 h-[73px] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/*  <span className="text-white font-bold text-base tracking-widest">HESTEKA</span> */}
          <img
            src="/hestekalogo.png"
            alt="HESTEKA Logo"
            className="h-12 w-auto object-contain"
          />
          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            {t.admin}
          </span>
        </div>

        {/* Close Button for Mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden text-[#c8b898] hover:text-white p-1 transition-colors"
          aria-label="Close Sidebar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* User */}
      <div className="px-3 py-3 border-b border-[#5a4a3a]">
        <div className="w-8 h-8 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold text-sm mb-1.5 uppercase overflow-hidden">
          {user?.profileImage?.secure_url ? (
            <img
              src={user.profileImage.secure_url}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            user?.firstName?.charAt(0) || "A"
          )}
        </div>
        <p className="text-white text-[12px] font-semibold truncate">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[#a09080] text-[10px] capitalize">{user.role}</p>
      </div>

      {/* Nav */}
      {sections.map((section) => (
        <div key={section.label} className="py-2">
          <p className="text-[#a09080] text-[9px] font-bold tracking-widest px-3 py-1">
            {section.label}
          </p>
          {section.items.map((item) => (
            <Link
              to={item.path}
              key={item.key}
              onClick={() => setIsOpen && setIsOpen(false)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#c8b898] hover:bg-[#5a4a3a] hover:text-white transition-colors ${
                location.pathname === item.path ? "bg-[#8B6914] text-white" : ""
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{t[item.key]}</span>
              {item.badge && (
                <span
                  className={`${item.badgeColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full`}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      ))}
      {/* Logout */}
      <div className="mt-auto p-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[12px] text-[#c8b898] border border-[#5a4a3a] rounded hover:bg-[#5a4a3a] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t.logout}
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
