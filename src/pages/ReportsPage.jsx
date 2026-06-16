import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import { socket } from "../context/SocketContect";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import CRUDModal from "../components/common/CRUDModal";
import {
  PawPrint,
  MapPin,
  FileText,
  User,
  X,
  Plus,
  Dog,
  Cat,
  Bird,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "100%" };
const libraries = ['places'];

export default function ReportsPage() {
  const { t } = useLang();
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [formErrors, setFormErrors] = useState(null);

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    status: "all",
    species: "all",
    search: "",
    sortBy: "date",
    sort: "descending",
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
      if (q.status === "all") delete q.status;
      if (q.species === "all") delete q.species;
      const queryString = new URLSearchParams(q).toString();

      const [reportsRes, statsRes] = await Promise.all([
        api.get(`/reports/get-all-reports?${queryString}`),
        api.get("/admin/stats/reports"),
      ]);

      if (reportsRes.data.status === "ok") {
        setReports(reportsRes.data.data || []);
        setMeta(reportsRes.data.meta);
      }
      if (statsRes.data.status === "ok") {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch reports data", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();

    // Live updates for reports
    const handleUpdate = () => fetchData();
    socket.on("report_new", handleUpdate);
    socket.on("report_updated", handleUpdate);
    window.addEventListener("refetch-reports", handleUpdate);

    return () => {
      socket.off("report_new", handleUpdate);
      socket.off("report_updated", handleUpdate);
      window.removeEventListener("refetch-reports", handleUpdate);
    };
  }, [fetchData]);

  const handleApprovePoints = (reportId) => {
    setConfirmModal({
      isOpen: true,
      title: "Approuver les points",
      message:
        "Voulez-vous vraiment approuver les points pour ce signalement ?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.patch(
            `/admin/approve-report-points/${reportId}`,
          );
          if (res.data.status === "ok") {
            toast.success("Points approuvés avec succès");
            fetchData();
          }
        } catch (err) {
          toast.error(
            err.response?.data?.message || "Erreur lors de l'approbation",
          );
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const openReportDetails = async (reportId) => {
    try {
      const res = await api.get(`/reports/get-single-report/${reportId}`);
      if (res.data.status === "ok") {
        setSelectedReport(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch report details", err);
    }
  };

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "dog":
        return <Dog className="w-5 h-5 text-[#8B6914]" />;
      case "cat":
        return <Cat className="w-5 h-5 text-[#8B6914]" />;
      case "bird":
        return <Bird className="w-5 h-5 text-[#8B6914]" />;
      case "other":
        return <HelpCircle className="w-5 h-5 text-[#8B6914]" />;
      default:
        return <PawPrint className="w-5 h-5 text-[#8B6914]" />;
    }
  };

  const handleSubmitReport = async (formData) => {
    setModalLoading(true);
    setFormErrors(null);
    try {
      const data = new FormData();
      let hasLoc = false;
      let lat = null,
        lng = null,
        addressStr = null;

      Object.keys(formData).forEach((key) => {
        if (key === "latitude") {
          hasLoc = true;
          lat = formData[key];
        } else if (key === "longitude") {
          hasLoc = true;
          lng = formData[key];
        } else if (key === "address") {
          hasLoc = true;
          addressStr = formData[key];
        } else if (key === "eventDate" && formData[key]) {
          data.append(key, new Date(formData[key]).toISOString());
        } else if (formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      if (hasLoc && lat && lng && addressStr) {
        data.append(
          "location",
          JSON.stringify({
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
            address: addressStr,
          }),
        );
      }

      if (editingReport) {
        const res = await api.patch(
          `/reports/update-report/${editingReport._id}`,
          data,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        if (res.data.status === "ok" || res.status === 200) {
          toast.success("Report updated successfully");
          fetchData();
          setIsAddModalOpen(false);
        }
      } else {
        const res = await api.post("/reports/create-report", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.status === "ok" || res.status === 201) {
          toast.success("Report created successfully");
          setQueryParams((prev) => ({
            ...prev,
            page: 1,
            search: "",
            status: "all",
            species: "all",
          }));
          fetchData();
          setIsAddModalOpen(false);
        }
      }
    } catch (err) {
      if (err.response?.data?.data && Array.isArray(err.response.data.data)) {
        const cleanedErrors = err.response.data.data.map((e) => ({
          ...e,
          message:
            e.message?.includes("Invalid option") ||
            e.message?.includes("Invalid enum")
              ? t.fieldRequired || "This field is required"
              : e.message,
        }));
        setFormErrors(cleanedErrors);
      }
      toast.error(
        err.response?.data?.message ||
          t.failedSaveReport ||
          "Failed to save report",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (report) => {
    setFormErrors(null);
    let parsedDate = "";
    try {
      if (report.eventDate) {
        parsedDate = new Date(report.eventDate).toISOString().split("T")[0];
      }
    } catch (e) {
      console.warn("Invalid event date:", report.eventDate);
    }

    setEditingReport({
      ...report,
      address: report.location?.address || "",
      latitude: report.location?.coordinates?.[1] ?? undefined,
      longitude: report.location?.coordinates?.[0] ?? undefined,
      eventDate: parsedDate,
    });
    setIsAddModalOpen(true);
  };

  const reportFields = [
    {
      name: "animalName",
      label: t.animalName || "Animal Name",
      required: true,
    },
    {
      name: "species",
      label: t.animalSpecies || "Species",
      type: "select",
      required: true,
      options: [
        { label: t.dog || "Dog", value: "Dog" },
        { label: t.cat || "Cat", value: "Cat" },
        { label: t.bird || "Bird", value: "Bird" },
        { label: t.otherSpecies || "Other", value: "Other" },
      ],
    },
    { name: "breed", label: t.breed || "Breed", required: true },
    {
      name: "gender",
      label: t.gender || "Gender",
      type: "select",
      required: true,
      options: [
        { label: t.male || "Male", value: "Male" },
        { label: t.female || "Female", value: "Female" },
      ],
    },
    {
      name: "age",
      label: t.age || "Age",
      type: "select",
      required: true,
      options: [
        { label: t.junior || "Junior", value: "Junior" },
        { label: t.adult || "Adult", value: "Adult" },
        { label: t.senior || "Senior", value: "Senior" },
      ],
    },
    {
      name: "status",
      label: t.statusLabel || "Status",
      type: "select",
      required: true,
      options: [
        { label: t.lost || "Lost", value: "lost" },
        { label: t.found || "Found", value: "found" },
        { label: t.rescued || "Rescued", value: "rescued" },
        { label: t.sighted || "Sighted", value: "sighted" },
      ],
    },
    {
      name: "eventDate",
      label: t.eventDate || "Event Date",
      type: "date",
      required: true,
    },
    {
      name: "address",
      label: t.locationAddress || "Location Address",
      required: true,
    },
    {
      name: "latitude",
      label: t.latitudeLabel || "Latitude",
      type: "number",
      required: true,
    },
    {
      name: "longitude",
      label: t.longitudeLabel || "Longitude",
      type: "number",
      required: true,
    },
    {
      name: "description",
      label: t.descriptionLabel || "Description",
      type: "textarea",
      required: true,
    },
    {
      name: "hasMicrochip",
      label: t.hasMicrochip || "Has Microchip",
      type: "select",
      required: true,
      options: [
        { label: t.yes || "Yes", value: "Yes" },
        { label: t.no || "No", value: "No" },
        { label: t.unknown || "Unknown", value: "Unknown" },
      ],
    },
    {
      name: "hasTattoo",
      label: t.hasTattoo || "Has Tattoo",
      type: "select",
      required: true,
      options: [
        { label: t.yes || "Yes", value: "Yes" },
        { label: t.no || "No", value: "No" },
        { label: t.unknown || "Unknown", value: "Unknown" },
      ],
    },
    {
      name: "hasCollarOrHarness",
      label: t.hasCollarOrHarness || "Has Collar/Harness",
      type: "select",
      required: true,
      options: [
        { label: t.yes || "Yes", value: "Yes" },
        { label: t.no || "No", value: "No" },
        { label: t.unknown || "Unknown", value: "Unknown" },
      ],
    },
    { name: "images", label: t.animalPhoto || "Animal Photo", type: "file" },
  ];

  const columns = [
    {
      header: t.animal,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#f5f0e8] flex items-center justify-center text-xl overflow-hidden shrink-0 border border-[#e8ddd0]">
            {r.images?.[0]?.secure_url ? (
              <img
                src={r.images[0].secure_url}
                alt={r.animalName}
                className="w-full h-full object-cover"
              />
            ) : (
              getIcon(r.species)
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#3a2a1a] truncate max-w-[150px]">
              {r.animalName || r.title || "N/A"}
            </span>
            <span className="text-[10px] text-[#9a8a7a]">
              {r.breed || "Inconnu"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t.type,
      cell: (r) => (
        <span className="flex items-center gap-1">
          {getIcon(r.species)} {r.species}
        </span>
      ),
    },
    {
      header: t.status,
      cell: (r) => {
        const statusColors = {
          lost: "bg-orange-100 text-orange-600",
          found: "bg-blue-100 text-blue-600",
          rescued: "bg-green-100 text-green-600",
          sighted: "bg-purple-100 text-purple-600",
        };
        return (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}
          >
            {t[r.status] || r.status}
          </span>
        );
      },
    },
    {
      header: t.location,
      cell: (r) => (
        <div className="max-w-[200px] truncate">
          {r.location?.address || "N/A"}
        </div>
      ),
    },
    {
      header: t.user,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
            {r.author?.profileImage?.secure_url ? (
              <img
                src={r.author.profileImage.secure_url}
                alt="author"
                className="w-full h-full object-cover"
              />
            ) : (
              (r.author?.firstName?.[0] || "U").toUpperCase()
            )}
          </div>
          <span className="text-xs text-[#3a2a1a] font-medium">
            {`${r.author?.firstName || ""} ${r.author?.lastName || ""}`.trim() ||
              "N/A"}
          </span>
        </div>
      ),
    },
    { header: t.date, cell: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      header: t.commentsLabel || "COMMENTS",
      align: "center",
      cell: (r) => (
        <span className="text-[10px] font-bold bg-[#f5f0e8] text-[#8B6914] px-2 py-1 rounded-lg">
          {r.comments?.length || 0}
        </span>
      ),
    },
    {
      header: t.actions,
      align: "right",
      cell: (r) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => openReportDetails(r._id)}
            className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            {t.viewBtn}
          </button>
          <button
            onClick={() => openEditModal(r)}
            className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-orange-200 transition-colors"
          >
            {t.editBtn || "Edit"}
          </button>
          {r.status === "found" && !r.isPointApproved && (
            <button
              onClick={() => handleApprovePoints(r._id)}
              className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-green-200 transition-colors"
            >
              {t.validateBtn}
            </button>
          )}
          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: "Delete Report",
                message:
                  "Are you sure you want to delete this report? This action cannot be undone.",
                onConfirm: async () => {
                  setConfirmLoading(true);
                  try {
                    const res = await api.delete(
                      `/reports/delete-report/${r._id}`,
                    );
                    if (res.data.status === "ok" || res.status === 200) {
                      toast.success("Report deleted successfully");
                      fetchData();
                    }
                  } catch (err) {
                    toast.error(
                      err.response?.data?.message || "Failed to delete report",
                    );
                  } finally {
                    setConfirmLoading(false);
                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  }
                },
              });
            }}
            className="bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-red-100 transition-colors"
          >
            {t.deleteBtn}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            loading={loading}
            label={t.totalActive}
            value={{
              text: stats?.total?.toLocaleString() || "0",
              color: "text-[#3a2a1a]",
            }}
            color="bg-purple-500"
          />
          <StatCard
            loading={loading}
            label={t.resolvedLabel}
            value={{
              text: stats?.resolved?.toLocaleString() || "0",
              color: "text-[#3a2a1a]",
            }}
            color="bg-green-500"
          />
          <StatCard
            loading={loading}
            label={t.lost || "LOST"}
            value={{
              text: (stats?.lost || 0).toLocaleString(),
              color: "text-orange-500",
            }}
            color="bg-orange-500"
          />
          <StatCard
            loading={loading}
            label={t.resolutionRate}
            value={{
              text: `${stats?.resolutionRate || 0}%`,
              color: "text-blue-600",
            }}
            color="bg-blue-500"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col">
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
                { label: t.lost || "Lost", value: "lost" },
                { label: t.found || "Found", value: "found" },
                { label: t.sighted || "Sighted", value: "sighted" },
                { label: t.rescued || "Rescued", value: "rescued" },
              ],
            },
            {
              name: "species",
              label: t.allSpecies || "All species",
              options: [
                { label: t.dog || "Dog", value: "Dog" },
                { label: t.cat || "Cat", value: "Cat" },
                { label: t.bird || "Bird", value: "Bird" },
                { label: t.otherSpecies || "Other", value: "Other" },
              ],
            },
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.nameAsc || "Name (A-Z)", value: "name:ascending" },
            { label: t.nameDesc || "Name (Z-A)", value: "name:descending" },
          ]}
          actionButton={
            <button
              onClick={() => {
                setEditingReport(null);
                setFormErrors(null);
                setIsAddModalOpen(true);
              }}
              className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t.createReport || "Create Report"}
            </button>
          }
        />
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={reports}
            loading={loading}
            emptyMessage={t.noReportsFound || "No reports found."}
          />
        </div>

        <div className="p-4">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
          />
        </div>
      </div>

      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
                <PawPrint className="w-6 h-6 text-[#8B6914]" /> Détails du
                signalement: {selectedReport.title}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="w-full aspect-video rounded-xl bg-gray-100 overflow-hidden border border-[#e8ddd0] relative">
                    {selectedReport.images?.[0]?.secure_url ? (
                      <img
                        src={selectedReport.images[0].secure_url}
                        alt="Report"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl text-[#8B6914] opacity-20">
                        <PawPrint className="w-24 h-24" />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 shadow-xl">
                      <ThumbsUp className="w-4 h-4 text-white" />
                      <span className="text-white text-xs font-black">
                        {selectedReport.comments?.reduce(
                          (acc, c) => acc + (c.likes?.length || 0),
                          0,
                        ) || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8B6914]" /> Infos
                    Signalement
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-[#9a8a7a]">Espèce:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.species}
                    </span>
                    <span className="text-[#9a8a7a]">Race:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.breed || "Inconnue"}
                    </span>
                    <span className="text-[#9a8a7a]">Nom Animal:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.animalName || "N/A"}
                    </span>
                    <span className="text-[#9a8a7a]">Statut:</span>
                    <span className="font-bold uppercase text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full w-fit">
                      {selectedReport.status}
                    </span>
                    <span className="text-[#9a8a7a]">Date:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {new Date(selectedReport.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#fcfaf7] p-4 rounded-xl border border-[#e8ddd0]">
                <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8B6914]" /> Localisation
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed mb-2">
                  {selectedReport.location?.address || "Adresse non fournie"}
                </p>
                {selectedReport.location?.coordinates?.length === 2 && (
                  <div className="h-48 w-full rounded-xl overflow-hidden border border-[#e8ddd0] z-0 relative">
                    {!isLoaded ? (
                      <div className="w-full h-full bg-[#f5f0e8] animate-pulse" />
                    ) : (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={{
                          lat: selectedReport.location.coordinates[1],
                          lng: selectedReport.location.coordinates[0],
                        }}
                        zoom={14}
                        options={{ disableDefaultUI: true, zoomControl: true }}
                      >
                        <Marker
                          position={{
                            lat: selectedReport.location.coordinates[1],
                            lng: selectedReport.location.coordinates[0],
                          }}
                        />
                      </GoogleMap>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 bg-[#f5f0e8] p-4 rounded-xl">
                <h3 className="font-bold text-[#3a2a1a] text-sm">
                  Description
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description ||
                    t.noDescription ||
                    "Aucune description fournie"}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-[#3a2a1a] border-b pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#8B6914]" /> Signalé par
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-lg font-bold overflow-hidden border-2 border-white shadow-sm">
                    {selectedReport.author?.profileImage?.secure_url ? (
                      <img
                        src={selectedReport.author.profileImage.secure_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (
                        selectedReport.author?.firstName?.[0] || "U"
                      ).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#3a2a1a]">
                      {selectedReport.author?.firstName}{" "}
                      {selectedReport.author?.lastName}
                    </span>
                    <span className="text-xs text-[#9a8a7a]">
                      {selectedReport.author?.email}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CRUDModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingReport(null);
          setFormErrors(null);
        }}
        title={
          editingReport
            ? t.editReportTitle || "Edit Report"
            : t.createReportTitle || "Create New Report"
        }
        fields={reportFields}
        initialData={editingReport}
        fieldErrors={formErrors}
        onSubmit={handleSubmitReport}
        loading={modalLoading}
      />

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
    </div>
  );
}
