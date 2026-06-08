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
import { Star, Plus } from "lucide-react";

export default function UsersPage() {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Query State
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    role: "all",
    status: "all",
    search: "",
    sortBy: "date",
    sort: "descending"
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(queryParams).toString();
      const [usersRes, statsRes] = await Promise.all([
        api.get(`/user/get-all-user?${queryString}`),
        api.get("/admin/stats/users"),
      ]);
      
      if (usersRes.data.status === "ok") {
        setUsers(usersRes.data.data || []);
        setMeta(usersRes.data.meta);
      }
      if (statsRes.data.status === "ok") {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch users data", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = (userId, newStatus) => {
    setConfirmModal({
      isOpen: true,
      title: t.updateStatusTitle || "Update Status",
      message: `${t.confirmUpdateMessageTo || "Are you sure you want to change the user's status to"} ${newStatus}?`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.patch(`/user/update-status/${userId}`, { status: newStatus });
          if (res.data.status === "ok") {
            toast.success(`${t.statusLabel || "Status"} ${newStatus} ${t.updating || "updated"}`);
            fetchData();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
          setConfirmLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      if (editingUser) {
        // Collect updated fields for the admin update API
        const updatePayload = {};
        if (formData.role && formData.role !== editingUser.role) {
          updatePayload.role = formData.role;
        }
        if (formData.status && formData.status !== editingUser.status) {
          updatePayload.status = formData.status;
        }

        if (Object.keys(updatePayload).length > 0) {
          await api.patch(`/user/update-user-admin/${editingUser._id}`, updatePayload);
        }
        setIsModalOpen(false);
        setEditingUser(null);
        toast.success("User updated successfully");
        fetchData();
      } else {
        const endpoint = formData.role === "partners" ? "/auth/register-partner" : "/auth/register-user";
        const res = await api.post(endpoint, formData);
        if (res.data.status === "ok" || res.status === 201) {
          setIsModalOpen(false);
          toast.success("User created successfully");
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save user");
    } finally {
      setModalLoading(false);
    }
  };

  const openDetailsModal = async (userId) => {
    try {
      const res = await api.get(`/user/get-single-user/${userId}`);
      if (res.data.status === "ok") {
        setEditingUser(res.data.data);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch user details", err);
      toast.error("Failed to load user details");
    }
  };

  const columns = [
    {
      header: t.user,
      cell: (user) => {
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A";
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-[#3a2a1a] truncate">{name}</span>
          </div>
        );
      }
    },
    { header: t.email, accessor: "email" },
    {
      header: t.status,
      cell: (user) => <StatusBadge status={user.status} />
    },
    {
      header: t.points,
      cell: (user) => (
        <div className="flex items-center gap-1 font-bold">
          <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" /> {user.points || user.pointsBalance || 0}
        </div>
      )
    },
    { 
      header: t.role || "ROLE", 
      accessor: "role", 
      align: "center", 
      cell: (user) => <span className="uppercase text-[10px] font-bold px-2 py-1 bg-[#f5f0e8] text-[#8B6914] rounded-lg">
        {user.role === 'admin' ? t.adminRole : user.role === 'partners' ? t.partnerRole : t.userRole}
      </span> 
    },
    { 
      header: t.address || "ADDRESS", 
      accessor: "address", 
      cell: (user) => <div className="max-w-[150px] truncate" title={user.address}>{user.address || "N/A"}</div> 
    },
    {
      header: t.actions,
      align: "right",
      cell: (user) => (
        <div className="flex gap-1 justify-end">
          <button onClick={() => openDetailsModal(user._id)} className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-200 transition-colors">{t.detailsBtn || "Details"}</button>
          {user.status !== "active" && (
            <button 
              onClick={() => handleUpdateStatus(user._id, "active")}
              className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-green-200 transition-colors"
            >
              {t.activateNow || "Activate"}
            </button>
          )}
          {user.status === "active" && (
            <button 
              onClick={() => handleUpdateStatus(user._id, "inactive")}
              className="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-gray-200 transition-colors"
            >
              {t.deactivateBtn || "Deactivate"}
            </button>
          )}
          {user.status !== "blocked" && user.status !== "banned" && (
            <button 
              onClick={() => handleUpdateStatus(user._id, "blocked")}
              className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-orange-200 transition-colors"
            >
              {t.blocked || "Block"}
            </button>
          )}
        </div>
      )
    }
  ];

  const getUserFields = (isEditing) => [
    { name: "firstName", label: t.firstName || "First Name", required: true, disabled: isEditing },
    { name: "lastName", label: t.lastName || "Last Name", required: true, disabled: isEditing },
    { name: "email", label: t.emailLabel || "Email", type: "email", required: true, disabled: isEditing },
    ...(!isEditing ? [{ name: "password", label: t.passwordLabel || "Password", type: "password", required: true }] : []),
    { name: "phone", label: t.phone || "Phone", required: true, disabled: isEditing },
    { name: "address", label: t.address || "Address", required: true, disabled: isEditing },
    { name: "company", label: t.company || "Company", disabled: isEditing },
    { 
      name: "role", 
      label: t.role || "Role", 
      type: "select", 
      required: true,
      disabled: false,
      options: [
        { label: t.userRole || "User", value: "user" },
        { label: t.partnerRole || "Partner", value: "partners" },
        { label: t.adminRole || "Admin", value: "admin" },
      ]
    },
    ...(isEditing ? [{
      name: "status",
      label: t.statusLabel || "Status",
      type: "select",
      required: true,
      options: [
        { label: t.active || "Active", value: "active" },
        { label: t.inactive || "Inactive", value: "inactive" },
        { label: t.blocked || "Blocked", value: "blocked" },
        { label: t.banned || "Banned", value: "banned" }
      ]
    }] : [])
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard loading={loading} label={t.totalRegistered} value={{ text: (stats?.total || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-purple-500" />
        <StatCard loading={loading} label={t.activeLabel} value={{ text: (stats?.active || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-green-500" />
        <StatCard loading={loading} label={t.suspendedLabel} value={{ text: (stats?.suspended || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-red-500" />
        <StatCard loading={loading} label={t.newThisMonth} value={{ text: (stats?.newThisMonth || 0).toLocaleString(), color: "text-blue-600" }} color="bg-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <FilterBar 
          onSearch={(val) => setQueryParams(p => p.search === val ? p : { ...p, search: val, page: 1 })}
          onFilterChange={(name, val) => setQueryParams(p => p[name] === val ? p : { ...p, [name]: val, page: 1 })}
          onSortChange={(sortBy, sort) => setQueryParams(p => p.sortBy === sortBy && p.sort === sort ? p : { ...p, sortBy, sort, page: 1 })}
          related={true}
          filters={[
            { name: "role", label: t.allRoles || "All roles", options: [
                { label: t.userRole || "User", value: "user" },
                { label: t.partnerRole || "Partner", value: "partners" },
                { label: t.adminRole || "Admin", value: "admin" }
            ]},
            { name: "status", label: t.allStatuses || "All statuses", options: [
                { label: t.active || "Active", value: "active" },
                { label: t.inactive || "Inactive", value: "inactive" },
                { label: t.blocked || "Blocked", value: "blocked" },
                { label: t.banned || "Banned", value: "banned" }
            ]}
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.nameAsc || "Name (A-Z)", value: "name:ascending" },
            { label: t.nameDesc || "Name (Z-A)", value: "name:descending" },
            { label: t.emailAsc || "Email (A-Z)", value: "email:ascending" }
          ]}
          actionButton={
            <div className="flex gap-2">
              <button 
                onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> {t.addUser || "Add User"}
              </button>
            </div>
          }
        />
        <div className="overflow-x-auto">
          <DataTable 
            columns={columns}
            data={users}
            loading={loading}
            emptyMessage={t.noUsersFound || "No users found matching your criteria."}
          />
        </div>

        <div className="bg-[#fcfaf7]">
          <Pagination 
            meta={meta}
            onPageChange={(page) => setQueryParams(p => ({ ...p, page }))}
          />
        </div>
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? "User Details" : "Add New User"}
        fields={getUserFields(!!editingUser)}
        initialData={editingUser}
        onSubmit={handleSubmit}
        loading={modalLoading}
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
