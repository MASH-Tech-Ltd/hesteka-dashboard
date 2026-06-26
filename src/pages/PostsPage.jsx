import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import { MessageSquare, Trash2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import api from "../utils/api";
import Pagination from "../components/common/Pagination";

export default function PostsPage() {
  const { t } = useLang();
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(queryParams).toString();
      const res = await api.get(`/community/chat/global?${qs}`);
      if (res.data.status === "ok") {
        setPosts(res.data.data || []);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      toast.error(err.response?.data?.message || "Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async () => {
    setConfirmLoading(true);
    try {
      const res = await api.delete(`/community/chat/admin/${confirmModal.id}`);
      if (res.data.status === "ok" || res.status === 200) {
        toast.success("Post deleted successfully");
        setConfirmModal({ isOpen: false, id: null });
        fetchPosts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete post");
    } finally {
      setConfirmLoading(false);
    }
  };

  const columns = [
    {
      header: "Author",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#8B6914] text-white flex items-center justify-center font-bold overflow-hidden shrink-0">
            {r.user?.profileImage?.secure_url ? (
              <img
                src={r.user.profileImage.secure_url}
                alt="author"
                className="w-full h-full object-cover"
              />
            ) : (
              r.user?.firstName?.charAt(0)?.toUpperCase() || "U"
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {r.user?.firstName} {r.user?.lastName}
            </span>
            <span className="text-xs text-gray-500">{r.user?.email || "No email"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Content",
      cell: (r) => (
        <div className="flex flex-col gap-3 max-w-sm py-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
        </div>
      ),
    },
    {
      header: "Media",
      cell: (r) => {
        if (!r.media || r.media.length === 0) return <span className="text-xs text-gray-400">None</span>;
        return (
          <div className="flex flex-wrap gap-2 py-2">
            {r.media.map((m, idx) => {
              const optimizedUrl = m.url?.includes("cloudinary.com") 
                ? m.url.replace("/upload/", "/upload/w_500,h_300,c_fill/") 
                : m.url;
                
              return m.type === "image" ? (
                <img
                  key={idx}
                  src={optimizedUrl}
                  alt="post media"
                  className="w-[150px] h-[100px] object-cover rounded-lg border border-gray-200 shadow-sm"
                />
              ) : (
                <span key={idx} className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold bg-blue-50 w-fit px-1.5 py-0.5 rounded">
                  <ImageIcon className="w-3 h-3" /> {m.type}
                </span>
              )
            })}
          </div>
        );
      },
    },
    {
      header: "Location",
      cell: (r) => {
        const address = r.location?.address;
        const coords = r.location?.coordinates;
        
        if (address) {
          return (
            <span className="text-xs text-gray-500 truncate block max-w-[150px]" title={address}>
              {address}
            </span>
          );
        }
        
        if (coords && coords.length === 2) {
          return (
            <span className="text-xs text-gray-500 truncate block max-w-[150px]">
              {coords[1].toFixed(4)}, {coords[0].toFixed(4)}
            </span>
          );
        }
        
        return <span className="text-xs text-gray-500">N/A</span>;
      },
    },
    {
      header: "Date",
      cell: (r) => {
        const date = new Date(r.createdAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-700">{date.toLocaleDateString()}</span>
            <span className="text-xs text-gray-500">{date.toLocaleTimeString()}</span>
          </div>
        );
      },
    },
    {
      header: t.actions || "ACTIONS",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmModal({ isOpen: true, id: r._id })}
            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] p-6 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#8B6914]" />
            {t.posts || "Posts (Temporary)"}
          </h1>
          <p className="text-sm text-[#9a8a7a] mt-1">
            Manage community posts (chat messages).
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden">
        <FilterBar
          onSearch={(val) => {}}
          onFilterChange={(name, val) => {}}
          onSortChange={(sortBy, sort) => {}}
          filters={[]}
          sortOptions={[]}
        />

        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={posts}
            loading={loading}
            emptyMessage="No posts found."
          />
        </div>

        <div className="p-4">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
          />
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        onConfirm={handleDelete}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        loading={confirmLoading}
      />
    </div>
  );
}
