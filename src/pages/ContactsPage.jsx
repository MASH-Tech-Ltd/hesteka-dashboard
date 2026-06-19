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

export default function ContactsPage() {
  const { t } = useLang();
  const [contacts, setContacts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  // Query State
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    type: "all",
    status: "active",
    search: "",
    sortBy: "name",
    sort: "ascending",
    city: "",
    country: "",
    from: "",
    to: "",
    region: "",
    department: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [stats, setStats] = useState({ all: 0, active: 0, shelter: 0, vet: 0, csrf: 0, partner: 0 });
  const [editingContact, setEditingContact] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [locations, setLocations] = useState({ departments: [], regions: [] });

  useEffect(() => {
    api.get("/contacts/locations").then(res => {
      if (res.data?.data) {
        setLocations(res.data.data);
      }
    }).catch(err => console.error("Failed to load locations", err));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const params = { ...queryParams };
      if (params.type === "all") delete params.type;
      if (!params.city) delete params.city;
      if (!params.country) delete params.country;
      if (!params.from) delete params.from;
      if (!params.to) delete params.to;
      if (!params.region || params.region === 'all') delete params.region;
      if (!params.department || params.department === 'all') delete params.department;

      const queryString = new URLSearchParams(params).toString();
      const [res, statsRes] = await Promise.all([
        api.get(`/contacts/get-all-contacts?${queryString}`),
        api.get("/contacts/stats")
      ]);

      if (res.data.status === "ok" || res.data.contacts) {
        const fetchedContacts = res.data.contacts || res.data.data || [];
        setContacts(fetchedContacts);
        setMeta(res.data.meta);
      }

      if (statsRes.data.status === "ok" || statsRes.data.data) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch contacts data", err);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteContact = (contactId) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Contact",
      message: "Are you sure you want to delete this contact? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await api.delete(`/contacts/delete-contact/${contactId}`);
          if (res.data.status === "ok" || res.status === 200) {
            toast.success("Contact deleted successfully");
            fetchData();
          }
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete contact");
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined && formData[key] !== null) {
          data.append(key, formData[key]);
        }
      });

      if (editingContact) {
        const res = await api.patch(`/contacts/update-contact/${editingContact._id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.status === "ok" || res.status === 200) {
          toast.success("Contact updated successfully");
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        const res = await api.post("/contacts/create-contact", data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.status === "ok" || res.status === 201) {
          toast.success("Contact created successfully");
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save contact");
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (contact) => {
    if (contact.type?.toLowerCase() === "partner") {
      toast.info(t.updatePartnerInfoMsg || "To update partner info, please go to the Partners page.");
      return;
    }
    setEditingContact(contact);
    setIsViewOnly(false);
    setIsModalOpen(true);
  };

  const openViewModal = (contact) => {
    setEditingContact(contact);
    setIsViewOnly(true);
    setIsModalOpen(true);
  };

  const columns = [
    {
      header: t.nameLabel || "NAME",
      cell: (contact) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#8B6914] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden border border-[#e8ddd0]">
            {contact.photo?.secure_url ? (
              <img src={contact.photo.secure_url} alt="" className="w-full h-full object-cover" />
            ) : (
              contact.name?.charAt(0).toUpperCase() || "C"
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#3a2a1a] truncate max-w-[150px]">{contact.name}</span>
            <span className="text-[9px] text-[#9a8a7a] uppercase tracking-widest font-bold">{t[contact.type] || contact.type}</span>
          </div>
        </div>
      ),
    },
    {
      header: t.address || "ADDRESS",
      cell: (contact) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-[#3a2a1a] truncate" title={contact.address}>{contact.address || "N/A"}</p>
          <p className="text-[10px] text-[#9a8a7a] font-medium">{contact.city}, {contact.country}</p>
        </div>
      ),
    },
    {
      header: t.phone || "PHONE",
      accessor: "phone",
      cell: (contact) => <span className="text-sm font-medium text-[#5a4a3a]">{contact.phone || "N/A"}</span>
    },
    {
      header: t.emailLabel || "EMAIL",
      accessor: "email",
      cell: (contact) => <span className="text-sm truncate max-w-[150px] inline-block text-[#5a4a3a]">{contact.email || "N/A"}</span>
    },
    {
      header: t.status,
      cell: (contact) => <StatusBadge status={contact.status} />,
    },
    {
      header: t.actions || "ACTIONS",
      align: "right",
      cell: (contact) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => openViewModal(contact)}
            className="w-17 py-1 rounded bg-blue-100 text-blue-600 font-bold text-[10px] hover:bg-blue-200 transition-colors"
          >
            {t.viewBtn || "View"}
          </button>
          <button
            onClick={() => openEditModal(contact)}
            className="w-17 py-1 rounded font-bold text-[10px] transition-colors bg-orange-100 text-orange-600 hover:bg-orange-200"
          >
            {t.editBtn || "Edit"}
          </button>
          <button
            onClick={() => handleDeleteContact(contact._id)}
            className="w-17 py-1 rounded font-bold text-[10px] transition-colors bg-red-50 text-red-600 hover:bg-red-100"
          >
            {t.deleteBtn || "Delete"}
          </button>
        </div>
      ),
    },
  ];

  const getContactFields = () => [
    { name: "name", label: t.nameLabel || "Name", required: !editingContact, disabled: isViewOnly },
    {
      name: "type",
      label: t.type || "Type",
      type: "select",
      required: !editingContact,
      disabled: isViewOnly,
      options: [
        { label: t.shelter || "Shelter", value: "shelter" },
        { label: t.veterinarian || "Veterinarian", value: "veterinarian" },
        { label: "CSRF", value: "CSRF" },
        { label: t.partnerRole || "Partner", value: "partner" },
      ],
    },
    { name: "email", label: t.emailLabel || "Email", type: "email", disabled: isViewOnly },
    { name: "phone", label: t.phone || "Phone", disabled: isViewOnly },
    { name: "website", label: t.websiteLabel || "Website", disabled: isViewOnly },
    { name: "address", label: t.address || "Address", required: !editingContact, disabled: isViewOnly },
    { name: "city", label: t.cityLabel || "City", required: !editingContact, disabled: isViewOnly },
    { name: "country", label: t.countryLabel || "Country", required: !editingContact, disabled: isViewOnly },
    { 
      name: "region", 
      label: t.regionLabel || "Region", 
      type: "select", 
      required: !editingContact, 
      disabled: isViewOnly,
      options: locations.regions.map(r => ({ label: r, value: r })) 
    },
    { 
      name: "department", 
      label: t.departmentLabel || "Department", 
      type: "select", 
      required: !editingContact, 
      disabled: isViewOnly,
      options: locations.departments.map(d => ({ label: d, value: d })) 
    },
    { name: "description", label: t.descriptionLabel || "Description", type: "textarea", disabled: isViewOnly },
    { name: "latitude", label: t.latitudeLabel || "Latitude", type: "number", disabled: isViewOnly },
    { name: "longitude", label: t.longitudeLabel || "Longitude", type: "number", disabled: isViewOnly },
    {
      name: "status",
      label: t.statusLabel || "Status",
      type: "select",
      required: !editingContact,
      disabled: isViewOnly,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
    { name: "image", label: "Photo", type: "file", disabled: isViewOnly },
  ];

  return (
    <div className="px-6 py-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard loading={loading} label={t.allContacts?.toUpperCase() || "ALL CONTACTS"} value={{ text: (stats.all || 0).toLocaleString(), color: "text-[#3a2a1a]" }} />
        <StatCard loading={loading} label={t.activeLabel || "ACTIVE"} value={{ text: (stats.active || 0).toLocaleString(), color: "text-green-600" }} />
        <StatCard loading={loading} label={t.shelter?.toUpperCase() || "SHELTER"} value={{ text: (stats.shelter || 0).toLocaleString(), color: "text-blue-600" }} />
        <StatCard loading={loading} label={t.vet?.toUpperCase() || "VET"} value={{ text: (stats.vet || 0).toLocaleString(), color: "text-orange-600" }} />
        <StatCard loading={loading} label={"CSRF"} value={{ text: (stats.csrf || 0).toLocaleString(), color: "text-purple-600" }} />
        <StatCard loading={loading} label={t.partnerRole?.toUpperCase() || "PARTNER"} value={{ text: (stats.partner || 0).toLocaleString(), color: "text-teal-600" }} />
      </div>

      <div className="bg-white rounded-2xl border border-[#e8ddd0] shadow-sm overflow-hidden flex flex-col">
        {/* Primary Actions & Secondary Filters (Integrated) */}
        <div className="bg-white border-b border-[#e8ddd0] p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.location || "LOCATION"}:</span>
              <input
                type="text"
                placeholder={t.cityLabel || "City..."}
                value={queryParams.city}
                onChange={(e) => setQueryParams(p => ({ ...p, city: e.target.value, page: 1 }))}
                className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-1.5 text-[11px] text-[#3a2a1a] outline-none focus:border-[#8B6914] w-24 transition-all"
              />
              <input
                type="text"
                placeholder={t.countryLabel || "Country..."}
                value={queryParams.country}
                onChange={(e) => setQueryParams(p => ({ ...p, country: e.target.value, page: 1 }))}
                className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-1.5 text-[11px] text-[#3a2a1a] outline-none focus:border-[#8B6914] w-24 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 border-l border-[#e8ddd0] pl-3">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.dateLabel || "DATE"}:</span>
              <input
                type="date"
                value={queryParams.from}
                onChange={(e) => setQueryParams(p => ({ ...p, from: e.target.value, page: 1 }))}
                className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-2 py-1 text-[11px] text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all"
              />
              <span className="text-[#9a8a7a] text-[10px]">{t.to || "to"}</span>
              <input
                type="date"
                value={queryParams.to}
                onChange={(e) => setQueryParams(p => ({ ...p, to: e.target.value, page: 1 }))}
                className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-2 py-1 text-[11px] text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setQueryParams({ city: "", country: "", from: "", to: "", search: "", type: "all", status: "active", region: "all", department: "all", page: 1 })}
              className="text-[10px] font-bold text-[#8B6914] hover:underline"
            >
              {t.clearFilters || "Clear all filters"}
            </button>
            <button
              onClick={() => {
                setEditingContact(null);
                setIsViewOnly(false);
                setIsModalOpen(true);
              }}
              className="bg-[#8B6914] text-white text-[11px] font-black px-6 py-2.5 rounded-xl hover:bg-[#6a5010] transition-all flex items-center gap-2 shadow-lg shadow-[#8B6914]/20 active:scale-95"
            >
              <span className="text-sm">+</span> {t.addContact}
            </button>
          </div>
        </div>

        <FilterBar
          onSearch={(val) => setQueryParams((p) => (p.search === val ? p : { ...p, search: val, page: 1 }))}
          onFilterChange={(name, val) => setQueryParams((p) => (p[name] === val ? p : { ...p, [name]: val, page: 1 }))}
          onSortChange={(sortBy, sort) => setQueryParams((p) => (p.sortBy === sortBy && p.sort === sort ? p : { ...p, sortBy, sort, page: 1 }))}
          related={true}
          filters={[
            {
              name: "type",
              label: t.allTypes,
              value: queryParams.type || 'all',
              options: [
                { label: t.shelter || "Shelter", value: "shelter" },
                { label: t.veterinarian || "Veterinarian", value: "veterinarian" },
                { label: "CSRF", value: "CSRF" },
                { label: t.partnerRole || "Partner", value: "partner" },
              ],
            },
            {
              name: "status",
              label: t.allStatuses,
              value: queryParams.status || 'all',
              options: [
                { label: t.active || "Active", value: "active" },
                { label: t.inactive || "Inactive", value: "inactive" },
              ],
            },
            {
              name: "region",
              label: t.regionLabel || "Region...",
              value: queryParams.region || 'all',
              options: locations.regions.map(r => ({ label: r, value: r })),
            },
            {
              name: "department",
              label: t.departmentLabel || "Dept...",
              value: queryParams.department || 'all',
              options: locations.departments.map(d => ({ label: d, value: d })),
            },
          ]}
          sortOptions={[
            { label: t.nameAsc || "Name (A-Z)", value: "name:ascending" },
            { label: t.nameDesc || "Name (Z-A)", value: "name:descending" },
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
          ]}
        />

        <DataTable
          columns={columns}
          data={contacts}
          loading={loading}
          skeletonCount={10}
          emptyMessage={t.noItemsFound}
        />

        <div className="bg-[#fcfaf7]">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
          />
        </div>
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingContact(null);
        }}
        isViewOnly={isViewOnly}
        title={editingContact ? t.editContact : t.addContact}
        fields={getContactFields()}
        initialData={editingContact}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => !confirmLoading && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}

