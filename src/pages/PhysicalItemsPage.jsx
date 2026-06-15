import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import CRUDModal from "../components/common/CRUDModal";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { Gift, Trash2, Plus, Mail } from "lucide-react";

const ItemSkeleton = () => (
  <div className="bg-white rounded-xl border border-[#e8ddd0] p-3 flex flex-col gap-2 animate-pulse h-[210px]">
    <div className="bg-[#f5f0e8] rounded-lg h-24 w-full"></div>
    <div className="flex flex-col gap-2">
      <div className="h-3 bg-[#f5f0e8] rounded w-full"></div>
      <div className="h-3 bg-[#f5f0e8] rounded w-1/3"></div>
      <div className="h-2 bg-[#f5f0e8] rounded w-2/3"></div>
    </div>
    <div className="flex gap-1 mt-auto">
      <div className="flex-1 h-[32px] bg-[#f5f0e8] rounded"></div>
      <div className="w-[36px] h-[32px] bg-[#f5f0e8] rounded"></div>
    </div>
  </div>
);

const ItemCard = React.memo(({ item, onEdit, onDelete, t }) => (
  <div className="bg-white rounded-xl border border-[#e8ddd0] p-3 flex flex-col gap-2 hover:shadow-md transition-shadow relative overflow-hidden">
    <div className="bg-[#fcfaf7] rounded-lg h-24 flex items-center justify-center text-3xl relative overflow-hidden">
      {item.photo?.secure_url ? (
        <img src={item.photo.secure_url} alt={item.title} className="w-full h-full object-cover" />
      ) : (
        <Gift className="w-10 h-10 text-[#8B6914] opacity-20" />
      )}
      {item.stock === 0 && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
          <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
            {t.outOfStock}
          </span>
        </div>
      )}
    </div>
    <div className="flex flex-col gap-0.5">
      <h4 className="text-[11px] font-bold text-[#3a2a1a] truncate">{item.title}</h4>
      <p className="text-[11px] font-bold text-orange-600">{item.points} pts</p>
      <p className="text-[9px] text-[#9a8a7a]">Stock: {item.stock} — {item.category}</p>
    </div>
    <div className="flex gap-1 mt-1">
      <button
        onClick={() => onEdit(item)}
        className="flex-1 text-[10px] font-bold py-1.5 rounded-xl bg-[#f5f0e8] text-[#3a2a1a] hover:bg-[#e8ddd0] transition-colors"
      >
        {t.editBtn}
      </button>
      <button
        onClick={() => onDelete(item._id)}
        className="px-2 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
));

export default function PhysicalItemsPage() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [itemsMeta, setItemsMeta] = useState(null);
  const [requestsMeta, setRequestsMeta] = useState(null);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [timedOut, setTimedOut] = useState(false);

  // Rewards Query State
  const [itemsQuery, setItemsQuery] = useState({
    page: 1,
    limit: 6,
    search: "",
    category: "all",
    type: "all"
  });

  // Redemptions Query State
  const [requestsQuery, setRequestsQuery] = useState({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sort: "descending"
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const q = { ...itemsQuery };
      if (q.category === "all") delete q.category;
      if (q.type === "all") delete q.type;
      const queryString = new URLSearchParams(q).toString();
      const res = await api.get(`/rewards/get-all-rewards?${queryString}`);
      if (res.data.status === "ok") {
        setItems(res.data.data || []);
        setItemsMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch rewards", err);
    } finally {
      setLoadingItems(false);
    }
  }, [itemsQuery]);

  useEffect(() => {
    setTimedOut(false);
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [itemsQuery]);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const q = { ...requestsQuery };
      if (q.status === "all") delete q.status;
      const queryString = new URLSearchParams(q).toString();
      const res = await api.get(`/rewards/admin/get-all-redemptions?${queryString}`);
      if (res.data.status === "ok") {
        setRequests(res.data.data || []);
        setRequestsMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch redemptions", err);
    } finally {
      setLoadingRequests(false);
    }
  }, [requestsQuery]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      if (editingItem) {
        await api.patch(`/rewards/admin/update-reward/${editingItem._id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post("/rewards/admin/create-reward", data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setIsModalOpen(false);
      toast.success(editingItem ? "Reward updated successfully" : "Reward created successfully");
      if (editingItem) {
        fetchItems();
      } else {
        setItemsQuery(prev => ({ ...prev, page: 1, search: '', category: 'all', type: 'all' }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Reward",
      message: "Are you sure you want to delete this reward?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/rewards/admin/delete-reward/${id}`);
          toast.success("Reward deleted successfully");
          fetchItems();
        } catch (err) {
          toast.error(err.response?.data?.message || "Delete failed");
        } finally {
          setConfirmLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleUpdateRedemptionStatus = async (id, status) => {
    try {
      await api.patch(`/rewards/admin/update-redemption-status/${id}`, { status });
      toast.success("Status updated successfully");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Status update failed");
    }
  };

  const redemptionColumns = [
    {
      header: t.user || "USER",
      cell: (req) => (
        <div className="font-bold text-[#3a2a1a]">
          {req.user?.firstName} {req.user?.lastName}
        </div>
      )
    },
    { header: t.article, cell: (req) => req.rewardItem?.title },
    { header: t.points || "POINTS", cell: (req) => <span className="font-bold text-orange-600">{req.pointsAtRedemption} pts</span> },
    { header: t.dateLabel || "DATE", cell: (req) => new Date(req.createdAt).toLocaleDateString() },
    { header: t.address, cell: (req) => <div className="max-w-[150px] truncate">{req.user?.address || "No address"}</div> },
    {
      header: t.statusLabel || "STATUS",
      cell: (req) => (
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${req.status === 'completed' ? 'bg-green-100 text-green-600' :
            req.status === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
          }`}>
          {t[req.status] || req.status}
        </span>
      )
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      cell: (req) => (
        <div className="flex gap-1 justify-end">
          {req.status === 'pending' && (
            <button
              onClick={() => handleUpdateRedemptionStatus(req._id, 'completed')}
              className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-green-200 transition-colors"
            >
              {t.completeBtn || "Completed"}
            </button>
          )}
          <button className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-xl hover:bg-blue-200 transition-colors">{t.detailsBtn}</button>
        </div>
      )
    }
  ];

  const rewardFields = [
    { name: "title", label: t.titleLabel || "Title", required: true },
    { name: "description", label: t.descriptionLabel || "Description", type: "textarea", required: true },
    { name: "points", label: t.pointsRequired || "Points Required", type: "number", required: true },
    { name: "stock", label: t.stockLabel || "Stock", type: "number", required: true },
    {
      name: "type",
      label: t.type || "Type",
      type: "select",
      required: true,
      options: [
        { label: t.productType || "Product", value: "product" },
        { label: t.giftCardType || "Gift Card", value: "giftcard" },
      ]
    },
    {
      name: "category",
      label: t.categoryLabel || "Category",
      type: "select",
      required: true,
      options: [
        { label: "Limited", value: "limited" },
        { label: "Featured", value: "featured" },
        { label: "Solidarity", value: "solidarity" },
      ]
    },
    { name: "image", label: t.itemImage || "Item Image", type: "file" },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Catalog Table */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <FilterBar
          onSearch={(val) => setItemsQuery(p => p.search === val ? p : { ...p, search: val, page: 1 })}
          onFilterChange={(name, val) => setItemsQuery(p => p[name] === val ? p : { ...p, [name]: val, page: 1 })}
          related={true}
          filters={[
            {
              name: "category",
              label: t.allCategories || "All categories",
              options: [
                { label: "Limited", value: "limited" },
                { label: "Featured", value: "featured" },
                { label: "Solidarity", value: "solidarity" }
              ]
            },
            {
              name: "type",
              label: t.allTypes || "All types",
              options: [
                { label: "Product", value: "product" },
                { label: "Gift Card", value: "giftcard" }
              ]
            }
          ]}
          actionButton={
            <button
              onClick={handleOpenAdd}
              className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t.addItem}
            </button>
          }
        />

        <div className="p-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {loadingItems && !timedOut ? (
              Array(6).fill(0).map((_, i) => <ItemSkeleton key={i} />)
            ) : items.length > 0 ? (
              items.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                  t={t}
                />
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-[#9a8a7a] text-xs italic">
                {t.noItemsFound || "No items found."}
              </div>
            )}
          </div>
          <div className="bg-[#fcfaf7] px-4 py-1">
            <Pagination
              meta={itemsMeta}
              onPageChange={(page) => setItemsQuery(p => ({ ...p, page }))}
              loading={loadingItems && !timedOut}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-[#e8ddd0] flex items-center justify-between bg-[#fcfaf7]">
          <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#8B6914]" /> {t.exchangeRequests}
          </h3>
        </div>

        <FilterBar
          onSearch={(val) => setRequestsQuery(p => p.search === val ? p : { ...p, search: val, page: 1 })}
          onFilterChange={(name, val) => setRequestsQuery(p => p[name] === val ? p : { ...p, [name]: val, page: 1 })}
          onSortChange={(sortBy, sort) => setRequestsQuery(p => p.sortBy === sortBy && p.sort === sort ? p : { ...p, sortBy, sort, page: 1 })}
          related={true}
          filters={[
            {
              name: "status",
              label: t.allStatuses || "All statuses",
              options: [
                { label: "Pending", value: "pending" },
                { label: "Completed", value: "completed" },
                { label: "Cancelled", value: "cancelled" }
              ]
            }
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.ptsDesc || "Points (Highest)", value: "points:descending" },
            { label: t.ptsAsc || "Points (Lowest)", value: "points:ascending" }
          ]}
        />

        <div className="overflow-x-auto">
          <DataTable
            columns={redemptionColumns}
            data={requests}
            loading={loadingRequests}
            emptyMessage={t.noRequestsFound || "No requests found."}
          />
        </div>
        <div className="bg-[#fcfaf7] px-4 py-1">
          <Pagination
            meta={requestsMeta}
            onPageChange={(page) => setRequestsQuery(p => ({ ...p, page }))}
            loading={loadingRequests}
          />
        </div>
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Edit Reward Item" : "Add New Reward Item"}
        fields={rewardFields}
        initialData={editingItem}
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
