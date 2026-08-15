import React from "react";
import { X, ChevronLeft, Bookmark, Share2 } from "lucide-react";

export default function ArticlePreviewModal({ isOpen, onClose, formData, contentBlocks, imageFile, initialImage }) {
  if (!isOpen) return null;

  const imageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : initialImage?.secure_url;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[375px] h-[812px] max-h-[90vh] bg-[#f9f6e8] rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-black flex flex-col">
        
        {/* Mobile Status Bar area */}
        <div className="h-6 w-full bg-[#af492c] shrink-0"></div>

        {/* Header Section (Brown) */}
        <div className="bg-[#af492c] px-5 pt-2 pb-16 shrink-0 relative">
          <div className="flex items-center justify-between text-white mb-6">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronLeft size={20} />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center">
                <Bookmark size={16} />
              </div>
              <div className="w-8 h-8 rounded-full border border-white flex items-center justify-center">
                <Share2 size={16} />
              </div>
            </div>
          </div>

          <div className="mb-3">
            <span className="inline-block bg-[#e08963] text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {formData.tag || "TAG"}
            </span>
          </div>

          <h1 className="text-white text-xl font-bold leading-tight">
            {formData.title || "Article Title"}
          </h1>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto bg-[#f9f6e8] -mt-10 rounded-t-3xl px-5 py-6 custom-scrollbar relative z-10">
          
          {/* Author */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-[#af492c] flex items-center justify-center text-white font-bold">
              {formData.author?.charAt(0) || "T"}
            </div>
            <div>
              <p className="text-[#84361c] text-sm font-bold">{formData.author || "Team Hesteka"}</p>
              <p className="text-[#84361c]/70 text-[10px]">
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | {formData.readTime || 2} min read
              </p>
            </div>
          </div>

          {/* Image */}
          {imageUrl && (
            <div className="w-full h-48 rounded-xl overflow-hidden mb-6 shadow-sm">
              <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Blocks */}
          <div className="flex flex-col gap-5">
            {contentBlocks.length === 0 && (
              <p className="text-[#84361c]/60 text-sm italic">No content blocks added yet.</p>
            )}

            {contentBlocks.map((block, index) => {
              if (block.type === "paragraph") {
                return (
                  <div key={index}>
                    {block.title && <h3 className="text-[#84361c] font-bold text-sm mb-1">{block.title}</h3>}
                    <p className="text-[#84361c] text-sm leading-relaxed whitespace-pre-wrap">
                      {block.content}
                    </p>
                  </div>
                );
              }

              if (block.type === "numbered_point") {
                return (
                  <div key={index} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#af492c] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      {block.title && <h3 className="text-[#84361c] font-bold text-sm mb-1">{block.title}</h3>}
                      <p className="text-[#84361c] text-xs leading-relaxed whitespace-pre-wrap">
                        {block.content}
                      </p>
                    </div>
                  </div>
                );
              }

              if (block.type === "callout") {
                return (
                  <div key={index} className="bg-[#b3552c] rounded-xl p-4 my-2 text-white shadow-md">
                    {block.title && <h3 className="font-bold text-sm mb-2">{block.title}</h3>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">
                      {block.content}
                    </p>
                  </div>
                );
              }

              return null;
            })}
          </div>

          <div className="h-10"></div>
        </div>

        {/* Close Preview Button */}
        <button
          onClick={onClose}
          className="absolute top-4 -right-16 w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:bg-gray-200 transition shadow-xl"
          style={{ transform: "translateX(-20px)" }} // position it slightly outside or overlapping
        >
          <X size={24} />
        </button>
      </div>

      <button
          onClick={onClose}
          className="fixed top-6 right-6 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition backdrop-blur-md"
        >
          <X size={24} />
        </button>
    </div>
  );
}
