import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose, loading, hideFooter, confirmText, hideCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center bg-[#fcfaf7]">
          <h2 className="text-lg font-bold text-[#3a2a1a] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" /> {title || "Confirmation"}
          </h2>
          <button 
            onClick={onClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-[#5a4a3a]">{message || "Are you sure you want to perform this action?"}</p>
        </div>

        {!hideFooter && (
          <div className="p-4 bg-[#fcfaf7] border-t border-[#f0e8d8] flex gap-3">
            {!hideCancel && (
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg border border-[#e8ddd0] text-[#3a2a1a] text-sm font-bold hover:bg-white transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {confirmText || "Confirm"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmModal;
