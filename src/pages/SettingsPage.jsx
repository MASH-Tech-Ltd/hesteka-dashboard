import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { Users, Smartphone, Lock, Save, Plus } from "lucide-react";
import api from "../utils/api";
import ProfileModal from "../components/dashboard/ProfileModal";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const { t } = useLang();
  
  const [settings, setSettings] = useState({
    supportEmail: "",
    platformName: "",
    maintenanceMode: false,
    alertRadius: 5
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);

  const fetchAdmins = async () => {
    try {
      const res = await api.get("/user/get-all-user?role=admin");
      if (res.data.status === "ok") {
        setAdmins(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch admins", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings");
      if (res.data.status === "ok") {
        setSettings(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.patch("/settings", settings);
      toast.success(`${t.supportEmailLabel} is now ${settings.supportEmail}`);
    } catch (err) {
      console.error("Failed to save settings", err);
      toast.error("Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAdminUpdate = async () => {
    fetchAdmins();
    const currentUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
    if (currentUser && selectedAdmin && currentUser._id === selectedAdmin._id) {
      try {
        const profileRes = await api.get("/user/get-my-profile");
        if (profileRes.data.status === "ok") {
          localStorage.setItem("adminUser", JSON.stringify(profileRes.data.data));
          window.dispatchEvent(new Event("user-profile-updated"));
        }
      } catch (err) {
        console.error("Failed to refresh profile after update", err);
      }
    }
  };

  const logins = [
    { type: "Connexion admin \u2014 Emma", time: "Aujourd'hui 10h04", color: "bg-green-500" },
    { type: "Modification bar\u00E8me points", time: "Hier 16h30", color: "bg-orange-500" },
    { type: "Sauvegarde automatique", time: "Hier 02h00", color: "bg-blue-500" },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Admin Team Card */}
        <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5">
           <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
             <Users className="w-4 h-4 text-[#8B6914]" /> {t.adminTeam}
           </h3>
           <div className="flex flex-col gap-4">
              {admins.map((admin, i) => (
                <div 
                  key={i} 
                  onClick={() => setSelectedAdmin(admin)}
                  className="flex items-center justify-between border border-[#e8ddd0] rounded-xl p-3 bg-[#fcfaf7] cursor-pointer hover:border-[#8B6914] transition-colors"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold overflow-hidden">
                        {admin.profileImage?.secure_url ? (
                          <img src={admin.profileImage.secure_url} alt="Admin" className="w-full h-full object-cover" />
                        ) : (
                          (admin.firstName?.charAt(0) || "A").toUpperCase()
                        )}
                      </div>
                      <div>
                         <p className="text-xs font-bold text-[#3a2a1a]">{admin.firstName} {admin.lastName}</p>
                         <p className="text-[9px] text-[#9a8a7a]">{admin.email}</p>
                      </div>
                   </div>
                   <span className="bg-green-100 text-green-600 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                     {admin.role?.replace('_', ' ')}
                   </span>
                </div>
              ))}
              <button className="bg-[#f5f0e8] text-[#8B6914] text-[11px] font-bold py-3 rounded-xl border border-dashed border-[#8B6914] hover:bg-[#e8d5b0] transition-colors">
                  <Plus className="w-4 h-4 inline-block mr-1" /> {t.inviteAdmin}
              </button>
           </div>
        </div>

        {/* Support Settings Card */}
        <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5">
           <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
             <Save className="w-4 h-4 text-[#8B6914]" /> {t.supportSettings}
           </h3>
           <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.platformNameLabel}</label>
                 <input 
                    type="text"
                    value={settings.platformName}
                    onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                    placeholder="Hesteka"
                    className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#8B6914]"
                 />
                 <p className="text-[8px] text-[#9a8a7a] italic">{t.platformNameSub}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.supportEmailLabel}</label>
                 <input 
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                    placeholder="support@hesteka.com"
                    className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#8B6914]"
                 />
                 <p className="text-[8px] text-[#9a8a7a] italic">{t.supportEmailSub}</p>
              </div>
              <button 
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="mt-2 bg-[#8B6914] text-white text-[11px] font-bold py-2.5 rounded-xl hover:bg-[#6a5010] transition-colors disabled:opacity-50"
              >
                {savingSettings ? t.saving : t.saveChanges}
              </button>
           </div>
        </div>

        {/* Application Config Card */}
        <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5">
           <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
             <Smartphone className="w-4 h-4 text-[#8B6914]" /> {t.application}
           </h3>
           <div className="flex flex-col gap-6">
               <div className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold text-[#3a2a1a]">{t.autoAlerts}</p>
                    <p className="text-[9px] text-[#9a8a7a]">{t.pushNotifs}</p>
                 </div>
                 <div className="w-10 h-5 bg-[#8B6914] rounded-full p-1 cursor-pointer">
                    <div className="w-3 h-3 bg-white rounded-full translate-x-5 transition-transform" />
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold text-[#3a2a1a]">{t.maintenanceMode}</p>
                    <p className="text-[9px] text-[#9a8a7a]">{t.disableAccess}</p>
                 </div>
                 <div 
                   onClick={() => {
                     const newMode = !settings.maintenanceMode;
                     setSettings({...settings, maintenanceMode: newMode});
                     api.patch("/settings", { maintenanceMode: newMode });
                   }}
                   className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${settings.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}
                 >
                    <div className={`w-3 h-3 bg-white rounded-full transition-transform ${settings.maintenanceMode ? 'translate-x-5' : ''}`} />
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold text-[#3a2a1a]">{t.alertRadius}</p>
                    <p className="text-[9px] text-[#9a8a7a]">{t.defaultGeo}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={settings.alertRadius} 
                      onChange={(e) => {
                        const newRadius = Number(e.target.value);
                        setSettings({...settings, alertRadius: newRadius});
                        api.patch("/settings", { alertRadius: newRadius });
                      }}
                      className="w-12 bg-[#f5f0e8] border border-[#e8ddd0] rounded px-2 py-1 text-xs font-bold text-center outline-none" 
                    />
                    <span className="text-xs text-[#9a8a7a]">km</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <ProfileModal
        isOpen={!!selectedAdmin}
        onClose={() => setSelectedAdmin(null)}
        user={selectedAdmin}
        onUpdate={handleAdminUpdate}
      />
    </div>
  );
}
