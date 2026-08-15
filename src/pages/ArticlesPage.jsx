import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import ArticleModal from "../components/articles/ArticleModal";
import DataTable from "../components/common/DataTable";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import { FileText, Plus } from "lucide-react";

export default function ArticlesPage() {
  const { t } = useLang();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/articles");
      if (res.data.status === "ok" || res.data.success) {
        setArticles(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch articles", err);
      toast.error("Failed to fetch articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleCreateOrUpdate = async (formData) => {
    setModalLoading(true);
    try {
      const isUpdate = !!editingArticle;
      const url = isUpdate ? `/articles/${editingArticle._id}` : "/articles";
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
        isUpdate ? t.articleUpdatedSuccess || "Article updated successfully" : t.articleCreatedSuccess || "Article created successfully"
      );
      setIsModalOpen(false);
      fetchArticles();
    } catch (err) {
      console.error(err);
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
      title: t.deleteArticle || "Delete Article",
      message: t.confirmDeleteArticle || "Are you sure you want to delete this article? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await api.delete(`/articles/${id}`);
          toast.success(t.articleDeletedSuccess || "Article deleted successfully");
          fetchArticles();
        } catch (err) {
          toast.error(t.failedDeleteArticle || "Failed to delete article");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const columns = [
    {
      header: t.titleLabel || "Title",
      accessor: "title",
    },
    { header: t.categoryLabel || "Category", accessor: "mainCategory" },
    { header: t.tagLabel || "Tag", accessor: "tag" },
    { header: t.authorLabel || "Author", accessor: "author" },
    {
      header: t.featured || "Featured",
      cell: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${row.isFeatured ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
          {row.isFeatured ? t.yes || "Yes" : t.no || "No"}
        </span>
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
      )
    }
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-[#e8ddd0] bg-white flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8B6914]/10 flex items-center justify-center text-[#8B6914]">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#3a2a1a]">{t.articles || "Articles & News"}</h1>
              <p className="text-xs font-bold text-[#8B6914] tracking-widest uppercase">
                {t.manageArticles || "Manage News & Advice content"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingArticle(null);
                setIsModalOpen(true);
              }}
              className="bg-[#2A3B31] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1f2c25] transition-colors shadow-sm text-sm font-bold uppercase tracking-wide"
            >
              <Plus size={16} />
              {t.createArticle || "Add Article"}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={articles}
          loading={loading}
          onEdit={(row) => {
            setEditingArticle(row);
            setIsModalOpen(true);
          }}
          onDelete={(row) => handleDelete(row._id)}
        />
      </div>

      <ArticleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
