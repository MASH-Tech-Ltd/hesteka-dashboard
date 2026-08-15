import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, ArrowUp, ArrowDown, Pencil, Smartphone } from "lucide-react";
import ArticlePreviewModal from "./ArticlePreviewModal";
import { useLang } from "../../context/LanguageContext";

export default function ArticleModal({ isOpen, onClose, initialData, onSubmit, loading }) {
  const { t } = useLang();
  const [formData, setFormData] = useState({
    title: "",
    mainCategory: "Advice",
    tag: "",
    author: "Team Hesteka",
    readTime: 2,
    isFeatured: false,
    isActive: true,
  });
  const [contentBlocks, setContentBlocks] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || "",
          mainCategory: initialData.mainCategory || "Advice",
          tag: initialData.tag || "",
          author: initialData.author || "Team Hesteka",
          readTime: initialData.readTime || 2,
          isFeatured: initialData.isFeatured || false,
          isActive: initialData.isActive ?? true,
        });
        setContentBlocks(initialData.contentBlocks || []);
      } else {
        setFormData({
          title: "",
          mainCategory: "Advice",
          tag: "",
          author: "Team Hesteka",
          readTime: 2,
          isFeatured: false,
          isActive: true,
        });
        setContentBlocks([]);
      }
      setImageFile(null);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddBlock = () => {
    setContentBlocks([
      ...contentBlocks,
      { type: "paragraph", title: "", content: "" },
    ]);
  };

  const handleBlockChange = (index, field, value) => {
    const newBlocks = [...contentBlocks];
    newBlocks[index][field] = value;
    setContentBlocks(newBlocks);
  };

  const handleRemoveBlock = (index) => {
    const newBlocks = [...contentBlocks];
    newBlocks.splice(index, 1);
    setContentBlocks(newBlocks);
  };

  const moveBlock = (index, direction) => {
    if (direction === "up" && index > 0) {
      const newBlocks = [...contentBlocks];
      const temp = newBlocks[index - 1];
      newBlocks[index - 1] = newBlocks[index];
      newBlocks[index] = temp;
      setContentBlocks(newBlocks);
    } else if (direction === "down" && index < contentBlocks.length - 1) {
      const newBlocks = [...contentBlocks];
      const temp = newBlocks[index + 1];
      newBlocks[index + 1] = newBlocks[index];
      newBlocks[index] = temp;
      setContentBlocks(newBlocks);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      contentBlocks: JSON.stringify(contentBlocks),
    };
    if (imageFile) {
      submitData.image = imageFile;
    }
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#f9f6f0] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#e8ddd0] bg-white flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3a2a1a]">
            {initialData ? t.editArticle || "Edit Article" : t.createArticle || "Create Article"}
          </h2>
          <button onClick={onClose} className="text-[#a09080] hover:text-black">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {/* VISUAL PREVIEW BLOCK */}
          <div
            className="relative w-full h-40 md:h-48 rounded-xl overflow-hidden mb-6 flex flex-col justify-end p-4 group"
            style={{
              background: imageFile
                ? `url(${URL.createObjectURL(imageFile)})`
                : initialData?.image?.secure_url
                ? `url(${initialData.image.secure_url})`
                : "linear-gradient(135deg, #3a2a1a 0%, #8B6914 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

            <div className="absolute top-4 right-4 z-10 cursor-pointer w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm hover:bg-white/40 transition">
              <label htmlFor="coverImageUpload" className="cursor-pointer w-full h-full flex items-center justify-center">
                <Pencil size={14} />
              </label>
            </div>

            <div className="relative z-10 text-white">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1 opacity-90">{t.visualPreview || "Visual Preview"}</p>
              <h2 className="text-2xl font-bold">{formData.title || t.newRecord || "New Record"}</h2>
            </div>
          </div>

          <form id="articleForm" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.titleLabel || "Title"} *</label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter title..."
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.mainCategory || "Main Category"} *</label>
                <select
                  name="mainCategory"
                  required
                  value={formData.mainCategory}
                  onChange={handleInputChange}
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                >
                  <option value="Advice">Advice</option>
                  <option value="News">News</option>
                  <option value="Health">Health</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.tagLabel || "Tag"} *</label>
                <input
                  type="text"
                  name="tag"
                  required
                  value={formData.tag}
                  onChange={handleInputChange}
                  placeholder="Enter tag..."
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.authorLabel || "Author"} *</label>
                <input
                  type="text"
                  name="author"
                  required
                  value={formData.author}
                  onChange={handleInputChange}
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.readTime || "Read Time (minutes)"} *</label>
                <input
                  type="number"
                  name="readTime"
                  required
                  min="1"
                  value={formData.readTime}
                  onChange={handleInputChange}
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">{t.coverImage || "Cover Image"}</label>
                <input
                  id="coverImageUpload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="w-full border border-[#e8ddd0] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-[#8B6914]"
                />
                {initialData?.image && !imageFile && (
                  <p className="text-xs text-gray-500 mt-1">Current image uploaded.</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#3a2a1a] cursor-pointer">
                <input
                  type="checkbox"
                  name="isFeatured"
                  checked={formData.isFeatured}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-[#e8ddd0] text-[#8B6914] focus:ring-[#8B6914]"
                />
                {t.isFeatured || "Is Featured?"}
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#3a2a1a] cursor-pointer">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-[#e8ddd0] text-[#8B6914] focus:ring-[#8B6914]"
                />
                {t.isActive || "Is Active?"}
              </label>
            </div>

            <hr className="border-[#e8ddd0]" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-[#8B6914] uppercase tracking-widest">{t.contentBuilder || "Content Blocks"}</label>
                <button
                  type="button"
                  onClick={handleAddBlock}
                  className="text-xs font-bold bg-[#8B6914] text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-[#735711] transition-colors"
                >
                  <Plus size={14} /> {t.newBlock || "Add Block"}
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {contentBlocks.map((block, index) => (
                  <div key={index} className="border border-[#e8ddd0] bg-white rounded-lg p-4 flex gap-4">
                    <div className="flex flex-col gap-2 justify-center border-r border-[#e8ddd0] pr-3">
                      <button type="button" onClick={() => moveBlock(index, "up")} className="text-gray-400 hover:text-black disabled:opacity-30" disabled={index === 0}>
                        <ArrowUp size={16} />
                      </button>
                      <button type="button" onClick={() => moveBlock(index, "down")} className="text-gray-400 hover:text-black disabled:opacity-30" disabled={index === contentBlocks.length - 1}>
                        <ArrowDown size={16} />
                      </button>
                      <button type="button" onClick={() => handleRemoveBlock(index)} className="text-red-400 hover:text-red-600 mt-2">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Block Type</label>
                          <select
                            value={block.type}
                            onChange={(e) => handleBlockChange(index, "type", e.target.value)}
                            className="w-full border border-[#e8ddd0] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#8B6914]"
                          >
                            <option value="paragraph">{t.addParagraph || "Standard Paragraph"}</option>
                            <option value="numbered_point">{t.addNumberedPoint || "Numbered Point"}</option>
                            <option value="callout">{t.addCallout || "Highlighted Callout"}</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Title (Optional)</label>
                          <input
                            type="text"
                            value={block.title || ""}
                            onChange={(e) => handleBlockChange(index, "title", e.target.value)}
                            placeholder={block.type === "numbered_point" ? "e.g., 1 Moisturize it constantly" : "Optional title..."}
                            className="w-full border border-[#e8ddd0] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#8B6914]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Content *</label>
                        <textarea
                          required
                          value={block.content}
                          onChange={(e) => handleBlockChange(index, "content", e.target.value)}
                          rows={3}
                          placeholder="Enter paragraph text..."
                          className="w-full border border-[#e8ddd0] rounded px-2 py-1 text-sm focus:outline-none focus:border-[#8B6914]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {contentBlocks.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-[#e8ddd0] rounded-lg">
                    No content blocks added yet. Click "Add Block" to start building your article.
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-[#e8ddd0] bg-white flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg border border-[#e8ddd0] text-[#3a2a1a] font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            {t.discardBtn || "Discard"}
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="w-full py-2.5 rounded-lg border border-[#8B6914] text-[#8B6914] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#8B6914]/10 transition-colors"
          >
            <Smartphone size={16} /> {t.preview || "Preview"}
          </button>
          <button
            type="submit"
            form="articleForm"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#8B6914] text-white font-bold text-sm hover:bg-[#735711] transition-colors disabled:opacity-50"
          >
            {loading ? (t.saving || "Saving...") : (t.saveChanges || "Save changes")}
          </button>
        </div>
      </div>

      <ArticlePreviewModal 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        formData={formData} 
        contentBlocks={contentBlocks} 
        imageFile={imageFile} 
        initialImage={initialData?.image} 
      />
    </div>
  );
}
