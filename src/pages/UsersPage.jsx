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
import { Star, Plus, Trash2, X, AlertTriangle } from "lucide-react";

const DeleteUserModal = ({ isOpen, user, onClose, onConfirm, loading }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center bg-[#fcfaf7]">
          <h2 className="text-lg font-bold text-[#3a2a1a] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" /> Confirm Deletion
          </h2>
          <button 
            onClick={onClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-[#5a4a3a] mb-4">
            You are about to delete user <strong>{user?.firstName} {user?.lastName} ({user?.email})</strong>.
          </p>
          <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-lg text-xs font-medium mb-2 flex flex-col gap-2">
            <p className="font-bold uppercase tracking-wider text-[10px]">Warning: Permanent Action</p>
            <p>This will initiate a cascading delete that removes:</p>
            <ul className="list-disc ml-5 opacity-90 space-y-1">
              <li>All chat messages & community posts</li>
              <li>Animal reports & associated comments</li>
              <li>Mission participations & partner ads</li>
              <li>Private conversations & direct messages</li>
            </ul>
            <p className="mt-1 text-red-800 font-semibold opacity-90">Financial records (donations, payments) will be securely anonymized.</p>
          </div>
        </div>

        <div className="p-4 bg-[#fcfaf7] border-t border-[#f0e8d8] flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-[#e8ddd0] text-[#3a2a1a] text-sm font-bold hover:bg-white transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || countdown > 0}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {countdown > 0 ? `Wait ${countdown}s...` : "Delete Permanently"}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [deleteUserModal, setDeleteUserModal] = useState({ isOpen: false, user: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formErrors, setFormErrors] = useState([]);

  const [locations, setLocations] = useState({ regions: [], departments: [] });

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
    
    const fetchLocations = async () => {
      try {
        const res = await api.get("/contacts/locations");
        if (res.data.status === "ok") {
          setLocations(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    };
    fetchLocations();
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
    setFormErrors([]);
    try {
      if (editingUser) {
        // Collect updated fields for the admin update API
        const formDataPayload = new FormData();
        const editableFields = ["firstName", "lastName", "phone", "address", "postalCode", "city", "country", "company", "role", "status", "region", "department"];
        
        editableFields.forEach(field => {
          if (formData[field] !== undefined && formData[field] !== editingUser[field]) {
            formDataPayload.append(field, formData[field]);
          }
        });

        // Append files if selected
        if (formData.profileImage instanceof File) formDataPayload.append("profileImage", formData.profileImage);
        if (formData.logo instanceof File) formDataPayload.append("logo", formData.logo);
        if (formData.partnerImage instanceof File) formDataPayload.append("partnerImage", formData.partnerImage);

        // Check if formDataPayload has any keys
        const hasData = Array.from(formDataPayload.keys()).length > 0;

        if (hasData) {
          await api.patch(`/user/update-user-admin/${editingUser._id}`, formDataPayload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        setIsModalOpen(false);
        setEditingUser(null);
        toast.success("User updated successfully");
        fetchData();
      } else {
        const payloadData = { ...formData };
        
        if (payloadData.role === "partners") {
          const endpoint = "/auth/register-partner";
          delete payloadData.role; // Omitted in registerPartnerSchema
          
          const partnerFormData = new FormData();
          Object.keys(payloadData).forEach(key => {
            if (payloadData[key] !== undefined && payloadData[key] !== null && payloadData[key] !== "") {
              if (key === "profileImage") {
                partnerFormData.append("logo", payloadData[key]);
              } else {
                partnerFormData.append(key, payloadData[key]);
              }
            }
          });
          
          const res = await api.post(endpoint, partnerFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          if (res.data?.status === "ok" || res.status === 201) {
            setIsModalOpen(false);
            toast.success("Partner created successfully");
            fetchData();
          }
        } else {
          const endpoint = "/auth/register-user";
          
          // Delete fields not accepted by registerUserSchema (strict schema)
          delete payloadData.postalCode;
          delete payloadData.city;
          delete payloadData.profileImage;
          delete payloadData.partnerImage;
          delete payloadData.logo;
          delete payloadData.latitude;
          delete payloadData.longitude;
          
          const res = await api.post(endpoint, payloadData);
          
          if (res.data?.status === "ok" || res.status === 201) {
            setIsModalOpen(false);
            toast.success("User created successfully");
            fetchData();
          }
        }
      }
    } catch (err) {
      if (err.response?.data?.data && Array.isArray(err.response.data.data)) {
        setFormErrors(err.response.data.data);
      }
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
        setFormErrors([]);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch user details", err);
      toast.error("Failed to load user details");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/user/delete-user/${deleteUserModal.user._id}`);
      if (res.data.status === "ok" || res.status === 200) {
        toast.success("User permanently deleted and related records cleared.");
        setDeleteUserModal({ isOpen: false, user: null });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user");
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      header: t.user,
      cell: (user) => {
        const name = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "N/A";
        const avatarUrl = user.profileImage?.secure_url || user.logo?.secure_url;
        return (
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#e8ddd0]" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold text-xs shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
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
          <button 
            onClick={() => setDeleteUserModal({ isOpen: true, user })}
            className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1 rounded hover:bg-red-100 transition-colors flex items-center justify-center"
            title="Delete User"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  const getUserFields = (isEditing) => [
    { name: "profileImage", label: "Profile Image / Logo", type: "file" },
    { name: "partnerImage", label: "Cover Image", type: "file" },
    { name: "firstName", label: t.firstName || "First Name", required: !isEditing },
    { name: "lastName", label: t.lastName || "Last Name", required: !isEditing },
    { name: "email", label: t.emailLabel || "Email", type: "email", required: !isEditing, disabled: isEditing },
    ...(!isEditing ? [{ name: "password", label: t.passwordLabel || "Password", type: "password", required: true }] : []),
    { name: "phone", label: t.phone || "Phone", required: !isEditing },
    { name: "address", label: t.address || "Address", required: !isEditing, fullWidth: isEditing },
    { name: "postalCode", label: t.postalCode || "Postal Code", required: !isEditing },
    { name: "city", label: t.city || "City", required: !isEditing },
    {
      name: "region",
      label: t.regionLabel || "Region",
      type: "select",
      options: [
        { value: "", label: t.selectRegion || "Select a region" },
        ...locations.regions.map(r => ({ value: r, label: r }))
      ]
    },
    {
      name: "department",
      label: t.departmentLabel || "Department",
      type: "select",
      options: [
        { value: "", label: t.selectDepartment || "Select a department" },
        ...locations.departments.map(d => ({ value: d, label: d }))
      ]
    },
    { name: "company", label: t.company || "Company", required: false },
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
    }] : []),
    {
      name: "country",
      label: t.countryLabel || "Country",
      type: "select",
      defaultValue: !isEditing ? "France" : undefined,
      options: [
        { value: "", label: t.selectCountry || "Select a country" },
        ...(locations.countries ? locations.countries.map(c => ({ value: c, label: c })) : [])
      ]
    }
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard loading={loading} label={t.totalRegistered} value={{ text: (stats?.total || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-purple-500" />
        <StatCard loading={loading} label={t.activeLabel} value={{ text: (stats?.active || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-green-500" />
        <StatCard loading={loading} label={t.suspendedLabel} value={{ text: (stats?.suspended || 0).toLocaleString(), color: "text-[#3a2a1a]" }} color="bg-red-500" />
        <StatCard loading={loading} label={t.newThisMonth} value={{ text: (stats?.newThisMonth || 0).toLocaleString(), color: "text-blue-600" }} color="bg-blue-500" />
        <StatCard loading={loading} label={t.pendingPartners || "PENDING PARTNERS"} value={{ text: (stats?.pendingPartners || 0).toLocaleString(), color: "text-orange-600" }} color="bg-orange-500" />
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
          setFormErrors([]);
        }}
        title={editingUser ? "User Details" : "Add New User"}
        fields={getUserFields(!!editingUser)}
        initialData={editingUser}
        onSubmit={handleSubmit}
        loading={modalLoading}
        fieldErrors={formErrors}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => !confirmLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />

      <DeleteUserModal 
        isOpen={deleteUserModal.isOpen}
        user={deleteUserModal.user}
        onClose={() => !deleteLoading && setDeleteUserModal({ isOpen: false, user: null })}
        onConfirm={handleDeleteUser}
        loading={deleteLoading}
      />
    </div>
  );
}
