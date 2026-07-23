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
  MessageCircle,
  Edit2,
  Trash2,
  Send,
  CornerDownRight
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

  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [newReply, setNewReply] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const getAdminId = () => {
    try {
      const userStr = localStorage.getItem("adminUser");
      if (userStr) return JSON.parse(userStr)?._id;
    } catch (e) {
      return null;
    }
    return null;
  };
  const adminId = getAdminId();

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyContent, setEditReplyContent] = useState("");

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
      title: t.approvePointsTitle || "Approuver les points",
      message: t.approvePointsConfirm || "Voulez-vous vraiment approuver les points pour ce signalement ?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.patch(
            `/admin/approve-report-points/${reportId}`,
          );
          if (res.data.status === "ok") {
            toast.success(t.pointsApprovedSuccess || "Points approuvés avec succès");
            fetchData();
          }
        } catch (err) {
          toast.error(
            err.response?.data?.message || t.approvePointsError || "Erreur lors de l'approbation",
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post("/comments/create-comment", {
        reportId: selectedReport._id,
        content: newComment,
      });
      if (res.data.status === "ok" || res.status === 201) {
        toast.success(t.commentAddedSuccess || "Comment added successfully");
        setNewComment("");
        openReportDetails(selectedReport._id);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedAddComment || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!newReply.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(`/comments/create-reply/${commentId}`, {
        reportId: selectedReport._id,
        content: newReply,
      });
      if (res.data.status === "ok" || res.status === 201) {
        toast.success(t.replyAddedSuccess || "Reply added successfully");
        setNewReply("");
        setReplyingTo(null);
        openReportDetails(selectedReport._id);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedAddReply || "Failed to add reply");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editCommentContent.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.patch(`/comments/update-comment/${commentId}`, {
        content: editCommentContent,
      });
      if (res.data.status === "ok" || res.status === 200) {
        toast.success(t.commentUpdatedSuccess || "Comment updated successfully");
        setEditingCommentId(null);
        setEditCommentContent("");
        openReportDetails(selectedReport._id);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedUpdateComment || "Failed to update comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleUpdateReply = async (replyId) => {
    if (!editReplyContent.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.patch(`/comments/update-reply/${replyId}`, {
        content: editReplyContent,
      });
      if (res.data.status === "ok" || res.status === 200) {
        toast.success(t.replyUpdatedSuccess || "Reply updated successfully");
        setEditingReplyId(null);
        setEditReplyContent("");
        openReportDetails(selectedReport._id);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.failedUpdateReply || "Failed to update reply");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteCommentTitle || "Delete Comment",
      message: t.deleteCommentConfirm || "Are you sure you want to delete this comment?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.delete(`/comments/delete-comment/${commentId}`);
          if (res.data.status === "ok" || res.status === 200) {
            toast.success(t.commentDeletedSuccess || "Comment deleted successfully");
            openReportDetails(selectedReport._id);
            fetchData();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || t.failedDeleteComment || "Failed to delete comment");
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteReply = (replyId) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteReplyTitle || "Delete Reply",
      message: t.deleteReplyConfirm || "Are you sure you want to delete this reply?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.delete(`/comments/delete-reply/${replyId}`);
          if (res.data.status === "ok" || res.status === 200) {
            toast.success(t.replyDeletedSuccess || "Reply deleted successfully");
            openReportDetails(selectedReport._id);
            fetchData();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || t.failedDeleteReply || "Failed to delete reply");
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const getIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "dog":
        return <Dog className="w-5 h-5 text-[#8B6914]" />;
      case "cat":
        return <Cat className="w-5 h-5 text-[#8B6914]" />;
      case "bird":
        return <Bird className="w-5 h-5 text-[#8B6914]" />;
      default:
        return <HelpCircle className="w-5 h-5 text-[#8B6914]" />;
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
        } else if (key === "species") {
          if (formData.species === "Other" && formData.customSpecies) {
            data.append("species", formData.customSpecies);
          } else {
            data.append("species", formData[key]);
          }
        } else if (key === "customSpecies") {
          // Handled above
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

    const standardSpecies = ["Dog", "Cat", "Bird"];
    let speciesVal = report.species;
    let customSpeciesVal = "";
    if (report.species && !standardSpecies.includes(report.species)) {
      speciesVal = "Other";
      customSpeciesVal = report.species;
    }

    setEditingReport({
      ...report,
      species: speciesVal,
      customSpecies: customSpeciesVal,
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
    {
      name: "customSpecies",
      label: t.customSpecies || "Please specify species",
      required: true,
      dependsOn: { field: "species", value: "Other" },
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
              {r.breed || t.unknown || "Inconnu"}
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
          {r.comments?.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0) || 0}
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
            label={t.sighted || "SIGHTED"}
            value={{
              text: (stats?.sighted || 0).toLocaleString(),
              color: "text-blue-500",
            }}
            color="bg-blue-500"
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
                <PawPrint className="w-6 h-6 text-[#8B6914]" /> {t.reportDetails || "Détails du signalement"}: {selectedReport.title}
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
                    <FileText className="w-4 h-4 text-[#8B6914]" /> {t.reportInfo || "Infos Signalement"}
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-[#9a8a7a]">{t.animalSpecies || "Espèce"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.species}
                    </span>
                    <span className="text-[#9a8a7a]">{t.breed || "Race"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.breed || t.unknown || "Inconnue"}
                    </span>
                    <span className="text-[#9a8a7a]">{t.animalName || "Nom Animal"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedReport.animalName || "N/A"}
                    </span>
                    <span className="text-[#9a8a7a]">{t.statusLabel || "Statut"}:</span>
                    <span className="font-bold uppercase text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full w-fit">
                      {t[selectedReport.status] || selectedReport.status}
                    </span>
                    <span className="text-[#9a8a7a]">{t.dateLabel || "Date"}:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {new Date(selectedReport.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#fcfaf7] p-4 rounded-xl border border-[#e8ddd0]">
                <h3 className="font-bold text-[#3a2a1a] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#8B6914]" /> {t.location || "Localisation"}
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed mb-2">
                  {selectedReport.location?.address || t.addressNotProvided || "Adresse non fournie"}
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
                  {t.descriptionLabel || "Description"}
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedReport.description ||
                    t.noDescription ||
                    "Aucune description fournie"}
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="font-bold text-[#3a2a1a] border-b pb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#8B6914]" /> {t.reportedBy || "Signalé par"}
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

              {/* Comments Section */}
              {/* Comments Section */}
              <div className="flex flex-col gap-4 mt-2">
                <h3 className="font-bold text-[#3a2a1a] border-b pb-2 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#8B6914]" /> {t.commentsLabel || "Comments"} ({selectedReport.comments?.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0) || 0})
                </h3>
                <div className="flex flex-col gap-4">
                  {selectedReport.comments && selectedReport.comments.length > 0 ? (
                    selectedReport.comments.map((comment) => (
                      <div key={comment._id} className="bg-white p-4 rounded-2xl shadow-sm border border-[#e8ddd0] flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#f5f0e8] text-[#8B6914] flex items-center justify-center text-sm font-bold overflow-hidden border border-[#e8ddd0] shrink-0">
                              {comment.author?.profileImage?.secure_url ? (
                                <img
                                  src={comment.author.profileImage.secure_url}
                                  alt="Comment Author"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (comment.author?.firstName?.[0] || "U").toUpperCase()
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[#3a2a1a] text-sm">
                                {comment.author?.firstName} {comment.author?.lastName}
                              </span>
                              <span className="text-[11px] text-[#9a8a7a]">
                                {new Date(comment.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {editingCommentId === comment._id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              className="flex-1 text-sm bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-4 py-2 focus:outline-none focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/20 transition-all"
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                            />
                            <button
                              onClick={() => handleUpdateComment(comment._id)}
                              disabled={commentLoading}
                              className="bg-[#8B6914] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors disabled:opacity-50"
                            >
                              {t.saveBtn || "Save"}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditCommentContent("");
                              }}
                              className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors px-2"
                            >
                              {t.cancelBtn || "Cancel"}
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[#5a4a3a] leading-relaxed">
                            {comment.content}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-1">
                          <button
                            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                            className="flex items-center gap-1 text-xs font-medium text-[#9a8a7a] hover:text-[#8B6914] transition-colors"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            {t.replyBtn || "Reply"}
                          </button>
                          {comment.author?._id === adminId && adminId && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment._id);
                                  setEditCommentContent(comment.content);
                                  setReplyingTo(null);
                                }}
                                className="flex items-center gap-1 text-xs font-medium text-[#9a8a7a] hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                {t.editBtn || "Edit"}
                              </button>
                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                className="flex items-center gap-1 text-xs font-medium text-[#9a8a7a] hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {t.deleteBtn || "Delete"}
                              </button>
                            </>
                          )}
                        </div>

                        {replyingTo === comment._id && (
                          <div className="flex items-center gap-2 mt-2 bg-[#fcfaf7] border border-[#e8ddd0] rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-[#8B6914]/20 focus-within:border-[#8B6914] transition-all shadow-inner">
                            <input
                              type="text"
                              className="flex-1 text-sm bg-transparent border-none outline-none"
                              placeholder={t.writeReply || "Write a reply..."}
                              value={newReply}
                              onChange={(e) => setNewReply(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddReply(comment._id)}
                            />
                            <button
                              onClick={() => handleAddReply(comment._id)}
                              disabled={commentLoading || !newReply.trim()}
                              className="bg-[#8B6914] text-white p-1.5 rounded-full hover:bg-[#6a5010] transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        )}

                        {/* Display replies if any */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-4 mt-2 flex flex-col gap-3 border-l-2 border-[#f5f0e8] pl-4">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex flex-col gap-1.5 bg-[#fcfaf7] p-3 rounded-xl border border-[#f0e8d8]">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-[#f0e8d8] text-[#8B6914] flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                                      {reply.author?.profileImage?.secure_url ? (
                                        <img
                                          src={reply.author.profileImage.secure_url}
                                          alt="Reply Author"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        (reply.author?.firstName?.[0] || "U").toUpperCase()
                                      )}
                                    </div>
                                    <span className="font-bold text-[#3a2a1a] text-[11px]">
                                      {reply.author?.firstName} {reply.author?.lastName}
                                    </span>
                                    <span className="text-[10px] text-[#9a8a7a]">
                                      {new Date(reply.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                {editingReplyId === reply._id ? (
                                  <div className="flex items-center gap-2 mt-1 pl-8">
                                    <input
                                      type="text"
                                      className="flex-1 text-xs bg-white border border-[#e8ddd0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#8B6914] focus:ring-2 focus:ring-[#8B6914]/20 transition-all"
                                      value={editReplyContent}
                                      onChange={(e) => setEditReplyContent(e.target.value)}
                                    />
                                    <button
                                      onClick={() => handleUpdateReply(reply._id)}
                                      disabled={commentLoading}
                                      className="bg-[#8B6914] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#6a5010] transition-colors disabled:opacity-50"
                                    >
                                      {t.saveBtn || "Save"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingReplyId(null);
                                        setEditReplyContent("");
                                      }}
                                      className="text-[10px] font-medium text-red-500 hover:text-red-700 transition-colors px-2"
                                    >
                                      {t.cancelBtn || "Cancel"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5 pl-8">
                                    <p className="text-xs text-[#5a4a3a]">
                                      {reply.content}
                                    </p>
                                    {reply.author?._id === adminId && adminId && (
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => {
                                            setEditingReplyId(reply._id);
                                            setEditReplyContent(reply.content);
                                          }}
                                          className="flex items-center gap-1 text-[10px] font-medium text-[#9a8a7a] hover:text-blue-600 transition-colors w-fit"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                          {t.editBtn || "Edit"}
                                        </button>
                                        <button
                                          onClick={() => handleDeleteReply(reply._id)}
                                          className="flex items-center gap-1 text-[10px] font-medium text-[#9a8a7a] hover:text-red-600 transition-colors w-fit"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          {t.deleteBtn || "Delete"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 bg-[#fcfaf7] rounded-xl border border-dashed border-[#e8ddd0]">
                      <MessageCircle className="w-8 h-8 text-[#d8c8b8] mb-2" />
                      <p className="text-sm text-[#9a8a7a]">{t.noComments || "No comments yet. Be the first to comment!"}</p>
                    </div>
                  )}
                </div>

                {/* Add new comment */}
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#f0e8d8]">
                  <div className="flex-1 flex items-center gap-2 bg-[#fcfaf7] border border-[#e8ddd0] rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-[#8B6914]/20 focus-within:border-[#8B6914] transition-all shadow-inner">
                    <input
                      type="text"
                      className="flex-1 text-sm bg-transparent border-none outline-none"
                      placeholder={t.writeComment || "Write a comment..."}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                    />
                  </div>
                  <button
                    onClick={handleAddComment}
                    disabled={commentLoading || !newComment.trim()}
                    className="bg-[#8B6914] text-white font-bold p-3 rounded-full hover:bg-[#6a5010] hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center shrink-0"
                    title={t.sendBtn || "Send"}
                  >
                    <Send className="w-5 h-5" />
                  </button>
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
