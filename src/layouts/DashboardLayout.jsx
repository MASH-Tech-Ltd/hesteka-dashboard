import React, { useEffect, useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { Outlet } from "react-router-dom";
import { socket } from "../context/SocketContect";
import { toast } from "react-toastify";
import FCMListener from "../components/common/FCMListener";
import { Bell } from "lucide-react";
import { useLang } from "../context/LanguageContext";

const DashboardLayout = React.memo(() => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLang();

  useEffect(() => {
    const token = localStorage.getItem("adminAccessToken");
    if (!token) return;

    socket.auth = { token };
    socket.connect();

    const onConnect = () => {
      console.log("Connected to socket server");
    };

    const onDisconnect = () => {
      console.log("Disconnected from socket server");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const onNewNotification = (data) => {
      console.log("New live notification:", data);
      toast.info(
        <div>
          <strong className="block text-sm">{data?.title || t.newAlert || "New Alert"}</strong>
          <span className="text-xs">{data?.description || t.newNotificationDesc || "You have a new notification"}</span>
        </div>,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
          icon: <Bell className="w-5 h-5 text-blue-600" />,
        }
      );
    };

    const handleNewDonation = (data) => {
      if (data && data.donor) {
        if (data.status === "pending") {
          const msg = t.newDonationIntent 
            ? t.newDonationIntent.replace('{method}', data.method || 'donation').replace('{amount}', data.amount || '').replace('{donor}', data.donor) 
            : `🕒 A new ${data.method || 'donation'} intent of ${data.amount || ''}€ was initiated by ${data.donor}.`;
          toast.info(msg, {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: true,
          });
        } else {
          const msg = t.donationConfirmed
            ? t.donationConfirmed.replace('{method}', data.method || 'donation').replace('{amount}', data.amount || '').replace('{donor}', data.donor)
            : `🎉 Payment for ${data.method || 'donation'} of ${data.amount || ''}€ from ${data.donor} was confirmed via webhook!`;
          toast.success(msg, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      }
    };

    socket.on("notification:new", onNewNotification);
    socket.on("donation_new", handleNewDonation);

    return () => {
      socket.off("notification:new", onNewNotification);
      socket.off("donation_new", handleNewDonation);
    };
  }, [t]);
  return (
    <div className="flex min-h-screen bg-[#f5f0e8] overflow-x-hidden">
      <FCMListener />
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[9998] md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-52">
        <Topbar onToggleSidebar={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                 <div className="w-10 h-10 border-4 border-[#8B6914] border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[#8B6914] font-semibold tracking-widest uppercase text-xs animate-pulse">Loading Page...</p>
              </div>
            </div>
          }>
            <Outlet />
          </React.Suspense>
        </main>
      </div>
    </div>
  );
});

export default DashboardLayout;
