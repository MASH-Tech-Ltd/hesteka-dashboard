import React, { useState, useEffect } from "react";
import { X, ChevronLeft, Bookmark, Share2 } from "lucide-react";
import api from "../../utils/api";
import { useLang } from "../../context/LanguageContext";

export default function ArticlePreviewModal({ isOpen, onClose, formData, contentBlocks, imageFile, initialImage, articleId }) {
  const { t } = useLang();
  const [relatedArticles, setRelatedArticles] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRelated = async () => {
      try {
        if (articleId) {
          const res = await api.get(`/articles/get-single-article/${articleId}`);
          if (res.data?.data?.relatedArticles) {
            setRelatedArticles(res.data.data.relatedArticles);
          }
        } else if (formData.mainCategory) {
          const res = await api.get(`/articles/get-article-bycategory?category=${formData.mainCategory}&limit=2`);
          if (res.data?.data) {
            setRelatedArticles(res.data.data.slice(0, 2));
          }
        }
      } catch (error) {
        console.error("Failed to fetch related articles for preview:", error);
      }
    };
    fetchRelated();
  }, [isOpen, articleId, formData.mainCategory]);

  if (!isOpen) return null;

  const imageUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : initialImage?.secure_url;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[375px] h-[812px] max-h-[90vh] bg-[#f7efe5] rounded-[40px] shadow-2xl overflow-hidden border-[8px] border-black flex flex-col">
        
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
        <div className="flex-1 overflow-y-auto bg-[#f7efe5] -mt-10 rounded-t-3xl px-5 py-6 no-scrollbar relative z-10">
          
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

          {/* External Link */}
          {formData.externalLink && (
            <div className="mb-6">
              <a 
                href={formData.externalLink} 
                target="_blank" 
                rel="noreferrer"
                className="w-full block text-center py-2.5 rounded-xl bg-[#af492c] text-white font-bold text-xs hover:bg-[#9a3a1f] transition-colors shadow-sm"
              >
                Read from online
              </a>
            </div>
          )}

          {/* Image */}
          {imageUrl && (
            <div className="w-full h-48 rounded-[14px] overflow-hidden mb-6">
              <img src={imageUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Blocks */}
          <div className="flex flex-col gap-4">
            {contentBlocks.length === 0 && (
              <p className="text-[#84361c]/60 text-sm italic">No content blocks added yet.</p>
            )}

            {(() => {
              let numberCounter = 0;
              return contentBlocks.map((block, index) => {
                if (block.type === "paragraph") {
                  return (
                    <div key={index} className="mb-1">
                      {block.title && <h3 className="text-[#9c4c36] font-bold text-[13px] mb-1">{block.title}</h3>}
                      <p className="text-[#a54a2a] text-[12px] leading-[1.4] whitespace-pre-wrap">
                        {block.content}
                        {block.sourceUrl && (
                          <a 
                            href={block.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline ml-1 text-[#b54f35] underline font-medium hover:text-[#9a3a1f] transition-colors"
                          >
                            Article from online
                          </a>
                        )}
                      </p>
                    </div>
                  );
                }

                if (block.type === "numbered_point") {
                  numberCounter++;
                  return (
                    <div key={index} className="flex gap-3 mb-1">
                      <div className="w-5 h-5 rounded-full bg-[#af492c] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-[2px]">
                        {numberCounter}
                      </div>
                      <div className="flex-1">
                        {block.title && <h3 className="text-[#9c4c36] font-bold text-[12px] mb-0.5">{block.title}</h3>}
                        <p className="text-[#a54a2a] text-[11px] leading-[1.35] whitespace-pre-wrap">
                          {block.content}
                        </p>
                        {block.sourceUrl && (
                          <div className="mt-2">
                            <a 
                              href={block.sourceUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="w-full block text-center py-1.5 rounded-md bg-[#af492c] text-white font-bold text-[10px] hover:bg-[#9a3a1f] transition-colors shadow-sm"
                            >
                              {t.readFromOnline || "Read from online"}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                if (block.type === "callout") {
                  return (
                    <div key={index} className="bg-[#b54f35] rounded-xl p-4 my-2 text-white shadow-sm">
                      {block.title && <h3 className="font-bold text-[13px] mb-1.5">{block.title}</h3>}
                      <p className="text-[12px] leading-[1.4] whitespace-pre-wrap text-white/95">
                        {block.content} 🚨
                      </p>
                      {block.sourceUrl && (
                        <div className="mt-4">
                          <a 
                            href={block.sourceUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full block text-center py-2.5 rounded-xl bg-white text-[#af492c] font-bold text-xs hover:bg-gray-100 transition-colors shadow-sm"
                          >
                            {t.readFromOnline || "Read from online"}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              });
            })()}
          </div>
          
          {/* Related Articles Section */}
          {relatedArticles.length > 0 && (
            <div className="mt-10 border-t border-[#84361c]/20 pt-6 pb-20">
              <h3 className="text-[#9c4c36] font-bold text-lg mb-4">{t.alsoRead || "Also read"}</h3>
              <div className="flex justify-center gap-4 overflow-x-auto no-scrollbar pb-2">
                
                {relatedArticles.map((relArticle) => (
                  <div key={relArticle._id} className="w-[145px] shrink-0 bg-white rounded-[12px] shadow-sm border-[1.5px] border-[#e8cbb6] flex flex-col p-2">
                    <div className="w-full h-[80px] rounded-[8px] bg-[#b54f35] overflow-hidden mb-2.5 relative">
                      {relArticle.image?.secure_url ? (
                        <img src={relArticle.image.secure_url} alt="Related" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                      ) : (
                        <img src="https://picsum.photos/seed/rel/200/150" alt="Related Placeholder" className="w-full h-full object-cover mix-blend-overlay opacity-60" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#9c4c36]/40 to-transparent mix-blend-multiply"></div>
                    </div>
                    <div className="flex flex-col px-0.5 pb-0.5">
                      <span className="text-[9px] font-bold text-[#d4876b] uppercase tracking-wider mb-1">{relArticle.tag || t.tagLabel || "TAG"}</span>
                      <h4 className="text-[#a6472b] text-[12px] font-bold leading-[1.25] mb-2.5 line-clamp-3">{relArticle.title}</h4>
                      <p className="text-[#d4876b] text-[9px]">
                        {new Date(relArticle.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          )}

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
