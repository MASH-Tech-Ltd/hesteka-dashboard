import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import { Plus, Edit2, Trash2, X, Eye } from "lucide-react";
import api from "../utils/api";
import ConfirmModal from "../components/common/ConfirmModal";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import { toast } from "react-toastify";

export default function FAQPage() {
  const { t } = useLang();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    category: "ALL",
    search: "",
    sortBy: "createdAt",
    sortOrder: "desc"
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [faqToView, setFaqToView] = useState(null);
  
  const [formData, setFormData] = useState({
    category: "GENERAL",
    order: 0,
    isActive: true,
    contentsArray: []
  });

  const categories = [
    "GENERAL",
    "REPORT",
    "LOCAL MISSIONS",
    "MY ACCOUNT",
    "MESSAGING",
    "DONATIONS AND HELP",
    "SECURITY"
  ];

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case "GENERAL": return t.faqCatGENERAL || cat;
      case "REPORT": return t.faqCatREPORT || cat;
      case "LOCAL MISSIONS": return t.faqCatLOCAL_MISSIONS || cat;
      case "MY ACCOUNT": return t.faqCatMY_ACCOUNT || cat;
      case "MESSAGING": return t.faqCatMESSAGING || cat;
      case "DONATIONS AND HELP": return t.faqCatDONATIONS_AND_HELP || cat;
      case "SECURITY": return t.faqCatSECURITY || cat;
      default: return cat;
    }
  };

  const fetchFaqs = useCallback(async () => {
    setLoading(true);
    try {
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await api.get(`/faq?${queryString}`);
      if (res.data.status === "ok") {
        setFaqs(res.data.data.data);
        setMeta({
          total: res.data.data.total,
          page: res.data.data.page,
          limit: res.data.data.limit,
          totalPages: Math.ceil(res.data.data.total / res.data.data.limit)
        });
      }
    } catch (err) {
      console.error("Failed to fetch FAQs", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleOpenModal = (faq = null) => {
    if (faq) {
      setCurrentFaq(faq);
      setFormData({
        category: faq.category,
        order: faq.order || 0,
        isActive: faq.isActive !== false,
        contentsArray: faq.contentsArray.map(c => ({
          question: {
            english: { question: c.question?.english?.question || "", answer: c.question?.english?.answer || "" },
            french: { question: c.question?.french?.question || "", answer: c.question?.french?.answer || "" }
          },
          order: c.order || 0
        }))
      });
    } else {
      setCurrentFaq(null);
      setFormData({
        category: "GENERAL",
        order: faqs.length,
        isActive: true,
        contentsArray: [
          {
            question: {
              english: { question: "", answer: "" },
              french: { question: "", answer: "" }
            },
            order: 0
          }
        ]
      });
    }
    setIsModalOpen(true);
  };

  const handleAddContent = () => {
    setFormData(prev => ({
      ...prev,
      contentsArray: [
        ...prev.contentsArray,
        {
          question: {
            english: { question: "", answer: "" },
            french: { question: "", answer: "" }
          },
          order: prev.contentsArray.length
        }
      ]
    }));
  };

  const handleRemoveContent = (index) => {
    setFormData(prev => ({
      ...prev,
      contentsArray: prev.contentsArray.filter((_, i) => i !== index)
    }));
  };

  const handleContentChange = (index, lang, field, value) => {
    setFormData(prev => {
      const newContents = [...prev.contentsArray];
      newContents[index].question[lang][field] = value;
      return { ...prev, contentsArray: newContents };
    });
  };

  const handleContentOrderChange = (index, value) => {
    setFormData(prev => {
      const newContents = [...prev.contentsArray];
      newContents[index].order = Number(value);
      return { ...prev, contentsArray: newContents };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentFaq) {
        await api.patch(`/faq/${currentFaq._id}`, formData);
        toast.success("FAQ updated successfully");
      } else {
        await api.post("/faq", formData);
        toast.success("New FAQ added successfully");
      }
      setIsModalOpen(false);
      fetchFaqs();
    } catch (err) {
      console.error("Failed to save FAQ", err);
      toast.error("Failed to save FAQ");
    }
  };

  const handleDelete = async () => {
    if (!faqToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/faq/${faqToDelete._id}`);
      toast.success("FAQ deleted successfully");
      setFaqToDelete(null);
      fetchFaqs();
    } catch (err) {
      console.error("Failed to delete FAQ", err);
      toast.error("Failed to delete FAQ");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { 
      header: t.categoryLabel || "CATEGORY", 
      cell: (r) => (
        <span className="px-2 py-1 rounded-full bg-[#f5f0e8] text-[#8B6914] text-[10px] font-bold uppercase">
          {getCategoryLabel(r.category)}
        </span>
      ) 
    },
    { 
      header: t.statusLabel || "STATUS", 
      cell: (r) => (
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${r.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {r.isActive !== false ? (t.active || "Active") : (t.inactive || "Inactive")}
        </span>
      ) 
    },
    { 
      header: t.questionsCount || "QUESTIONS", 
      cell: (r) => <div className="font-bold text-xs text-[#3a2a1a]">{r.contentsArray?.length || 0} {t.questionsText || "Questions"}</div> 
    },
    { 
      header: t.orderLabel || "ORDER", 
      cell: (r) => <div className="font-bold text-xs text-[#9a8a7a]">{r.order}</div> 
    },
    { 
      header: t.actionsLabel || "ACTIONS", 
      align: "right",
      cell: (r) => (
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => { setFaqToView(r); setIsViewModalOpen(true); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t.viewFaq || "View FAQ"}>
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleOpenModal(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setFaqToDelete(r)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
          onSortChange={(sortBy, sort) => setQueryParams(p => ({ ...p, sortBy, sortOrder: sort === 'descending' ? 'desc' : 'asc', page: 1 }))}
          related={true}
          filters={[
            { 
              name: "category", 
              label: t.allCategories || "All categories", 
              options: categories.map(c => ({ label: getCategoryLabel(c), value: c }))
            }
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "createdAt:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "createdAt:ascending" },
            { label: t.orderLabel || "Order", value: "order:ascending" }
          ]}
          actionButton={
            <button 
              onClick={() => handleOpenModal()}
              className="bg-[#8B6914] text-white text-[11px] font-bold p-2.5 rounded-xl hover:bg-[#6a5010] transition-all flex items-center justify-center shadow-md active:scale-95"
              title={t.addFaq}
            >
              <Plus className="w-4 h-4" />
            </button>
          }
        />

        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={faqs}
            loading={loading}
            emptyMessage={t.noFaqsFound}
          />
        </div>

        <div className="bg-[#fcfaf7] border-t border-[#e8ddd0]">
          <Pagination 
            meta={meta} 
            onPageChange={(p) => setQueryParams(prev => ({ ...prev, page: p }))} 
          />
        </div>
      </div>

      {/* FAQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="bg-[#f5f0e8] px-6 py-4 border-b border-[#e8ddd0] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[#3a2a1a] text-sm uppercase tracking-wider">{currentFaq ? t.editFaqGroup || "Edit FAQ Group" : t.addFaqGroup || "Add FAQ Group"}</h3>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <form id="faq-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.categoryLabel || "Category"}</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                      required
                    >
                      {categories.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.groupOrder || "Group Order"}</label>
                    <input 
                      type="number"
                      required
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: Number(e.target.value)})}
                      className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.statusLabel || "Status"}</label>
                    <select 
                      value={formData.isActive ? "true" : "false"}
                      onChange={(e) => setFormData({...formData, isActive: e.target.value === "true"})}
                      className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                      required
                    >
                      <option value="true">{t.active || "Active"}</option>
                      <option value="false">{t.inactive || "Inactive"}</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#e8ddd0] pb-2">
                    <h4 className="text-sm font-bold text-[#3a2a1a] uppercase tracking-wide">{t.questionsAndAnswers || "Questions & Answers"}</h4>
                    <button 
                      type="button"
                      onClick={handleAddContent}
                      className="text-[#8B6914] bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {t.addQa || "+ Add Q&A"}
                    </button>
                  </div>

                  {formData.contentsArray.map((content, idx) => (
                    <div key={idx} className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl p-4 relative flex flex-col gap-4">
                      {formData.contentsArray.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveContent(idx)}
                          className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      
                      <div className="flex flex-col gap-1.5 w-1/3">
                        <label className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.qaOrder || "Q&A Order"}</label>
                        <input 
                          type="number"
                          required
                          value={content.order}
                          onChange={(e) => handleContentOrderChange(idx, e.target.value)}
                          className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-1.5 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        {/* English Block */}
                        <div className="flex flex-col gap-3">
                          <h5 className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-max uppercase">{t.englishLang || "English"}</h5>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.questionLabel || "Question"}</label>
                            <input 
                              type="text"
                              required
                              value={content.question.english.question}
                              onChange={(e) => handleContentChange(idx, 'english', 'question', e.target.value)}
                              placeholder={t.englishQuestionPlaceholder || "English question..."}
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.answerLabel || "Answer"}</label>
                            <textarea 
                              required
                              value={content.question.english.answer}
                              onChange={(e) => handleContentChange(idx, 'english', 'answer', e.target.value)}
                              placeholder={t.englishAnswerPlaceholder || "English answer..."}
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] h-20 resize-none"
                            />
                          </div>
                        </div>

                        {/* French Block */}
                        <div className="flex flex-col gap-3">
                          <h5 className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded w-max uppercase">{t.frenchLang || "Français"}</h5>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.questionLabel || "Question"}</label>
                            <input 
                              type="text"
                              required
                              value={content.question.french.question}
                              onChange={(e) => handleContentChange(idx, 'french', 'question', e.target.value)}
                              placeholder={t.frenchQuestionPlaceholder || "Question en français..."}
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914]"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.answerLabel || "Answer"}</label>
                            <textarea 
                              required
                              value={content.question.french.answer}
                              onChange={(e) => handleContentChange(idx, 'french', 'answer', e.target.value)}
                              placeholder={t.frenchAnswerPlaceholder || "Réponse en français..."}
                              className="bg-white border border-[#e8ddd0] rounded-lg px-3 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] h-20 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {formData.contentsArray.length === 0 && (
                     <div className="text-center text-xs text-red-500 py-4 font-bold">{t.atLeastOneQa || "Please add at least one Q&A."}</div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="bg-[#f5f0e8] px-6 py-4 border-t border-[#e8ddd0] flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#9a8a7a] hover:bg-gray-200 transition-colors"
              >
                {t.cancel || "Cancel"}
              </button>
              <button 
                type="submit"
                form="faq-form"
                disabled={formData.contentsArray.length === 0}
                className="bg-[#8B6914] text-white text-xs font-bold px-8 py-2.5 rounded-xl hover:bg-[#6a5010] transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {t.saveChanges || "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View FAQ Modal */}
      {isViewModalOpen && faqToView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsViewModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="bg-[#f5f0e8] px-6 py-4 border-b border-[#e8ddd0] flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[#3a2a1a] text-sm uppercase tracking-wider">{t.viewFaqGroup || "View FAQ Group"}</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.categoryLabel || "Category"}</span>
                  <span className="text-sm font-bold text-[#3a2a1a]">{getCategoryLabel(faqToView.category)}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.groupOrder || "Group Order"}</span>
                  <span className="text-sm font-bold text-[#3a2a1a]">{faqToView.order}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.statusLabel || "Status"}</span>
                  <span className={`text-sm font-bold ${faqToView.isActive !== false ? 'text-green-600' : 'text-red-600'}`}>{faqToView.isActive !== false ? (t.active || "Active") : (t.inactive || "Inactive")}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-bold text-[#3a2a1a] uppercase tracking-wide border-b border-[#e8ddd0] pb-2">{t.questionsAndAnswers || "Questions & Answers"}</h4>
                
                {faqToView.contentsArray?.map((content, idx) => (
                  <div key={idx} className="bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wide">{t.qaOrder || "Q&A Order"} : {content.order || 0}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-3">
                        <h5 className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-max uppercase">{t.englishLang || "English"}</h5>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.questionLabel || "Question"}</span>
                          <p className="text-sm text-[#3a2a1a] bg-white p-3 rounded-lg border border-[#e8ddd0]">{content.question?.english?.question || "-"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.answerLabel || "Answer"}</span>
                          <p className="text-sm text-[#3a2a1a] whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#e8ddd0]">{content.question?.english?.answer || "-"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <h5 className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded w-max uppercase">{t.frenchLang || "Français"}</h5>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.questionLabel || "Question"}</span>
                          <p className="text-sm text-[#3a2a1a] bg-white p-3 rounded-lg border border-[#e8ddd0]">{content.question?.french?.question || "-"}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-[#9a8a7a] uppercase">{t.answerLabel || "Answer"}</span>
                          <p className="text-sm text-[#3a2a1a] whitespace-pre-wrap bg-white p-3 rounded-lg border border-[#e8ddd0]">{content.question?.french?.answer || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#f5f0e8] px-6 py-4 border-t border-[#e8ddd0] flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#9a8a7a] hover:bg-gray-200 transition-colors"
              >
                {t.close || "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!faqToDelete}
        onClose={() => setFaqToDelete(null)}
        onConfirm={handleDelete}
        title={t.deleteBtn || "Delete"}
        message={t.deleteFaqGroupMessage || "Are you sure you want to delete this FAQ group? This action cannot be undone."}
        loading={isDeleting}
      />
    </div>
  );
}
