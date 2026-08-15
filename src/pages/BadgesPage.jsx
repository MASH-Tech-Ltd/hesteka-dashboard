import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import { toast } from "react-toastify";
import { Medal, Plus } from "lucide-react";
import api from "../utils/api";
import CRUDModal from "../components/common/CRUDModal";
import DataTable from "../components/common/DataTable";
import ConfirmModal from "../components/common/ConfirmModal";
import FilterBar from "../components/common/FilterBar";
import StatusBadge from "../components/common/StatusBadge";

export default function BadgesPage() {
  const { t } = useLang();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // 'create' or 'edit'
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBadges = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/badges");
      if (response.data.success || response.data.status === "ok") {
        setBadges(response.data.data || []);
      } else if (Array.isArray(response.data)) {
        setBadges(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch badges", error);
      toast.error(t.errorConnecting || "Error connecting to server");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const handleOpenModal = (mode, badge = null) => {
    setModalMode(mode);
    setSelectedBadge(badge);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBadge(null);
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      const isUpdate = modalMode === "edit";
      const url = isUpdate ? `/badges/${selectedBadge._id}` : "/badges";
      const method = isUpdate ? "put" : "post";

      const formDataPayload = new FormData();
      if (formData.name) formDataPayload.append("name", formData.name);
      if (formData.description)
        formDataPayload.append("description", formData.description);
      if (formData.icon instanceof File) {
        formDataPayload.append("icon", formData.icon);
      }

      const response = await api[method](url, formDataPayload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (
        response.data.success ||
        response.status === 200 ||
        response.status === 201
      ) {
        toast.success(
          isUpdate
            ? t.badgeUpdated || "Badge updated successfully"
            : t.badgeCreated || "Badge created successfully",
        );
        fetchBadges();
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error saving badge", error);
      toast.error(
        error.response?.data?.message ||
          t.errorSavingBadge ||
          "Error saving badge",
      );
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      id,
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.id) return;
    setDeleteLoading(true);
    try {
      const response = await api.delete(`/badges/${confirmModal.id}`);
      if (response.data.success || response.status === 200) {
        toast.success(t.badgeDeleted || "Badge deleted successfully");
        fetchBadges();
      }
    } catch (error) {
      console.error("Error deleting badge", error);
      toast.error(
        error.response?.data?.message ||
          t.errorDeletingBadge ||
          "Error deleting badge",
      );
    } finally {
      setDeleteLoading(false);
      setConfirmModal({ isOpen: false, id: null });
    }
  };

  const filteredBadges = badges.filter((badge) =>
    badge.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const badgeFields = [
    { name: "name", label: t.badgeName || "Badge Name", required: true },
    {
      name: "icon",
      label: t.icon || "Icon",
      type: "file",
      required: false,
      fullWidth: true,
    },
    {
      name: "description",
      label: t.description || "Description",
      type: "textarea",
      required: false,
      fullWidth: true,
    },
  ];

  const columns = [
    {
      header: t.icon || "Icon",
      cell: (row) => {
        return row.icon?.secure_url ? (
          <img
            src={row.icon.secure_url}
            alt={row.name}
            className="w-10 h-10 rounded-full object-cover border border-[#e8ddd0]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#8B6914]/10 flex items-center justify-center text-[#8B6914] border border-[#8B6914]/20">
            <Medal size={20} />
          </div>
        );
      },
    },
    {
      header: t.name || "Name",
      accessor: "name",
      cell: (row) => <div className="font-bold text-[#3a2a1a]">{row.name}</div>,
    },
    {
      header: t.description || "Description",
      accessor: "description",
      cell: (row) => (
        <div className="text-[#5a4a3a] text-sm">{row.description || "-"}</div>
      ),
    },
    {
      header: t.statusLabel || "Status",
      cell: () => <StatusBadge status="active" />,
    },
    {
      header: t.createdBy || "Created By",
      width: "150px",
      cell: (row) => (
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-[#8B6914] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
             A
           </div>
           <span className="text-xs font-bold text-[#3a2a1a]">Admin</span>
        </div>
      )
    },
    {
      header: t.actions || "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenModal("edit", row);
            }}
            className="text-[#8B6914] hover:text-[#735711] font-bold text-xs uppercase tracking-widest px-2 py-1"
          >
            {t.editBtn || "Edit"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row._id);
            }}
            className="text-red-500 hover:text-red-700 font-bold text-xs uppercase tracking-widest px-2 py-1"
          >
            {t.deleteBtn || "Delete"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <FilterBar
          onSearch={setSearchTerm}
          related={true}
          actionButton={
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal("create")}
                className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t.addBadge || "Add Badge"}
              </button>
            </div>
          }
        />

        <DataTable
          columns={columns}
          data={filteredBadges}
          loading={loading}
          onEdit={(row) => handleOpenModal("edit", row)}
          onDelete={(row) => handleDelete(row._id)}
          emptyMessage={
            t.noBadgesFound || "No badges found matching your search."
          }
        />
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          modalMode === "create"
            ? t.createBadge || "Create Badge"
            : t.editBadge || "Edit Badge"
        }
        fields={badgeFields}
        initialData={selectedBadge}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={t.deleteBadge || "Delete Badge"}
        message={
          t.confirmDeleteBadge ||
          "Are you sure you want to delete this badge? This action cannot be undone."
        }
        onConfirm={confirmDelete}
        onCancel={() =>
          !deleteLoading && setConfirmModal({ isOpen: false, id: null })
        }
        loading={deleteLoading}
      />
    </div>
  );
}
