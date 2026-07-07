import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import DataTable from "../components/common/DataTable";
import FilterBar from "../components/common/FilterBar";
import {
  MessageSquare,
  Trash2,
  X,
  Image as ImageIcon,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import api from "../utils/api";
import Pagination from "../components/common/Pagination";
import CustomVideoPlayer from "../components/common/CustomVideoPlayer";

const MediaSliderModal = ({ isOpen, media, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && media.length > 1) {
        setCurrentIndex((p) => (p === media.length - 1 ? 0 : p + 1));
      }
      if (e.key === "ArrowLeft" && media.length > 1) {
        setCurrentIndex((p) => (p === 0 ? media.length - 1 : p - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, media?.length, onClose]);

  if (!isOpen || !media || media.length === 0) return null;

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const currentMedia = media[currentIndex];
  const displayUrl = currentMedia?.url;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-[10000]"
      >
        <X className="w-8 h-8" />
      </button>

      {media.length > 1 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors z-[10000]"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div
        className="relative max-w-5xl max-h-[90vh] flex items-center justify-center p-4 w-full h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMedia?.type === "video" ? (
          <CustomVideoPlayer 
            src={displayUrl} 
            key={displayUrl}
            className="w-full max-w-5xl h-[85vh] animate-in fade-in duration-200 shadow-2xl" 
          />
        ) : (
          <img
            src={displayUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded select-none animate-in fade-in duration-200"
            key={displayUrl}
          />
        )}

        {media.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-medium text-sm bg-black/70 px-4 py-1.5 rounded-full tracking-wider z-[10000]">
            {currentIndex + 1} / {media.length}
          </div>
        )}
      </div>

      {media.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-3 bg-black/50 hover:bg-black/80 rounded-full transition-colors z-[10000]"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  );
};

export default function PostsPage() {
  const { t } = useLang();
  const [posts, setPosts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Comments Modal State
  const [commentsModal, setCommentsModal] = useState({ isOpen: false, post: null });
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deleteCommentModal, setDeleteCommentModal] = useState({ isOpen: false, id: null });
  const [deleteCommentLoading, setDeleteCommentLoading] = useState(false);

  const [mediaModal, setMediaModal] = useState({
    isOpen: false,
    media: [],
    initialIndex: 0,
  });

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
  });

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const queryObj = { ...queryParams, hideComments: true };
      const qs = new URLSearchParams(queryObj).toString();
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

  const handleViewComments = async (post) => {
    setCommentsModal({ isOpen: true, post });
    setCommentsLoading(true);
    try {
      const res = await api.get(`/community/chat/${post._id}/comments?limit=1000`);
      if (res.data.status === "ok") {
        setComments(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      toast.error("Failed to fetch comments");
    } finally {
      setCommentsLoading(false);
    }
  };

  const executeDeleteComment = async () => {
    setDeleteCommentLoading(true);
    try {
      const res = await api.delete(`/community/chat/admin/${deleteCommentModal.id}`);
      if (res.data.status === "ok" || res.status === 200) {
        toast.success(t.commentDeletedSuccess || "Comment deleted successfully");
        setDeleteCommentModal({ isOpen: false, id: null });
        handleViewComments(commentsModal.post);
        fetchPosts();
      }
    } catch (err) {
      console.error("Failed to delete comment:", err);
      toast.error(err.response?.data?.message || "Failed to delete comment");
    } finally {
      setDeleteCommentLoading(false);
    }
  };

  const columns = [
    {
      header: t.author || "Author",
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
            <span className="text-xs text-gray-500">
              {r.user?.email || "No email"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t.content || "Content",
      cell: (r) => (
        <div className="flex flex-col gap-3 max-w-sm py-2">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {r.content}
          </p>
        </div>
      ),
    },
    {
      header: t.media || "Media",
      cell: (r) => {
        if (!r.media || r.media.length === 0)
          return (
            <span className="text-xs text-gray-400">{t.none || "None"}</span>
          );
        return (
          <div className="flex flex-wrap gap-2 py-2">
            {r.media.map((m, idx) => {
              const optimizedUrl = m.url?.includes("cloudinary.com")
                ? m.url.replace("/upload/", "/upload/w_500,h_300,c_fill/")
                : m.url;

              const mediaItems = r.media.filter(
                (mItem) => mItem.type === "image" || mItem.type === "video"
              );
              const mediaIndex = mediaItems.findIndex((item) => item.url === m.url);

              return m.type === "image" ? (
                <img
                  key={idx}
                  src={optimizedUrl}
                  alt="post media"
                  onClick={() =>
                    setMediaModal({
                      isOpen: true,
                      media: mediaItems,
                      initialIndex: Math.max(0, mediaIndex),
                    })
                  }
                  className="w-[150px] h-[100px] object-cover rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : m.type === "video" ? (
                <div 
                  key={idx}
                  onClick={() =>
                    setMediaModal({
                      isOpen: true,
                      media: mediaItems,
                      initialIndex: Math.max(0, mediaIndex),
                    })
                  }
                  className="relative w-[150px] h-[100px] rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity bg-black flex items-center justify-center overflow-hidden"
                >
                  <video
                    src={m.url}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                  />
                  <PlayCircle className="w-10 h-10 text-white opacity-80 z-10 drop-shadow-md" />
                </div>
              ) : (
                <span
                  key={idx}
                  className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold bg-blue-50 w-fit px-1.5 py-0.5 rounded"
                >
                  <ImageIcon className="w-3 h-3" /> {m.type}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      header: t.likes || "Likes",
      align: "center",
      cell: (r) => (
        <div className="flex justify-center">
          <span className="bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-100">
            {r.likes?.length || r.likesCount || 0}
          </span>
        </div>
      ),
    },
    {
      header: t.location || "Location",
      cell: (r) => {
        const address = r.location?.address;
        const coords = r.location?.coordinates;

        if (address) {
          return (
            <span
              className="text-xs text-gray-500 truncate block max-w-[150px]"
              title={address}
            >
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
      header: t.date || "Date",
      cell: (r) => {
        const date = new Date(r.createdAt);
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-700">
              {date.toLocaleDateString()}
            </span>
            <span className="text-xs text-gray-500">
              {date.toLocaleTimeString()}
            </span>
          </div>
        );
      },
    },
    {
      header: t.commentsLabel || "Comments",
      cell: (r) => (
        <button
          onClick={() => handleViewComments(r)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium whitespace-nowrap"
        >
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {t.viewComments || "View Comments"}
          </div>
          <span className="bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[20px] text-center">
            {r.replyCount ||
              r.repliesCount ||
              r.commentsCount ||
              r.replies?.length ||
              0}
          </span>
        </button>
      ),
    },
    {
      header: t.actions || "ACTIONS",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setConfirmModal({ isOpen: true, id: r._id })}
            className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
            title={t.deleteBtn || "Delete"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
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
            emptyMessage={t.noPostsFound || "No posts found."}
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
        title={t.deletePost || "Delete Post"}
        message={
          t.confirmDeletePost ||
          "Are you sure you want to delete this post? This action cannot be undone."
        }
        onConfirm={handleDelete}
        onClose={() => setConfirmModal({ isOpen: false, id: null })}
        loading={confirmLoading}
      />

      {/* Comments Modal */}
      {commentsModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                {t.commentsForPost || "Comments for Post"}
              </h2>
              <button
                onClick={() => setCommentsModal({ isOpen: false, post: null })}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
              {commentsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : comments.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {comments.map((comment) => (
                    <div
                      key={comment._id}
                      className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden shrink-0">
                        {comment.user?.profileImage?.secure_url ? (
                          <img
                            src={comment.user.profileImage.secure_url}
                            alt="author"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          comment.user?.firstName?.charAt(0)?.toUpperCase() ||
                          "U"
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-800">
                            {comment.user?.firstName} {comment.user?.lastName}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                          <div className="ml-auto flex items-center">
                            <button
                                onClick={() => setDeleteCommentModal({ isOpen: true, id: comment._id })}
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                                title={t.deleteBtn || "Delete"}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                        {comment.media && comment.media.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {comment.media.map((m, idx) => {
                              const optimizedUrl = m.url?.includes(
                                "cloudinary.com",
                              )
                                ? m.url.replace(
                                    "/upload/",
                                    "/upload/w_200,h_200,c_fill/",
                                  )
                                : m.url;

                              const mediaItems = comment.media.filter(
                                (mItem) => mItem.type === "image" || mItem.type === "video"
                              );
                              const mediaIndex = mediaItems.findIndex(
                                (item) => item.url === m.url,
                              );

                              return m.type === "image" ? (
                                <img
                                  key={idx}
                                  src={optimizedUrl}
                                  alt="media"
                                  onClick={() =>
                                    setMediaModal({
                                      isOpen: true,
                                      media: mediaItems,
                                      initialIndex: Math.max(0, mediaIndex),
                                    })
                                  }
                                  className="w-20 h-20 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                                />
                              ) : m.type === "video" ? (
                                <div 
                                  key={idx}
                                  onClick={() =>
                                    setMediaModal({
                                      isOpen: true,
                                      media: mediaItems,
                                      initialIndex: Math.max(0, mediaIndex),
                                    })
                                  }
                                  className="relative w-20 h-20 rounded-md border cursor-pointer hover:opacity-90 transition-opacity bg-black flex items-center justify-center overflow-hidden"
                                >
                                  <video
                                    src={m.url}
                                    className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
                                  />
                                  <PlayCircle className="w-8 h-8 text-white opacity-80 z-10 drop-shadow-md" />
                                </div>
                              ) : (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600"
                                >
                                  {m.type}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    {t.noCommentsFound || "No comments found."}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {t.noRepliesYet || "This post has no replies yet."}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-white flex justify-end">
              <button
                onClick={() => setCommentsModal({ isOpen: false, post: null })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
              >
                {t.closeBtn || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Slider Modal */}
      <MediaSliderModal
        isOpen={mediaModal.isOpen}
        media={mediaModal.media}
        initialIndex={mediaModal.initialIndex}
        onClose={() =>
          setMediaModal({ isOpen: false, media: [], initialIndex: 0 })
        }
      />

      {/* Delete Comment Confirmation */}
      <ConfirmModal
        isOpen={deleteCommentModal.isOpen}
        title={t.deleteCommentBtn || "Delete Comment"}
        message={t.confirmDeleteComment || "Are you sure you want to delete this comment?"}
        onConfirm={executeDeleteComment}
        onClose={() => setDeleteCommentModal({ isOpen: false, id: null })}
        loading={deleteCommentLoading}
      />
    </div>
  );
}
