import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import ArticleModal from "../components/articles/ArticleModal";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import Pagination from "../components/common/Pagination";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { Plus, Trash2, Tag } from "lucide-react";

export default function ArticlesPage() {
  const { t } = useLang();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [meta, setMeta] = useState(null);
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    search: "",
    status: "all",
    sortBy: "date",
    sort: "descending",
  });

  // ─── Category Management ──────────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/articles/get-article-category");
      if (res.data?.data) setCategories(res.data.data);
    } catch {
      // silent — not critical
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  // ─── Fetch All Articles (Admin) ───────────────────────────────────────────
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(
        // strip empty values so they don't clobber backend defaults
        Object.fromEntries(Object.entries(queryParams).filter(([, v]) => v !== ""))
      ).toString();
      const res = await api.get(`/articles/get-all-article?${queryString}`);
      if (res.data.status === "ok") {
        setArticles(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (err) {
      console.error("Failed to fetch articles", err);
      toast.error(err.response?.data?.message || "Failed to fetch articles");
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ─── Create / Update ──────────────────────────────────────────────────────
  const handleCreateOrUpdate = async (formData) => {
    setModalLoading(true);
    try {
      const isUpdate = !!editingArticle;

      // New backend endpoints:
      // POST  /articles                      → create
      // PATCH /articles/update-article/:id  → update
      const url = isUpdate
        ? `/articles/update-article/${editingArticle._id}`
        : "/articles";
      const method = isUpdate ? "patch" : "post";

      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      const res = await api[method](url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedArticle = res.data.data;

      if (isUpdate) {
        setArticles((prev) =>
          prev.map((a) => (a._id === updatedArticle._id ? updatedArticle : a))
        );
        toast.success(t.articleUpdatedSuccess || "Article updated successfully");
      } else {
        // After create, refresh list to reflect correct pagination/sort
        fetchArticles();
        toast.success(t.articleCreatedSuccess || "Article created successfully");
      }

      setIsModalOpen(false);
      setEditingArticle(null);
      fetchCategories(); // keep category filter in sync
    } catch (err) {
      console.error(err);
      const errData = err.response?.data;
      // Handle validation error arrays
      if (errData?.meta?.errors && Array.isArray(errData.meta.errors)) {
        errData.meta.errors.forEach((e) => toast.error(`${e.field}: ${e.message}`));
      } else if (errData?.data && Array.isArray(errData.data)) {
        errData.data.forEach((e) => toast.error(`${e.field}: ${e.message}`));
      } else {
        toast.error(errData?.message || t.operationFailed || "Operation failed");
      }
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Category Add / Delete ────────────────────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryLoading(true);
    try {
      const res = await api.post("/articles/create-article-category", { name });
      setCategories((prev) => [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      toast.success(`Category "${name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    if (!cat._id) {
      toast.info("This category is auto-detected from existing articles and cannot be deleted here.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message: `Delete category "${cat.name}"? Existing articles using it will keep their category value.`,
      onConfirm: async () => {
        try {
          await api.delete(`/articles/delete-article-category/${cat._id}`);
          setCategories((prev) => prev.filter((c) => c._id !== cat._id));
          toast.success(`Category "${cat.name}" deleted`);
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to delete category");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // ─── Delete Article ───────────────────────────────────────────────────────
  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.deleteArticle || "Delete Article",
      message:
        t.confirmDeleteArticle ||
        "Are you sure you want to delete this article? This action cannot be undone.",
      onConfirm: async () => {
        try {
          // New endpoint: DELETE /articles/delete-article/:id
          await api.delete(`/articles/delete-article/${id}`);
          toast.success(t.articleDeletedSuccess || "Article deleted successfully");
          // Remove from local state immediately for snappy UX
          setArticles((prev) => prev.filter((a) => a._id !== id));
          // Refresh to fix pagination counts
          fetchArticles();
        } catch (err) {
          toast.error(
            err.response?.data?.message ||
              t.failedDeleteArticle ||
              "Failed to delete article"
          );
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // ─── Table Columns ────────────────────────────────────────────────────────
  const columns = [
    {
      header: t.titleLabel || "Title",
      accessor: "title",
      cell: (row) => (
        <span className="font-semibold text-[#3a2a1a] line-clamp-2">{row.title}</span>
      ),
    },
    {
      header: t.categoryLabel || "Category",
      accessor: "mainCategory",
      cell: (row) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#f5ede0] text-[#8B6914]">
          {row.mainCategory}
        </span>
      ),
    },
    {
      header: t.tagLabel || "Tag",
      accessor: "tag",
      cell: (row) => (
        <span className="text-xs text-gray-500 uppercase tracking-widest">{row.tag}</span>
      ),
    },
    {
      header: t.authorLabel || "Author",
      accessor: "author",
    },
    {
      header: t.featured || "Featured",
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded text-xs font-bold ${
            row.isFeatured
              ? "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {row.isFeatured ? t.yes || "Yes" : t.no || "No"}
        </span>
      ),
    },
    {
      header: t.readTimeLabel || "Read Time",
      cell: (row) => (
        <span className="text-xs text-gray-500">{row.readTime} min</span>
      ),
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
              setEditingArticle(row);
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
      ),
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">

        <FilterBar
          onSearch={(val) =>
            setQueryParams((p) =>
              p.search === val ? p : { ...p, search: val, page: 1 }
            )
          }
          onFilterChange={(name, val) =>
            setQueryParams((p) =>
              p[name] === val ? p : { ...p, [name]: val, page: 1 }
            )
          }
          onSortChange={(sortBy, sort) =>
            setQueryParams((p) =>
              p.sortBy === sortBy && p.sort === sort
                ? p
                : { ...p, sortBy, sort, page: 1 }
            )
          }
          related={true}
          filters={[
            {
              name: "status",
              label: t.allStatuses || "All statuses",
              options: [
                { label: t.active || "Active", value: "active" },
                { label: t.inactive || "Inactive", value: "inactive" },
              ],
            },
            {
              name: "category",
              label: "All categories",
              options: categories.map((c) => ({ label: c.name, value: c.name })),
            },
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.titleAsc || "Title (A-Z)", value: "title:ascending" },
            { label: t.titleDesc || "Title (Z-A)", value: "title:descending" },
          ]}
          actionButton={
            <button
              onClick={() => {
                setEditingArticle(null);
                setIsModalOpen(true);
              }}
              className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {t.createArticle || "Add Article"}
            </button>
          }
        />

        <DataTable
          columns={columns}
          data={articles}
          loading={loading}
          emptyMessage={t.noArticles || "No articles found"}
          onEdit={(row) => {
            setEditingArticle(row);
            setIsModalOpen(true);
          }}
          onDelete={(row) => handleDelete(row._id)}
        />

        <div className="bg-[#fcfaf7]">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
          />
        </div>
      </div>

      {/* ── Manage Categories Card ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-[#8B6914]" />
          <h3 className="text-sm font-bold text-[#3a2a1a] uppercase tracking-widest">Manage Article Categories</h3>
        </div>

        {/* Add new category */}
        <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name..."
            maxLength={100}
            className="flex-1 border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
          />
          <button
            type="submit"
            disabled={categoryLoading || !newCategoryName.trim()}
            className="bg-[#8B6914] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#6a5010] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            {categoryLoading ? "Adding..." : "Add Category"}
          </button>
        </form>

        {/* Category list */}
        {categories.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No categories yet. Add one above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat._id || cat.name}
                className="flex items-center gap-1.5 bg-[#f5ede0] border border-[#e8ddd0] rounded-full px-3 py-1"
              >
                <span className="text-xs font-semibold text-[#3a2a1a]">{cat.name}</span>
                {cat._id ? (
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="text-[#a09080] hover:text-red-500 transition-colors ml-0.5"
                    title="Delete category"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-[10px] text-[#a09080] ml-1" title="Auto-detected from articles">
                    🔒
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ArticleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingArticle(null);
        }}
        initialData={editingArticle}
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
