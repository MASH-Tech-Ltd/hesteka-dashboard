import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import CRUDModal from "../components/common/CRUDModal";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { Target, Plus, X, MapPin, Users, Check } from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "100%" };
const libraries = ['places'];

export default function MissionsPage() {
  const { t } = useLang();
  const [missions, setMissions] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sort: "descending",
  });

  const [selectedMission, setSelectedMission] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  const [participantsModal, setParticipantsModal] = useState({
    isOpen: false,
    loading: false,
    missionTitle: "",
    data: [],
  });

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = { ...queryParams };
      // Keep status even if "all" because backend defaults to "active"
      const queryString = new URLSearchParams(q).toString();

      const [missionsRes, statsRes] = await Promise.all([
        api.get(`/local-missions/get-all-local-missions?${queryString}`),
        api.get("/admin/stats/missions"),
      ]);

      if (missionsRes.data.status === "ok") {
        setMissions(missionsRes.data.data || []);
        setMeta(missionsRes.data.meta);
      }
      if (statsRes.data.status === "ok") {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch missions", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setEditingMission(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (mission) => {
    setEditingMission({
      ...mission,
      missionDate: mission.missionDate,
      isIndefiniteDate: !mission.missionDate,
    });
    setIsModalOpen(true);
  };

  const handleOpenView = async (id) => {
    try {
      const res = await api.get(
        `/local-missions/get-single-local-mission/${id}`,
      );
      if (res.data.status === "ok") {
        setSelectedMission(res.data.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load details", err);
    }
  };

  const handleOpenParticipants = async (m) => {
    setParticipantsModal({ isOpen: true, loading: true, missionTitle: m.title, data: [] });
    try {
      const res = await api.get(`/local-missions/get-local-mission-participants/${m._id}`);
      if (res.data.status === "ok") {
        setParticipantsModal(prev => ({ ...prev, loading: false, data: res.data.data }));
      }
    } catch (err) {
      toast.error(t.errorFetchingParticipants || "Failed to load participants");
      setParticipantsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleApproveParticipant = async (participationId) => {
    try {
      const res = await api.patch(`/local-missions/approve-local-mission/${participationId}`);
      if (res.data.status === "ok") {
        toast.success(t.participantApproved || "Participant approved and points awarded");
        setParticipantsModal(prev => ({
          ...prev,
          data: prev.data.map(p => p._id === participationId ? { ...p, status: "completed" } : p)
        }));
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve participant");
    }
  };

  const handleRejectParticipant = async (participationId) => {
    try {
      const res = await api.patch(`/local-missions/reject-local-mission/${participationId}`);
      if (res.data.status === "ok") {
        toast.success(t.participantRejected || "Participant rejected");
        setParticipantsModal(prev => ({
          ...prev,
          data: prev.data.map(p => p._id === participationId ? { ...p, status: "rejected" } : p)
        }));
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject participant");
    }
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      const data = new FormData();
      let hasLoc = false;
      let lat = null,
        lng = null;

      Object.keys(formData).forEach((key) => {
        if (key === "latitude") {
          hasLoc = true;
          lat = formData[key];
        } else if (key === "longitude") {
          hasLoc = true;
          lng = formData[key];
        } else if (key === "isIndefiniteDate") {
          // Do not append this to FormData directly
        } else if (key === "missionDate") {
          if (formData.isIndefiniteDate) {
            data.append("missionDate", "");
          } else if (formData[key]) {
            data.append(key, formData[key]);
          }
        } else if (formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      if (hasLoc && lat && lng) {
        data.append(
          "location",
          JSON.stringify({
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          }),
        );
      }

      if (editingMission) {
        await api.patch(
          `/local-missions/update-local-mission/${editingMission._id}`,
          data,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
      } else {
        await api.post("/local-missions/create-local-mission", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setIsModalOpen(false);
      toast.success(
        editingMission
          ? "Mission updated successfully"
          : "Mission created successfully",
      );
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteMissionTitle || "Delete Mission",
      message:
        t.confirmDeleteMission ||
        "Are you sure you want to delete this mission?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/local-missions/delete-local-mission/${id}`);
          toast.success("Mission deleted successfully");
          fetchData();
        } catch (err) {
          toast.error(err.response?.data?.message || "Delete failed.");
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const missionFields = [
    { name: "title", label: t.titleLabel || "Title", required: true },
    {
      name: "description",
      label: t.descriptionLabel || "Description",
      type: "textarea",
      required: true,
    },
    {
      name: "missionDate",
      label: t.dateLabel || "Date",
      type: "date",
      required: true,
      allowIndefinite: true,
      indefiniteLabel: t.indefiniteDuration || "No set date",
      indefiniteKey: "isIndefiniteDate",
    },
    { name: "address", label: t.address || "Address", required: true },
    {
      name: "latitude",
      label: t.latitude || "Latitude",
      type: "number",
      required: true,
    },
    {
      name: "longitude",
      label: t.longitude || "Longitude",
      type: "number",
      required: true,
    },
    {
      name: "points",
      label: t.points || "Points Reward",
      type: "number",
      required: true,
    },
    { name: "duration", label: t.durationLabel || "Duration", required: true },
    { name: "image", label: t.missionPhoto || "Mission Photo", type: "file" },
  ];

  const columns = [
    {
      header: t.localMissions || "MISSION",
      width: "30%",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5f0e8] flex items-center justify-center text-xl overflow-hidden shrink-0 border border-[#e8ddd0]">
            {m.photo?.secure_url ? (
              <img
                src={m.photo.secure_url}
                alt={m.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Target className="w-5 h-5 text-[#8B6914]" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#3a2a1a] truncate max-w-[150px]">
              {m.title || "N/A"}
            </span>
            <span className="text-[10px] text-[#9a8a7a] truncate max-w-[150px]">
              {m.address || t.noAddress}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t.partnerRole || "PARTNER",
      width: "15%",
      cell: (m) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
            {(
              m.partner?.company?.[0] ||
              m.partner?.firstName?.[0] ||
              "P"
            ).toUpperCase()}
          </div>
          <span className="text-xs text-[#3a2a1a] font-medium truncate max-w-[100px]">
            {m.partner?.company || m.partner?.firstName || "N/A"}
          </span>
        </div>
      ),
    },
    {
      header: t.dateLabel || "DATE",
      width: "10%",
      cell: (m) => m.missionDate ? new Date(m.missionDate).toLocaleDateString() : (t.indefiniteDuration || "No set date"),
    },
    {
      header: t.points || "POINTS",
      width: "10%",
      cell: (m) => (
        <span className="font-bold text-orange-600">+{m.points} pts</span>
      ),
    },
    {
      header: t.requestedLabel || "REQUESTED",
      align: "center",
      width: "10%",
      cell: (m) => (
        m.pendingRequestsCount > 0 ? (
          <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">
            {m.pendingRequestsCount}
          </span>
        ) : (
          <span className="font-bold">0</span>
        )
      ),
    },
    {
      header: t.participants || "PARTICIPANTS",
      align: "center",
      width: "10%",
      cell: (m) => (
        <span className="font-bold">{m.participantsCount || 0}</span>
      ),
    },
    {
      header: t.statusLabel || "STATUT",
      width: "10%",
      cell: (m) => <StatusBadge status={m.status} />,
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      width: "15%",
      cell: (m) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => handleOpenParticipants(m)}
            className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-green-200 transition-colors"
          >
            {t.participantsBtn || "Participants"}
          </button>
          <button
            onClick={() => handleOpenView(m._id)}
            className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            {t.viewBtn}
          </button>
          <button
            onClick={() => handleOpenEdit(m)}
            className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-orange-200 transition-colors"
          >
            {t.editBtn}
          </button>
          <button
            onClick={() => handleDelete(m._id)}
            className="bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            {t.cancelBtn}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          loading={loading}
          label={t.inProgressLabel}
          value={{
            text: stats?.inProgress?.toLocaleString() || "0",
            color: "text-[#3a2a1a]",
          }}
          color="bg-orange-500"
        />
        <StatCard
          loading={loading}
          label={t.toComeLabel || "To Come"}
          value={{
            text: stats?.toCome?.toLocaleString() || "0",
            color: "text-[#3a2a1a]",
          }}
          color="bg-blue-500"
        />
        <StatCard
          loading={loading}
          label={t.finishedLabel}
          value={{
            text: stats?.finished?.toLocaleString() || "0",
            color: "text-[#3a2a1a]",
          }}
          color="bg-green-500"
        />
        <StatCard
          loading={loading}
          label={t.pointsAttributed}
          value={{
            text: stats?.pointsAttributed?.toLocaleString() || "0",
            color: "text-orange-500",
          }}
          color="bg-[#8B6914]"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <FilterBar
          onSearch={(val) =>
            setQueryParams((p) =>
              p.search === val ? p : { ...p, search: val, page: 1 },
            )
          }
          onFilterChange={(name, val) =>
            setQueryParams((p) =>
              p[name] === val ? p : { ...p, [name]: val, page: 1 },
            )
          }
          onSortChange={(sortBy, sort) =>
            setQueryParams((p) =>
              p.sortBy === sortBy && p.sort === sort
                ? p
                : { ...p, sortBy, sort, page: 1 },
            )
          }
          related={true}
          filters={[
            {
              name: "status",
              label: t.allStatuses || "All statuses",
              options: [
                { label: t.active || "Active", value: "active" },
                { label: t.inactive || "Inactive", value: "inactive" },
              ],
            },
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.nameAsc || "Name (A-Z)", value: "name:ascending" },
            {
              label: t.ptsDesc || "Points (Highest)",
              value: "points:descending",
            },
          ]}
          actionButton={
            <button
              onClick={handleOpenAdd}
              className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t.addMission || "Add Mission"}
            </button>
          }
        />
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={missions}
            loading={loading}
            emptyMessage={t.noMissionsFound || "No missions found."}
          />
        </div>
        <div className="bg-[#fcfaf7]">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
          />
        </div>
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMission ? t.editMissionTitle : t.createMissionTitle}
        fields={missionFields}
        initialData={editingMission}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      {isViewModalOpen && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
                <Target className="w-5 h-5 text-[#8B6914]" /> {t.viewBtn}:{" "}
                {selectedMission.title}
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.generalInfo || "General Information"}
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-[#9a8a7a]">{t.titleLabel || "Title"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedMission.title}
                    </span>
                    <span className="text-[#9a8a7a]">
                      {t.statusLabel || "Status"}:
                    </span>
                    <span className="font-bold uppercase text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full w-fit">
                      {selectedMission.status}
                    </span>
                    <span className="text-[#9a8a7a]">{t.address || "Address"}:</span>
                    <span
                      className="font-medium text-[#3a2a1a] truncate"
                      title={selectedMission.address}
                    >
                      {selectedMission.address}
                    </span>
                    <span className="text-[#9a8a7a]">{t.durationLabel || "Duration"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedMission.duration || "N/A"}
                    </span>
                    <span className="text-[#9a8a7a]">{t.points || "Points"}:</span>
                    <span className="font-bold text-orange-600">
                      +{selectedMission.points} pts
                    </span>
                    <span className="text-[#9a8a7a]">{t.dateLabel || "Date"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedMission.missionDate ? new Date(selectedMission.missionDate).toLocaleDateString() : (t.indefiniteDuration || "No set date")}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.partner || "Partner"}
                  </h3>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#8B6914] text-white flex items-center justify-center font-bold overflow-hidden border border-[#e8ddd0]">
                      {(
                        selectedMission.partner?.company?.[0] ||
                        selectedMission.partner?.firstName?.[0] ||
                        "P"
                      ).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[#3a2a1a]">
                        {selectedMission.partner?.company ||
                          selectedMission.partner?.firstName}
                      </span>
                      <span className="text-xs text-[#9a8a7a]">
                        {selectedMission.partner?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#f5f0e8] p-4 rounded-xl">
                <h3 className="font-bold text-[#3a2a1a] text-sm">
                  {t.descriptionLabel || "Description"}
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedMission.description || t.noDescription}
                </p>
              </div>

              {selectedMission.location?.coordinates &&
                selectedMission.location.coordinates.length === 2 && (
                  <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-[#3a2a1a] border-b pb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#8B6914]" /> {t.localisationLabel || "Location"}
                    </h3>
                    <div className="h-64 rounded-xl overflow-hidden shadow-inner border border-[#e8ddd0]">
                      {!isLoaded ? (
                        <div className="w-full h-full bg-[#f5f0e8] animate-pulse" />
                      ) : (
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={{
                            lat: selectedMission.location.coordinates[1],
                            lng: selectedMission.location.coordinates[0],
                          }}
                          zoom={14}
                          options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                          }}
                        >
                          <Marker
                            position={{
                              lat: selectedMission.location.coordinates[1],
                              lng: selectedMission.location.coordinates[0],
                            }}
                          />
                        </GoogleMap>
                      )}
                    </div>
                  </div>
                )}

              {selectedMission.photo?.secure_url && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.missionPhoto || "Mission Photo"}
                  </h3>
                  <img
                    src={selectedMission.photo.secure_url}
                    alt="Mission"
                    className="w-full max-h-64 object-cover rounded-lg border border-[#e8ddd0] shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() =>
          !confirmLoading &&
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />

      {participantsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl min-h-[500px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center bg-white z-10">
              <h2 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#8B6914]" /> {t.participantsOf || "Participants:"} {participantsModal.missionTitle}
              </h2>
              <button
                onClick={() => setParticipantsModal(prev => ({ ...prev, isOpen: false }))}
                className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfaf7]">
              {participantsModal.loading ? (
                <div className="p-8 text-center text-[#9a8a7a]">{t.loading || "Loading..."}</div>
              ) : participantsModal.data.length === 0 ? (
                <div className="p-8 text-center text-[#9a8a7a]">{t.noParticipants || "No participants found for this mission."}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-white sticky top-0 border-b border-[#e8ddd0]">
                      <tr>
                        <th className="p-4 text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">{t.user || "User"}</th>
                        <th className="p-4 text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">{t.email || "Email"}</th>
                        <th className="p-4 text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">{t.dateLabel || "Date"}</th>
                        <th className="p-4 text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider">{t.statusLabel || "Status"}</th>
                        <th className="p-4 text-[10px] font-bold text-[#8a7a6a] uppercase tracking-wider text-right">{t.actionsLabel || "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0e8d8]">
                      {participantsModal.data.map(p => (
                        <tr key={p._id} className="hover:bg-white transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#f5f0e8] overflow-hidden flex items-center justify-center shrink-0 border border-[#e8ddd0]">
                                {p.user?.profileImage?.secure_url ? (
                                  <img src={p.user.profileImage.secure_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-[#8B6914] font-bold text-xs">
                                    {(p.user?.firstName?.[0] || 'U').toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-[#3a2a1a] text-sm truncate max-w-[250px]">{p.user?.firstName} {p.user?.lastName}</span>
                                {p.user?.phone && (
                                  <span className="text-xs text-[#9a8a7a] mt-0.5">{p.user.phone}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="text-sm text-[#5a4a3a] truncate max-w-[250px]" title={p.user?.email}>{p.user?.email}</span>
                              {(p.user?.address || p.user?.postalCode || p.user?.country) && (
                                <span className="text-xs text-[#9a8a7a] truncate max-w-[300px] mt-0.5" title={[p.user?.address, p.user?.postalCode, p.user?.country].filter(Boolean).join(', ')}>
                                  {[p.user?.address, p.user?.postalCode, p.user?.country].filter(Boolean).join(', ')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-[#5a4a3a] whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase whitespace-nowrap ${
                              p.status === 'completed' ? 'bg-green-100 text-green-600' : 
                              p.status === 'rejected' ? 'bg-red-100 text-red-600' : 
                              'bg-orange-100 text-orange-600'
                            }`}>
                              {p.status === 'completed' ? t.completed || 'Completed' : 
                               p.status === 'rejected' ? t.rejected || 'Rejected' : 
                               t.pending || 'Pending'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {p.status === 'pending' ? (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleRejectParticipant(p._id)}
                                  className="bg-white border border-red-200 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors inline-flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" /> {t.rejectBtn || "Reject"}
                                </button>
                                <button
                                  onClick={() => handleApproveParticipant(p._id)}
                                  className="bg-[#8B6914] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#6a5010] transition-colors inline-flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" /> {t.approveBtn || "Approve"}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[#9a8a7a] text-[10px] font-medium">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
