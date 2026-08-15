import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import CRUDModal from "../components/common/CRUDModal";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { Target, Plus } from "lucide-react";

const DEFAULT_SPONSOR = { isActive: true, type: "banner" };

export default function SponsorsPage() {
  const { t } = useLang();
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [partners, setPartners] = useState([]);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/sponsors");
      if (res.data.status === "ok" || res.data.success) {
        setSponsors(res.data.data || []);
      }
    } catch (err) {
      toast.error("Failed to fetch sponsors");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      const res = await api.get("/user/get-all-user?role=partners&limit=1000");
      if (res.data.status === "ok" || res.data.success) {
        setPartners(res.data.data || []);
      }
    } catch (err) {
      // Intentionally suppressing error log to keep console clean
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
    fetchPartners();
  }, [fetchSponsors, fetchPartners]);

  const handleCreateOrUpdate = async (formData) => {
    setModalLoading(true);
    try {
      const isUpdate = !!editingSponsor;
      const url = isUpdate ? `/sponsors/${editingSponsor._id}` : "/sponsors";
      const method = isUpdate ? "patch" : "post";

      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      await api[method](url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(
        isUpdate ? t.sponsorUpdatedSuccess || "Sponsor updated successfully" : t.sponsorCreatedSuccess || "Sponsor created successfully"
      );
      setIsModalOpen(false);
      fetchSponsors();
    } catch (err) {
      if (err.response?.data?.data && Array.isArray(err.response.data.data)) {
        err.response.data.data.forEach((e) => {
          toast.error(`${e.field}: ${e.message}`);
        });
      } else {
        toast.error(err.response?.data?.message || t.operationFailed || "Operation failed");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteSponsor || "Delete Sponsor",
      message: t.confirmDeleteSponsor || "Are you sure you want to delete this sponsor? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await api.delete(`/sponsors/${id}`);
          toast.success(t.sponsorDeletedSuccess || "Sponsor deleted successfully");
          fetchSponsors();
        } catch (err) {
          toast.error(t.failedDeleteSponsor || "Failed to delete sponsor");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filteredSponsors = sponsors.filter((s) => {
    const matchesSearch = (s.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? s.isActive : !s.isActive);
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      header: t.partner || "Partner",
      cell: (row) => {
        const partner = row.partner;
        if (!partner) return "Unknown";
        const name = partner.company || partner.firstName || "Unknown";
        const avatarUrl = partner.profileImage?.secure_url || partner.logo?.secure_url;
        
        return (
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-8 h-8 rounded border border-[#e8ddd0] object-cover shrink-0 bg-[#fcfaf7]" />
            ) : (
              <div className="w-8 h-8 rounded border border-[#e8ddd0] bg-[#f5f0e8] flex items-center justify-center text-[#8B6914] font-bold shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-[#3a2a1a] text-xs leading-tight">{name}</span>
              {partner.email && <span className="text-[10px] text-[#9a8a7a] font-normal leading-tight">{partner.email}</span>}
            </div>
          </div>
        );
      },
    },
    { header: t.titleLabel || "Title", accessor: "title" },
    {
      header: t.campaignDates || "Campaign Dates",
      cell: (row) =>
        `${new Date(row.startDate).toLocaleDateString()} - ${new Date(
          row.endDate
        ).toLocaleDateString()}`,
    },
    { header: t.impressions || "Impressions", accessor: "impressions" },
    { header: t.clicks || "Clicks", accessor: "clicks" },
    {
      header: t.ctr || "CTR",
      cell: (row) => {
        if (!row.impressions) return "0%";
        return ((row.clicks / row.impressions) * 100).toFixed(2) + "%";
      },
    },
    {
      header: t.statusLabel || "Status",
      cell: (row) => (
        <StatusBadge
          status={row.isActive ? "active" : "inactive"}
          text={row.isActive ? t.active || "Active" : t.inactive || "Inactive"}
        />
      ),
    },
    {
      header: t.actionsLabel || "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingSponsor({
                ...row,
                partner: row.partner?._id,
                startDate: new Date(row.startDate).toISOString().slice(0, 10),
                endDate: new Date(row.endDate).toISOString().slice(0, 10),
              });
              setIsModalOpen(true);
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
      )
    }
  ];

  const modalFields = [
    {
      name: "partner",
      label: t.partner || "Partner",
      type: "select",
      required: true,
      options: partners.map((p) => ({
        value: p._id,
        label: p.company || `${p.firstName} ${p.lastName}`,
      })),
      loadOptions: async (inputValue) => {
        try {
          const res = await api.get(`/sponsors/search-partners?query=${inputValue}`);
          if (res.data.status === "ok" || res.data.success) {
            return (res.data.data || []).map((p) => ({
              value: p._id,
              label: p.company || `${p.firstName} ${p.lastName}`,
            }));
          }
        } catch (error) {
          // Intentionally suppressing error log to keep console clean
        }
        return [];
      },
    },
    { name: "title", label: t.titleLabel || "Title", type: "text", required: true },
    { name: "description", label: t.descriptionLabel || "Description", type: "textarea" },
    { name: "actionText", label: t.actionButtonText || "Action Button Text", type: "text", required: true },
    { name: "actionLink", label: t.actionUrl || "Action URL", type: "text", required: true },
    {
      name: "type",
      label: t.adType || "Ad Type",
      type: "select",
      required: true,
      options: [
        { value: "banner", label: t.banner || "Banner" },
        { value: "featured", label: t.featured || "Featured" },
      ],
    },
    { name: "startDate", label: t.startDate || "Start Date", type: "date", required: true },
    { name: "endDate", label: t.endDate || "End Date", type: "date", required: true },
    { name: "isActive", label: t.isActive || "Is Active", type: "checkbox" },
    { name: "image", label: t.sponsorImage || "Sponsor Image", type: "file", accept: "image/*" },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        
        <FilterBar 
          onSearch={setSearchTerm}
          onFilterChange={(name, val) => {
            if (name === "status") setStatusFilter(val);
          }}
          related={true}
          filters={[
            { name: "status", label: t.allStatuses || "All statuses", options: [
                { label: t.active || "Active", value: "active" },
                { label: t.inactive || "Inactive", value: "inactive" }
            ]}
          ]}
          actionButton={
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setEditingSponsor(null);
                  setIsModalOpen(true);
                }}
                className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t.createAd || "Create Ad"}
              </button>
            </div>
          }
        />

        <DataTable
          columns={columns}
          data={filteredSponsors}
          loading={loading}
          onEdit={(row) => {
            setEditingSponsor({
              ...row,
              partner: row.partner?._id,
              startDate: new Date(row.startDate).toISOString().slice(0, 16),
              endDate: new Date(row.endDate).toISOString().slice(0, 16),
            });
            setIsModalOpen(true);
          }}
          onDelete={(row) => handleDelete(row._id)}
        />
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSponsor ? t.editSponsorAd || "Edit Sponsor Ad" : t.createSponsorAd || "Create Sponsor Ad"}
        fields={modalFields}
        initialData={editingSponsor || DEFAULT_SPONSOR}
        onSubmit={handleCreateOrUpdate}
        loading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
