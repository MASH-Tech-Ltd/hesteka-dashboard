import React, { useState, useRef } from "react";
import { X, UploadCloud, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { useLang } from "../../context/LanguageContext";

const BulkUploadModal = ({ isOpen, onClose, onUpload, loading, results }) => {
  const { t } = useLang();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const resetAndClose = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex justify-between items-center bg-white">
          <h2 className="text-lg font-black text-[#3a2a1a] tracking-tight">
            {t.bulkUpload || "Bulk Upload"}
          </h2>
          <button
            onClick={resetAndClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-all p-1.5 hover:bg-[#f5f0e8] rounded-full"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {results ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mx-auto mb-2">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-center text-xl font-black text-[#3a2a1a]">Upload Complete!</h3>
              
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Success</span>
                  <span className="text-2xl font-black text-green-700">{results.success || 0}</span>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Failed</span>
                  <span className="text-2xl font-black text-red-700">{results.failed || 0}</span>
                </div>
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Skipped</span>
                  <span className="text-2xl font-black text-orange-700">{results.pending || 0}</span>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 max-h-32 overflow-y-auto custom-scrollbar">
                  <h4 className="text-xs font-bold text-red-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Error Details
                  </h4>
                  <ul className="text-[10px] text-red-600 list-disc pl-4 flex flex-col gap-1">
                    {results.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={resetAndClose}
                className="w-full mt-2 py-3 rounded-xl bg-[#8B6914] text-white text-xs font-black hover:bg-[#6a5010] transition-all shadow-lg active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all ${
                  dragActive ? "border-[#8B6914] bg-[#8B6914]/5" : "border-[#e8ddd0] bg-[#fcfaf7]"
                } ${selectedFile ? "border-green-400 bg-green-50/30" : "hover:border-[#8B6914] hover:bg-[#fcfaf7]"}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleChange}
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#3a2a1a]">{selectedFile.name}</p>
                      <p className="text-xs text-[#9a8a7a]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="text-[10px] text-red-500 font-bold hover:underline mt-1"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div 
                    className="flex flex-col items-center gap-3 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 bg-[#f5f0e8] text-[#8B6914] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#3a2a1a]">Click to upload or drag and drop</p>
                      <p className="text-xs text-[#9a8a7a] mt-1">.XLSX, .XLS, or .CSV allowed</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={resetAndClose}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl border border-[#e8ddd0] text-[#3a2a1a] text-xs font-black hover:bg-[#fcfaf7] transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedFile || loading}
                  className="flex-1 px-6 py-3 rounded-xl bg-[#8B6914] text-white text-xs font-black hover:bg-[#6a5010] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#8B6914]/20 active:scale-[0.98]"
                >
                  {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {loading ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
