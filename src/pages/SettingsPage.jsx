import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { Users, Smartphone, Lock, Save, Plus, Database, Clock, Download, FileArchive, HardDrive } from "lucide-react";
import api from "../utils/api";
import ProfileModal from "../components/dashboard/ProfileModal";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const { t } = useLang();
  
  const [settings, setSettings] = useState({
    supportEmail: "",
    platformName: "",
    maintenanceMode: false,
    reportRadius: 50,
    localMissionRadius: 50
  });
  const [supportLink, setSupportLink] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [backupLogs, setBackupLogs] = useState([]);
  const [backupFiles, setBackupFiles] = useState([]);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [activeBackupTab, setActiveBackupTab] = useState("files");

  const fetchBackupLogs = async () => {
    try {
      const res = await api.get("/settings/backup-logs");
      if (res.data.status === "ok") {
        setBackupLogs(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch backup logs", err);
    }
  };

  const fetchBackupFiles = async () => {
    try {
      const res = await api.get("/settings/backup-files");
      if (res.data.status === "ok") {
        setBackupFiles(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch backup files", err);
    }
  };

  const handleDownloadBackup = async (filename) => {
    setDownloadingFile(filename);
    try {
      const res = await api.get(`/settings/download-backup/${filename}`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error("Failed to download backup", err);
      toast.error("Failed to download backup file");
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/settings/sync");
      if (res.data.status === "ok" || res.data.success) {
        toast.success(res.data.message || "Database synchronization completed successfully");
        fetchBackupLogs();
        fetchBackupFiles();
      } else {
        toast.error(res.data.message || "Failed to sync database");
      }
    } catch (err) {
      console.error("Failed to sync database", err);
      toast.error("An error occurred during database synchronization");
    } finally {
      setSyncing(false);
    }
  };

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
        setSettings(prev => ({
          ...prev,
          ...res.data.data,
          reportRadius: res.data.data.reportRadius ?? 50,
          localMissionRadius: res.data.data.localMissionRadius ?? 50
        }));
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchSupportLink = async () => {
    try {
      const res = await api.get("/support-link/get-support-link");
      if (res.data.status === "ok" && res.data.data) {
        setSupportLink(res.data.data.link);
      }
    } catch (err) {
      console.error("Failed to fetch support link", err);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
    fetchSupportLink();
    fetchBackupLogs();
    fetchBackupFiles();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.patch("/settings", settings);
      if (supportLink) {
        await api.post("/support-link/create-support-link", { link: supportLink });
      }
      toast.success("Settings and links updated successfully");
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Column 1: Admin Team & Database Backup History */}
        <div className="flex flex-col gap-4">
           {/* Admin Team Card */}
           <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5 w-full">
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

           {/* Backup Archives & Sync History Card */}
           <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
                   <Database className="w-4 h-4 text-[#8B6914]" /> Database Backups
                </h3>
                <div className="flex bg-[#fcfaf7] border border-[#e8ddd0] rounded-lg p-0.5">
                  <button
                    onClick={() => setActiveBackupTab("files")}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                      activeBackupTab === "files"
                        ? "bg-[#8B6914] text-white shadow-sm"
                        : "text-[#9a8a7a] hover:text-[#3a2a1a]"
                    }`}
                  >
                    Backup Archives ({backupFiles.length})
                  </button>
                  <button
                    onClick={() => setActiveBackupTab("logs")}
                    className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                      activeBackupTab === "logs"
                        ? "bg-[#8B6914] text-white shadow-sm"
                        : "text-[#9a8a7a] hover:text-[#3a2a1a]"
                    }`}
                  >
                    Sync Logs ({backupLogs.length})
                  </button>
                </div>
              </div>

              {activeBackupTab === "files" ? (
                <>
                  <p className="text-[10px] text-[#9a8a7a] leading-normal -mt-1">
                     Compressed JSON backup archives (.json.gz) stored on the server disk. Click download to save locally.
                  </p>
                  <div className="max-h-[350px] overflow-y-auto flex flex-col gap-2.5 pr-1">
                    {backupFiles.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[#9a8a7a] italic bg-[#fcfaf7] border border-dashed border-[#e8ddd0] rounded-xl">
                        No backup archives found in 'backups/' directory.
                      </div>
                    ) : (
                      backupFiles.map((file, idx) => (
                        <div key={idx} className="border border-[#e8ddd0] rounded-xl p-3 bg-[#fcfaf7] flex items-center justify-between gap-3 hover:border-[#8B6914] transition-all shadow-sm">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <div className="w-8 h-8 rounded-lg bg-[#f5f0e8] border border-[#e8ddd0] flex items-center justify-center text-[#8B6914] shrink-0">
                              <FileArchive className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold text-[#3a2a1a] truncate" title={file.filename}>
                                {file.filename}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-semibold text-[#8B6914] bg-[#f5f0e8] px-1.5 py-0.5 rounded border border-[#e8ddd0]">
                                  {file.sizeMB > 0.1 ? `${file.sizeMB} MB` : `${file.sizeKB} KB`}
                                </span>
                                <span className="text-[9px] text-[#9a8a7a] flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(file.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadBackup(file.filename)}
                            disabled={downloadingFile === file.filename}
                            className="bg-[#8B6914] text-white hover:bg-[#6a5010] p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50 shadow-sm"
                            title="Download backup file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">
                              {downloadingFile === file.filename ? "Downloading..." : "Download"}
                            </span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-[10px] text-[#9a8a7a] leading-normal -mt-1">
                     Read-only logs of database synchronization events.
                  </p>
                  <div className="max-h-[350px] overflow-y-auto flex flex-col gap-3 pr-1">
                     {backupLogs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[#9a8a7a] italic bg-[#fcfaf7] border border-dashed border-[#e8ddd0] rounded-xl">
                           No synchronization logs found.
                        </div>
                     ) : (
                        backupLogs.map((log, index) => (
                           <div key={index} className="border border-[#e8ddd0] rounded-xl p-3 bg-[#fcfaf7] flex flex-col gap-2 shadow-sm">
                              <div className="flex justify-between items-start">
                                 <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-[#9a8a7a]" />
                                    <span className="text-[10px] font-bold text-[#3a2a1a]">
                                       {new Date(log.timestamp).toLocaleString()}
                                    </span>
                                 </div>
                                 <div className="flex gap-1 items-center">
                                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                       log.status === "success" 
                                          ? "bg-green-100 text-green-600" 
                                          : log.status === "bypassed" 
                                          ? "bg-orange-100 text-orange-600" 
                                          : "bg-red-100 text-red-600"
                                    }`}>
                                       {log.status}
                                    </span>
                                    <span className="text-[8px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full uppercase font-semibold">
                                       {log.triggerType}
                                    </span>
                                 </div>
                              </div>
                              
                              {log.message && (
                                 <p className="text-[9px] text-[#5a4a3a] leading-relaxed bg-[#f5f0e8] p-1.5 rounded-lg border border-[#e8ddd0]">
                                    {log.message}
                                 </p>
                              )}

                              {log.recordsDetail && Object.keys(log.recordsDetail).length > 0 && (
                                 <div className="flex flex-col gap-1 mt-1">
                                    <span className="text-[8px] font-bold text-[#9a8a7a] uppercase">Synchronized Collections:</span>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 bg-white border border-[#e8ddd0] rounded-lg p-2.5 max-h-[120px] overflow-y-auto">
                                       {Object.entries(log.recordsDetail).map(([model, count]) => (
                                          <div key={model} className="flex justify-between text-[8px] text-[#5a4a3a] border-b border-gray-50 pb-0.5 last:border-b-0">
                                             <span className="font-semibold">{model}</span>
                                             <span>{count} records</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        ))
                     )}
                  </div>
                </>
              )}
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
              <div className="flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">Support Website Link</label>
                 <input 
                    type="url"
                    value={supportLink}
                    onChange={(e) => setSupportLink(e.target.value)}
                    placeholder="https://example.com/support"
                    className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#8B6914]"
                 />
                 <p className="text-[8px] text-[#9a8a7a] italic">Public link for external support or donations.</p>
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
                    <p className="text-xs font-bold text-[#3a2a1a]">{t.reportRadius}</p>
                    <p className="text-[9px] text-[#9a8a7a]">{t.defaultGeo}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={settings.reportRadius} 
                      onChange={(e) => {
                        const newRadius = Number(e.target.value);
                        setSettings({...settings, reportRadius: newRadius});
                      }}
                      className="w-20 bg-[#f5f0e8] border border-[#e8ddd0] rounded px-2 py-1 text-xs font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                    <span className="text-xs text-[#9a8a7a]">km</span>
                 </div>
              </div>
              <div className="flex items-center justify-between">
                 <div>
                    <p className="text-xs font-bold text-[#3a2a1a]">{t.localMissionRadius}</p>
                    <p className="text-[9px] text-[#9a8a7a]">{t.defaultGeo}</p>
                 </div>
                 <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={settings.localMissionRadius} 
                      onChange={(e) => {
                        const newRadius = Number(e.target.value);
                        setSettings({...settings, localMissionRadius: newRadius});
                      }}
                      className="w-20 bg-[#f5f0e8] border border-[#e8ddd0] rounded px-2 py-1 text-xs font-bold text-center outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                    />
                    <span className="text-xs text-[#9a8a7a]">km</span>
                 </div>
              </div>
              
              <div className="border-t border-[#e8ddd0] pt-4 flex flex-col gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#3a2a1a]">Database Synchronization</p>
                    <p className="text-[9px] text-[#9a8a7a]">Synchronizes local database records to the backup MongoDB cluster.</p>
                  </div>
                  <button 
                    onClick={handleSyncData}
                    disabled={syncing}
                    className="w-full mt-1 bg-[#8B6914] text-white text-[11px] font-bold py-2.5 rounded-xl hover:bg-[#6a5010] transition-colors disabled:opacity-50"
                  >
                    {syncing ? "Synchronizing..." : "Sync Data Now"}
                  </button>
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
