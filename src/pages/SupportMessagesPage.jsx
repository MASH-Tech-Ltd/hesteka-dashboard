import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import { Edit2, Trash2, Reply } from "lucide-react";
import api from "../utils/api";
import ConfirmModal from "../components/common/ConfirmModal";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";

export default function SupportMessagesPage() {
  const { t } = useLang();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await api.get(`/support-messages?${queryString}`);
      if (res.data.status === "ok" || res.data.data) {
        // Backend returns: ApiResponse.sendSuccess(res, 200, "...", messages, meta);
        // Wait, ApiResponse.sendSuccess(res, statusCode, message, data, meta)
        // res.data.data will be `messages`, res.data.meta will be `meta`.
        setMessages(res.data.data || []);
        setMeta(res.data.meta || null);
      }
    } catch (err) {
      console.error("Failed to fetch support messages", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleOpenReplyModal = (msg) => {
    setCurrentMessage(msg);
    setReplyMessage(msg.adminReply || "");
    setIsModalOpen(true);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    setIsReplying(true);
    try {
      await api.post(`/support-messages/${currentMessage._id}/reply`, { replyMessage });
      toast.success(t.replySent || "Reply sent successfully");
      setIsModalOpen(false);
      fetchMessages();
    } catch (err) {
      console.error("Failed to send reply", err);
      toast.error(err?.response?.data?.message || t.replyFailed || "Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/support-messages/${messageToDelete._id}`);
      toast.success(t.messageDeleted || "Message deleted successfully");
      setMessageToDelete(null);
      fetchMessages();
    } catch (err) {
      console.error("Failed to delete message", err);
      toast.error(t.deleteFailed || "Failed to delete message");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { 
      header: t.date || "DATE", 
      cell: (r) => <span className="text-[11px] text-[#5a4a3a] font-medium whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</span>
    },
    { 
      header: t.sender || "SENDER", 
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-bold text-xs text-[#3a2a1a]">{r.name}</span>
          <span className="text-[10px] text-[#9a8a7a]">{r.email}</span>
        </div>
      ) 
    },
    { 
      header: t.subject || "SUBJECT", 
      cell: (r) => <span className="text-xs text-[#5a4a3a] font-medium">{r.subject}</span>
    },
    {
      header: t.status || "STATUS",
      cell: (r) => <StatusBadge status={r.status} />
    },
    { 
      header: t.actions || "ACTIONS", 
      align: "right",
      cell: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button 
            onClick={() => handleOpenReplyModal(r)} 
            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-bold uppercase transition-colors"
          >
            {r.status === "closed" ? (t.view || "View") : (t.reply || "Reply")}
          </button>
          <button onClick={() => setMessageToDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) 
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        <FilterBar 
          onSearch={(val) => setQueryParams(p => ({ ...p, search: val, page: 1 }))}
          onFilterChange={(name, val) => setQueryParams(p => ({ ...p, [name]: val, page: 1 }))}
          related={true}
          filters={[
            { 
              name: "status", 
              label: t.allStatuses || "All Statuses", 
              options: [
                { label: t.pending || "Pending", value: "pending" },
                { label: t.reviewed || "Reviewed", value: "reviewed" },
                { label: t.closed || "Closed", value: "closed" }
              ]
            }
          ]}
        />

        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={messages}
            loading={loading}
            emptyMessage={t.noMessagesFound || "No messages found"}
          />
        </div>

        <div className="bg-[#fcfaf7] border-t border-[#e8ddd0]">
          <Pagination 
            meta={meta} 
            onPageChange={(p) => setQueryParams(prev => ({ ...prev, page: p }))} 
          />
        </div>
      </div>

      {/* Reply Modal */}
      {isModalOpen && currentMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#f5f0e8] px-6 py-4 border-b border-[#e8ddd0] flex justify-between items-center">
              <h3 className="font-bold text-[#3a2a1a] text-sm uppercase tracking-wider">{t.supportMessageDetails || "Support Message"}</h3>
              <StatusBadge status={currentMessage.status} />
            </div>
            
            <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 bg-[#fcfaf7] p-4 rounded-xl border border-[#e8ddd0]">
                <div>
                  <p className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">{t.sender || "Sender"}</p>
                  <p className="text-sm font-bold text-[#3a2a1a]">{currentMessage.name}</p>
                  <p className="text-xs text-[#5a4a3a]">{currentMessage.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">{t.date || "Date"}</p>
                  <p className="text-sm text-[#3a2a1a]">{new Date(currentMessage.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">{t.subject || "Subject"}</p>
                <p className="text-sm font-bold text-[#3a2a1a]">{currentMessage.subject}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">{t.message || "Message"}</p>
                <div className="bg-[#fcfaf7] p-4 rounded-xl border border-[#e8ddd0] text-sm text-[#3a2a1a] whitespace-pre-wrap">
                  {currentMessage.message}
                </div>
              </div>

              {currentMessage.status === "closed" ? (
                <div>
                  <p className="text-[10px] font-bold text-[#9a8a7a] uppercase mb-1">{t.adminReply || "Admin Reply"}</p>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-900 whitespace-pre-wrap">
                    {currentMessage.adminReply || t.noReplyText || "No reply text available."}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                    >
                      {t.close || "Close"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReplySubmit} className="flex flex-col gap-3">
                  <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.writeReply || "Write a reply"}</label>
                  <textarea 
                    required
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={t.replyPlaceholder || "Type your reply here... (This will be sent via email)"}
                    className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-4 py-3 text-sm text-[#3a2a1a] outline-none focus:border-[#8B6914] h-32 resize-none w-full"
                  />
                  <div className="flex items-center justify-end gap-3 mt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#9a8a7a] hover:bg-gray-50 transition-colors"
                    >
                      {t.cancel || "Cancel"}
                    </button>
                    <button 
                      type="submit"
                      disabled={isReplying || !replyMessage.trim()}
                      className="bg-[#8B6914] text-white text-xs font-bold px-8 py-2.5 rounded-xl hover:bg-[#6a5010] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      {isReplying ? (t.sending || "Sending...") : (t.sendReply || "Send Reply")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={handleDelete}
        title={t.deleteMessage || "Delete Message"}
        message={t.deleteMessageConfirm || "Are you sure you want to delete this message? This action cannot be undone."}
        loading={isDeleting}
      />
    </div>
  );
}
