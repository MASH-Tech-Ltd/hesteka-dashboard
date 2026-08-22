import React, { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import api from "../utils/api";
import { toast } from "react-toastify";
import { useLang } from "../context/LanguageContext";

const ModalSkeleton = () => (
  <div className="border border-[#e8ddd0] rounded-xl p-5 bg-[#fcfaf7] flex flex-col gap-4 shadow-sm animate-pulse">
    <div className="flex justify-between items-center border-b border-[#e8ddd0] pb-3">
      <div className="h-5 w-1/3 bg-gray-200 rounded"></div>
      <div className="w-12 h-6 bg-gray-200 rounded-full"></div>
    </div>
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-16 bg-gray-200 rounded"></div>
      <div className="h-10 w-full bg-gray-200 rounded-lg"></div>
    </div>
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-24 bg-gray-200 rounded"></div>
      <div className="h-20 w-full bg-gray-200 rounded-lg"></div>
    </div>
    <div className="mt-auto h-9 w-32 bg-gray-200 rounded-lg self-end"></div>
  </div>
);

export default function AppModalsPage() {
  const { t } = useLang();
  const [modals, setModals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchModals = async () => {
    try {
      setLoading(true);
      const res = await api.get("/appmodal/get-all-modals");
      if (res.data.status === "ok") {
        setModals(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch modals", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModals();
  }, []);

  const handleModalUpdate = async (id, data) => {
    try {
      const res = await api.patch(`/appmodal/update-modal/${id}`, data);
      if (res.data.status === "ok") {
        toast.success(t.modalUpdated || "Modal updated successfully");
        setModals((prevModals) => 
          prevModals.map(modal => modal._id === id ? res.data.data : modal)
        );
      }
    } catch (err) {
      console.error("Failed to update modal", err);
      toast.error(t.modalUpdateFailed || "Failed to update modal");
    }
  };

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex flex-col gap-5">
        <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#8B6914]" /> {t.appModalsConfig || "App Modals Configuration"}
        </h3>
        <p className="text-xs text-[#9a8a7a]">
          {t.appModalsDesc || "Manage dynamic modals that appear in the mobile application. Ensure active status is updated to prompt users."}
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-2">
          {loading ? (
            <>
              <ModalSkeleton />
              <ModalSkeleton />
              <ModalSkeleton />
            </>
          ) : (
            modals.map((modal) => (
              <div key={modal._id} className="border border-[#e8ddd0] rounded-xl p-5 bg-[#fcfaf7] flex flex-col gap-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-[#e8ddd0] pb-3">
                  <h4 className="font-bold text-[#3a2a1a] text-base capitalize flex items-center gap-2">
                    {modal.type === "region_department" ? (t.regionDeptModal || "Region & Department") : modal.type} {t.modalWord || "Modal"}
                  </h4>
                  <div 
                    onClick={() => handleModalUpdate(modal._id, { isActive: !modal.isActive })}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${modal.isActive ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform ${modal.isActive ? 'translate-x-6' : ''}`} />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.titleLabel || "Title"}</label>
                  <input 
                    type="text"
                    value={modal.title || ""}
                    onChange={(e) => {
                      const newModals = [...modals];
                      const index = newModals.findIndex(m => m._id === modal._id);
                      newModals[index].title = e.target.value;
                      setModals(newModals);
                    }}
                    className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-[#8B6914] shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.descriptionLabel || "Description"}</label>
                  <textarea 
                    value={modal.description || ""}
                    onChange={(e) => {
                      const newModals = [...modals];
                      const index = newModals.findIndex(m => m._id === modal._id);
                      newModals[index].description = e.target.value;
                      setModals(newModals);
                    }}
                    className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-[#8B6914] min-h-[80px] shadow-sm resize-none"
                  />
                </div>
                
                {modal.type === "update" && (
                  <div className="flex flex-col gap-4 mt-2 border-t border-[#e8ddd0] pt-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.targetPlatform || "Target Platform"}</label>
                      <select 
                        value={modal.platform || "all"}
                        onChange={(e) => {
                          const newModals = [...modals];
                          const index = newModals.findIndex(m => m._id === modal._id);
                          newModals[index].platform = e.target.value;
                          setModals(newModals);
                        }}
                        className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2.5 text-xs outline-none focus:border-[#8B6914] shadow-sm max-w-xs"
                      >
                        <option value="all">{t.allPlatforms || "All Platforms"}</option>
                        <option value="ios">{t.iosOnly || "iOS Only"}</option>
                        <option value="android">{t.androidOnly || "Android Only"}</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      {/* iOS Configuration */}
                      {(modal.platform === "all" || modal.platform === "ios") && (
                        <div className="flex flex-col gap-3 bg-[#f5f0e8] p-3 rounded-lg border border-[#e8ddd0]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#3a2a1a]">{t.iosConfig || "iOS Configuration"}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.minIosVersion || "Min iOS Version"}</label>
                            <input 
                              type="text"
                              value={modal.iosMinVersion || ""}
                              onChange={(e) => {
                                const newModals = [...modals];
                                const index = newModals.findIndex(m => m._id === modal._id);
                                newModals[index].iosMinVersion = e.target.value;
                                setModals(newModals);
                              }}
                              placeholder="e.g. 1.0.0"
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#8B6914] shadow-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.appStoreLink || "App Store Link"}</label>
                            <input 
                              type="url"
                              value={modal.appstoreLink || ""}
                              onChange={(e) => {
                                const newModals = [...modals];
                                const index = newModals.findIndex(m => m._id === modal._id);
                                newModals[index].appstoreLink = e.target.value;
                                setModals(newModals);
                              }}
                              placeholder="https://apps.apple.com/..."
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#8B6914] shadow-sm"
                            />
                          </div>
                        </div>
                      )}

                      {/* Android Configuration */}
                      {(modal.platform === "all" || modal.platform === "android") && (
                        <div className="flex flex-col gap-3 bg-[#f5f0e8] p-3 rounded-lg border border-[#e8ddd0]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#3a2a1a]">{t.androidConfig || "Android Configuration"}</span>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.minAndroidVersion || "Min Android Version"}</label>
                            <input 
                              type="text"
                              value={modal.androidMinVersion || ""}
                              onChange={(e) => {
                                const newModals = [...modals];
                                const index = newModals.findIndex(m => m._id === modal._id);
                                newModals[index].androidMinVersion = e.target.value;
                                setModals(newModals);
                              }}
                              placeholder="e.g. 1.0.0"
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#8B6914] shadow-sm"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[9px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.playStoreLink || "Play Store Link"}</label>
                            <input 
                              type="url"
                              value={modal.playstoreLink || ""}
                              onChange={(e) => {
                                const newModals = [...modals];
                                const index = newModals.findIndex(m => m._id === modal._id);
                                newModals[index].playstoreLink = e.target.value;
                                setModals(newModals);
                              }}
                              placeholder="https://play.google.com/..."
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#8B6914] shadow-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => handleModalUpdate(modal._id, { 
                    title: modal.title, 
                    description: modal.description, 
                    platform: modal.platform,
                    iosMinVersion: modal.iosMinVersion,
                    androidMinVersion: modal.androidMinVersion,
                    appstoreLink: modal.appstoreLink,
                    playstoreLink: modal.playstoreLink
                  })}
                  className="mt-auto bg-[#8B6914] text-white text-xs font-bold py-2.5 rounded-lg hover:bg-[#6a5010] transition-colors self-end px-6 shadow-sm"
                >
                  {t.saveChanges || "Save Changes"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
