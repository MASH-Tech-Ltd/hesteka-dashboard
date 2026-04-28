import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import CRUDModal from "../components/common/CRUDModal";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { Medal, CheckCircle, ClipboardList, Plus } from "lucide-react";

const PartnerCard = React.memo(({ partner, isPending, onApprove, onReject, onView, onEdit, t }) => (
  <div className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl p-3 flex items-center justify-between hover:shadow-sm transition-all relative overflow-hidden">
    <div className="absolute left-0 top-0 w-1 h-full bg-[#8B6914]"></div>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-[#8B6914] flex items-center justify-center text-white text-lg font-bold shrink-0">
        {(partner.company || partner.firstName || 'P').charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-[#3a2a1a] truncate">{partner.company || `${partner.firstName} ${partner.lastName}`}</h4>
        <p className="text-[10px] text-[#9a8a7a] truncate">{partner.email}</p>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
      {isPending ? (
        <>
          <button
            onClick={() => onApprove(partner._id)}
            className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1.5 rounded-xl hover:bg-green-200 transition-colors"
          >
            {t.validateBtn}
          </button>
          <button
            onClick={() => onReject(partner._id)}
            className="bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors"
          >
            {t.rejectBtn || "Reject"}
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onView(partner._id)}
            className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-xl hover:bg-blue-200 transition-colors"
          >
            {t.viewBtn}
          </button>
          <button
            onClick={() => onEdit(partner._id)}
            className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1.5 rounded-xl hover:bg-orange-200 transition-colors"
          >
            {t.editBtn}
          </button>
        </>
      )}
    </div>
  </div>
));

export default function PartnersPage() {
  const { t } = useLang();
  const [activePartners, setActivePartners] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    role: "partners",
    status: "active",
    search: "",
    sortBy: "date",
    sort: "descending"
  });

  const fetchActivePartners = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await api.get(`/user/get-all-user?${queryString}`);
      if (res.data.status === "ok") {
        setActivePartners(res.data.data || []);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch active partners", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  const fetchPendingPartners = useCallback(async () => {
    try {
      const res = await api.get("/user/get-all-user?role=partners&status=pending&limit=100");
      if (res.data.status === "ok") {
        setPendingPartners(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch pending partners", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/admin/stats/partners");
      if (res.data.status === "ok") {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch partner stats", err);
    }
  }, []);

  useEffect(() => {
    fetchActivePartners();
    fetchPendingPartners();
    fetchStats();
  }, [fetchActivePartners, fetchPendingPartners, fetchStats]);

  const handleApprove = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.approvePartnerTitle || "Approve Partner",
      message: t.confirmApproveMessage || "Are you sure you want to approve this partner?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.patch(`/user/approve-partner/${id}`);
          if (res.data.status === "ok") {
            toast.success("Partner approved successfully");
            fetchActivePartners();
            fetchPendingPartners();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to approve partner");
        } finally {
          setConfirmLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleReject = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.rejectPartnerTitle || "Reject Partner",
      message: t.confirmRejectMessage || "Are you sure you want to reject this partner?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.patch(`/user/reject-partner/${id}`);
          if (res.data.status === "ok") {
            toast.success("Partner rejected successfully");
            fetchPendingPartners();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to reject partner");
        } finally {
          setConfirmLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const openDetailsModal = async (userId) => {
    try {
      const res = await api.get(`/user/get-single-user/${userId}`);
      if (res.data.status === "ok") {
        setEditingUser(res.data.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch partner details", err);
      toast.error("Failed to load partner details");
    }
  };

  const openEditModal = async (userId) => {
    try {
      const res = await api.get(`/user/get-single-user/${userId}`);
      if (res.data.status === "ok") {
        setEditingUser(res.data.data);
        setIsEditModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch partner details", err);
      toast.error("Failed to load partner details");
    }
  };

  const handleAddPartner = async (formData) => {
    setModalLoading(true);
    try {
      const res = await api.post("/auth/register-partner", formData);
      if (res.data.status === "ok" || res.status === 201) {
        setIsAddModalOpen(false);
        toast.success("Partner created successfully");
        fetchActivePartners();
        fetchPendingPartners();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create partner");
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditPartner = async (formData) => {
    setModalLoading(true);
    try {
      const res = await api.patch(`/user/update-user-admin/${editingUser._id}`, formData);
      if (res.data.status === "ok") {
        setIsEditModalOpen(false);
        toast.success("Partner updated successfully");
        fetchActivePartners();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update partner");
    } finally {
      setModalLoading(false);
    }
  };

  const partnerFields = [
    { name: "firstName", label: t.firstName || "First Name", required: true },
    { name: "lastName", label: t.lastName || "Last Name", required: true },
    { name: "email", label: t.emailLabel || "Email", type: "email", required: true },
    { name: "password", label: t.passwordLabel || "Password", type: "password", required: true },
    { name: "company", label: t.companyName || "Company Name", required: true },
    { name: "website", label: t.websiteLabel || "Website" },
    { name: "phone", label: t.phone || "Phone" },
    { name: "address", label: t.address || "Address" },
  ];

  const editFields = [
    { name: "firstName", label: t.firstName || "First Name", disabled: true },
    { name: "lastName", label: t.lastName || "Last Name", disabled: true },
    { name: "company", label: t.companyName || "Company Name" },
    { name: "website", label: t.websiteLabel || "Website" },
    {
      name: "status",
      label: t.statusLabel || "Status",
      type: "select",
      required: true,
      options: [
        { label: t.active || "Active", value: "active" },
        { label: t.pending || "Pending", value: "pending" },
        { label: t.inactive || "Inactive", value: "inactive" },
        { label: t.blocked || "Blocked", value: "blocked" },
        { label: t.rejected || "Rejected", value: "rejected" },
        { label: t.banned || "Banned", value: "banned" }
      ]
    }
  ];

  const viewFields = [
    { name: "firstName", label: t.firstName || "First Name", disabled: true },
    { name: "lastName", label: t.lastName || "Last Name", disabled: true },
    { name: "email", label: t.emailLabel || "Email", disabled: true },
    { name: "company", label: t.companyName || "Company Name", disabled: true },
    { name: "website", label: t.websiteLabel || "Website", disabled: true },
    { name: "phone", label: t.phone || "Phone", disabled: true },
    { name: "address", label: t.address || "Address", disabled: true },
    { name: "status", label: t.statusLabel || "Status", disabled: true },
    { name: "createdAt", label: t.joinedDate || "Joined Date", disabled: true, type: "date" },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤝</span>
          <div>
            <h2 className="text-xl font-bold text-[#3a2a1a]">{t.partnersTitle}</h2>
            <p className="text-[11px] text-[#9a8a7a]">
              {stats?.active || 0} {(t.active || 'Active').toLowerCase()} - {stats?.pending || 0} {(t.pendingValidation || 'Pending').toLowerCase()}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:bg-[#6a5010] transition-colors flex items-center gap-2"
        >
          <span>+</span> {t.addPartner}
        </button>
      </div> */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Validation List */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-[#e8ddd0] p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
              <Medal className="w-4 h-4 text-[#8B6914]" /> {t.pendingValidation}
            </h3>
            <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingPartners.length}</span>
          </div>
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {pendingPartners.map((p) => (
              <PartnerCard
                key={p._id}
                partner={p}
                isPending={true}
                onApprove={handleApprove}
                onReject={handleReject}
                onView={openDetailsModal}
                onEdit={openEditModal}
                t={t}
              />
            ))}
            {pendingPartners.length === 0 && (
              <p className="text-[10px] text-[#9a8a7a] text-center py-10 italic border border-dashed border-[#e8ddd0] rounded-xl">{t.noPartnersPending || "No pending partners."}</p>
            )}
          </div>
        </div>
        {/* Active Partners with Advanced Table */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e8ddd0] bg-[#fcfaf7] flex items-center justify-between">
              <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
                <span className={queryParams.status === 'active' ? "text-green-500" : "text-blue-500"}>
                  {queryParams.status === 'active' ? <CheckCircle className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                </span>
                {queryParams.status === 'all'
                  ? (t.allPartners || "All Partners")
                  : (t[queryParams.status] ? `${t[queryParams.status]} ${t.partnersTitle}` : t.activePartners)}
              </h3>
            </div>

            <FilterBar
              onSearch={(val) => setQueryParams(p => p.search === val ? p : { ...p, search: val, page: 1 })}
              onFilterChange={(name, val) => setQueryParams(p => p[name] === val ? p : { ...p, [name]: val, page: 1 })}
              onSortChange={(sortBy, sort) => setQueryParams(p => p.sortBy === sortBy && p.sort === sort ? p : { ...p, sortBy, sort, page: 1 })}
              placeholder={t.searchPartnerPlaceholder || "Search for a partner..."}
              related={true}
              filters={[
                {
                  name: "status",
                  label: t.allStatuses || "All Statuses",
                  options: [
                    { label: t.active, value: "active" },
                    { label: t.pending, value: "pending" },
                    { label: t.inactive, value: "inactive" },
                    { label: t.blocked || "Blocked", value: "blocked" },
                    { label: t.rejected, value: "rejected" },
                    { label: t.banned || "Banned", value: "banned" }
                  ]
                }
              ]}
              sortOptions={[
                { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
                { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
                { label: t.nameAsc || "Name (A-Z)", value: "name:ascending" },
                { label: t.companyAsc || "Company (A-Z)", value: "company:ascending" }
              ]}
              actionButton={
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> {t.addPartner}
                </button>
              }
            />

            <DataTable
              columns={[
                {
                  header: t.partnersLabel || "PARTNER",
                  cell: (p) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#8B6914] flex items-center justify-center text-white font-bold text-[10px]">
                        {(p.company || p.firstName).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold">{p.company || `${p.firstName} ${p.lastName}`}</div>
                        <div className="text-[10px] text-[#9a8a7a]">{p.email}</div>
                      </div>
                    </div>
                  )
                },
                { header: t.cityLabel || "CITY", accessor: "address" },
                {
                  header: t.localMissions || "MISSIONS",
                  align: "center",
                  cell: (p) => <span className="font-bold">{p.totalMissions || 0}</span>
                },
                {
                  header: t.actionsLabel || "ACTIONS",
                  align: "right",
                  cell: (p) => (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openDetailsModal(p._id)}
                        className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-blue-200 transition-colors"
                      >
                        {t.viewBtn}
                      </button>
                      <button
                        onClick={() => openEditModal(p._id)}
                        className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-orange-200 transition-colors"
                      >
                        {t.editBtn}
                      </button>
                    </div>
                  )
                }
              ]}
              data={activePartners}
              loading={loading}
              emptyMessage={t.noPartnersFound || "No active partners found."}
            />

            <Pagination
              meta={meta}
              onPageChange={(page) => setQueryParams(p => ({ ...p, page }))}
            />
          </div>
        </div>
      </div>

      <CRUDModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t.addPartner || "Add Partner"}
        fields={partnerFields}
        onSubmit={handleAddPartner}
        loading={modalLoading}
      />

      <CRUDModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        title={t.updateStatusTitle || "Update Status"}
        fields={editFields}
        initialData={editingUser}
        onSubmit={handleEditPartner}
        loading={modalLoading}
      />

      <CRUDModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setEditingUser(null);
        }}
        title="Partner Details"
        fields={viewFields}
        initialData={editingUser}
        onSubmit={() => setIsViewModalOpen(false)}
        loading={false}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => !confirmLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}
