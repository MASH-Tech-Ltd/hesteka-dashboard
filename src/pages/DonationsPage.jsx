import React, { useState, useEffect, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import { socket } from "../context/SocketContect";
import Pagination from "../components/common/Pagination";
import FilterBar from "../components/common/FilterBar";
import DataTable from "../components/common/DataTable";
import { toast } from "react-toastify";
import { FileText, X, Mail, Printer, CreditCard, Package, Wallet, Download } from "lucide-react";

const ReceiptModal = ({ donation, isOpen, onClose, t, isFiscal }) => {
  const [emailLoading, setEmailLoading] = useState(false);
  if (!isOpen || !donation) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    setEmailLoading(true);
    try {
      const res = await api.post(`/donations/${donation._id}/send-receipt`, { isFiscal });
      if (res.data.status === "ok" || res.data.success) {
        toast.success(t.receiptSentSuccess || "Receipt sent successfully to donor email!");
      }
    } catch (err) {
      console.error("Failed to send receipt email", err);
      toast.error(err.response?.data?.message || "Failed to send receipt email");
    } finally {
      setEmailLoading(false);
    }
  };

  const statusColor = donation.status === "completed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-[#e8ddd0] flex flex-col print:shadow-none print:border-none print:max-w-none print:w-full max-h-[100vh] sm:max-h-[95vh]">
        
        {/* Modal Header - Hidden on print */}
        <div className="bg-[#fcfaf7] px-6 py-4 border-b border-[#e8ddd0] flex justify-between items-center print:hidden rounded-t-xl">
          <h3 className="font-bold text-[#3a2a1a] flex items-center gap-2 uppercase tracking-tight text-sm">
            <FileText className="w-4 h-4 text-[#8B6914]" /> {isFiscal ? t.fiscalReceipt : t.receiptBtn}
          </h3>
          <button onClick={onClose} className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 sm:p-8 md:p-10 flex flex-col gap-6 sm:gap-8 bg-white print:p-10 relative overflow-y-auto custom-scrollbar">
          {/* Header Row: Logo & Invoice Info */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-dashed border-[#e8ddd0] pb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3a2a1a] flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-sm">H</div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-black text-[#3a2a1a] tracking-tighter leading-none mb-1">HESTEKA</h1>
                <p className="text-[9px] text-[#9a8a7a] font-black uppercase tracking-widest">{isFiscal ? "Official Fiscal Receipt" : "Donation Receipt"}</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:items-end gap-1.5 text-sm bg-[#fcfaf7] p-3.5 rounded-xl border border-[#e8ddd0] w-full sm:w-auto min-w-[200px]">
              <div className="flex justify-between w-full gap-4">
                <span className="text-[#9a8a7a] font-bold uppercase text-[10px]">RECEIPT ID</span>
                <span className="text-[#3a2a1a] font-mono text-[11px] font-bold">{donation.receiptId || (donation._id && typeof donation._id === 'string' ? donation._id.slice(-8).toUpperCase() : "N/A")}</span>
              </div>
              <div className="flex justify-between w-full gap-4">
                <span className="text-[#9a8a7a] font-bold uppercase text-[10px]">{t.dateLabel || "DATE"}</span>
                <span className="text-[#3a2a1a] font-bold text-[11px]">{new Date(donation.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between w-full gap-4 items-center mt-1 border-t border-[#e8ddd0] pt-2">
                <span className="text-[#9a8a7a] font-bold uppercase text-[10px]">STATUS</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${statusColor}`}>{donation.status}</span>
              </div>
            </div>
          </div>

          {/* Body: Two Columns (Donor vs Association) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black text-[#8B6914] uppercase tracking-widest border-b border-[#f0e8d8] pb-1.5">Donor Details</h4>
              <div className="flex flex-col gap-1">
                <span className="text-[#3a2a1a] font-bold text-sm">{donation.donorName}</span>
                <span className="text-[#9a8a7a] text-xs font-medium">{donation.donorEmail}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black text-[#8B6914] uppercase tracking-widest border-b border-[#f0e8d8] pb-1.5">Donation Info</h4>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[#9a8a7a] text-xs font-medium">{t.association || "Association"}</span>
                  <span className="text-[#3a2a1a] font-bold text-xs">{donation.association || "HESTEKA ASSOCIATION"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9a8a7a] text-xs font-medium">Payment Method</span>
                  <span className="text-[#3a2a1a] font-bold text-[11px] uppercase bg-[#fcfaf7] px-2 py-0.5 rounded border border-[#e8ddd0]">
                    {donation.method === 'collection_point' && donation.collectionPoint?.title 
                      ? donation.collectionPoint.title 
                      : donation.method}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount Section */}
          <div className="bg-[#fcfaf7] rounded-xl p-5 sm:p-6 border border-[#e8ddd0] flex flex-col sm:flex-row justify-between items-center sm:items-center gap-2 sm:gap-0 mt-2 shadow-inner">
            <span className="text-sm font-black text-[#3a2a1a] uppercase tracking-widest">Total Amount</span>
            <span className="text-3xl sm:text-4xl font-black text-[#8B6914]">{donation.amount}€</span>
          </div>

          {/* Footer / Legal */}
          <div className="flex flex-col gap-6 border-t border-[#f0e8d8] pt-6 mt-2">
            <p className="text-[10px] text-[#9a8a7a] leading-relaxed text-center italic max-w-md mx-auto">
              {isFiscal
                ? "This fiscal receipt is issued in accordance with current tax laws. It entitles the donor to a tax deduction for their charitable contribution."
                : "Thank you for your generous donation. Your support helps us continue our mission to help animals in need."}
            </p>
            
            <div className="flex justify-center mt-2 opacity-50 grayscale print:opacity-100">
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 flex items-end text-[16px] font-serif text-[#3a2a1a] font-bold italic">Hesteka Team</div>
                <div className="w-32 h-[1px] bg-[#3a2a1a]"></div>
                <div className="text-[8px] uppercase tracking-widest mt-1 font-bold">Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer - Hidden on print */}
        <div className="px-4 sm:px-6 py-4 bg-[#fcfaf7] border-t border-[#e8ddd0] flex flex-col sm:flex-row justify-end gap-3 print:hidden rounded-b-xl">
          <button
            onClick={onClose}
            className="border border-[#e8ddd0] bg-white text-[#3a2a1a] text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-[#fcfaf7] transition-colors"
          >
            {t.closeBtn || "CLOSE"}
          </button>
          <button
            onClick={handleSendEmail}
            disabled={emailLoading}
            className="bg-blue-600 text-white text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {emailLoading ? t.sendingLabel || "SENDING..." : <><Mail className="w-4 h-4" /> {t.emailReceipt || "EMAIL"}</>}
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#3a2a1a] text-white text-xs font-bold px-6 py-2.5 rounded-lg hover:bg-[#2a1a0a] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> {t.printBtn || "PRINT"}
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed.inset-0, .fixed.inset-0 * {
            visibility: visible;
          }
          .fixed.inset-0 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            backdrop-filter: none !important;
          }
        }
      `}} />
    </div>
  );
};


const DonationDetailModal = ({ donation, isOpen, onClose, t }) => {
  if (!isOpen || !donation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#e8ddd0]">
        <div className="bg-[#fcfaf7] px-6 py-4 border-b border-[#e8ddd0] flex justify-between items-center">
          <h3 className="font-bold text-[#3a2a1a] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B6914]" /> {t.donationDetailTitle || "DONATION DETAILS"}
          </h3>
          <button onClick={onClose} className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {/* Donor Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.donator}</span>
              <span className="text-sm font-bold text-[#3a2a1a]">{donation.donorName}</span>
              <span className="text-[10px] text-[#9a8a7a]">{donation.donorEmail}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">METHOD</span>
              <span className="text-sm font-bold text-[#3a2a1a] uppercase">{donation.method}</span>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-[#fcfaf7] rounded-xl p-4 border border-[#e8ddd0] grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.amount}</span>
              <span className="text-lg font-bold text-green-600">{donation.amount}€</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">STATUS</span>
              <span className="text-sm font-bold uppercase text-orange-600">{donation.status || donation.payment?.status}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">PROVIDER</span>
              <span className="text-sm font-bold text-[#3a2a1a] uppercase">
                {donation.method === 'collection_point' && donation.collectionPoint?.title 
                  ? donation.collectionPoint.title 
                  : (donation.method || donation.payment?.provider)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">DATE</span>
              <span className="text-sm text-[#3a2a1a]">{new Date(donation.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Metadata/Company Info */}
          {donation.isCompanyDonation && donation.companyInfo && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">COMPANY INFO</span>
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 text-[12px] text-blue-800">
                <p><strong>Name:</strong> {donation.companyInfo.name}</p>
                <p><strong>VAT:</strong> {donation.companyInfo.vatNumber}</p>
                <p><strong>Address:</strong> {donation.companyInfo.address}</p>
              </div>
            </div>
          )}

          {/* Collection Point Info */}
          {donation.method === 'collection_point' && donation.collectionPoint && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">COLLECTION POINT</span>
              <div className="bg-green-50 rounded-lg p-3 border border-green-100 text-[12px] text-green-800">
                <p><strong>Name:</strong> {donation.collectionPoint.title}</p>
                {donation.collectionPoint.address && <p><strong>Address:</strong> {donation.collectionPoint.address}</p>}
              </div>
            </div>
          )}
          
          {donation.association && !donation.collectionPoint && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">{t.association || "ASSOCIATION"}</span>
              <span className="text-sm font-bold text-[#3a2a1a]">{donation.association}</span>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">TRANSACTION ID</span>
            <span className="text-[11px] font-mono bg-gray-100 p-1.5 rounded border border-gray-200 break-all">
              {donation.payment?.providerTransactionId || donation.transactionId || "Not generated automatically"}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 bg-[#fcfaf7] border-t border-[#e8ddd0] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#3a2a1a] text-white text-xs font-bold px-6 py-2 rounded-lg hover:bg-[#2a1a0a] transition-colors"
          >
            {t.closeBtn || "CLOSE"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DonationsPage() {
  const { t, lang } = useLang();
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [queryParams, setQueryParams] = useState({ 
    page: 1, 
    limit: 10, 
    search: "", 
    status: "", 
    sortBy: "date", 
    sort: "descending" 
  });
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isFiscal, setIsFiscal] = useState(false);

  const fetchSingleDonation = async (id, type = 'details') => {
    try {
      const res = await api.get(`/donations/${id}`);
      if (res.data.status === "ok" || res.data.success) {
        setSelectedDonation(res.data.data);
        if (type === 'details') {
          setIsModalOpen(true);
        } else {
          setIsReceiptModalOpen(true);
          setIsFiscal(type === 'fiscal');
        }
      }
    } catch (err) {
      console.error("Failed to fetch donation details", err);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: queryParams.page,
        limit: queryParams.limit,
        search: queryParams.search,
        sortBy: queryParams.sortBy,
        sort: queryParams.sort,
        ...(queryParams.status && queryParams.status !== "all" ? { status: queryParams.status } : {})
      }).toString();

      const [donationsRes, statsRes] = await Promise.all([
        api.get(`/donations/get-all-donation?${query}`),
        api.get("/donations/stats"),
      ]);

      if (donationsRes.data.status === "ok" || donationsRes.data.success) {
        setDonations(donationsRes.data.data || []);
        setMeta(donationsRes.data.meta);
      }

      if (statsRes.data.status === "ok" || statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch donations", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    socket.connect();
    socket.on("donation_new", () => {
      fetchData();
    });
    return () => {
      socket.off("donation_new");
    };
  }, [fetchData]);

  const statCards = [
    { label: t.totalCollected, value: { text: `${stats?.totalCollected || 0}€`, color: "text-green-600" }, color: "bg-green-500" },
    { label: t.returnedAssos, value: { text: `${stats?.returnedToAssos || 0}€`, color: "text-blue-600" }, color: "bg-blue-500" },
    { label: t.pendingLabel, value: { text: `${stats?.pendingAmount || 0}€`, color: "text-orange-500" }, color: "bg-orange-500" },
    { label: t.averageBasket, value: { text: `${Math.round(stats?.averageBasket || 0)}€`, color: "text-[#3a2a1a]" }, color: "bg-purple-500" },
  ];

  const columns = [
    {
      header: t.donator,
      cell: (d) => (
        <div className="font-bold text-[#3a2a1a]">{d.donorName || "Anonyme"}</div>
      )
    },
    {
      header: t.amount,
      cell: (d) => <div className="font-bold text-[#3a2a1a]">{d.amount}€</div>
    },
    { header: t.association, accessor: "association" },
    {
      header: t.paymentMethodLabel || "METHOD",
      cell: (d) => (
        <div className="font-medium flex items-center gap-1.5 uppercase text-[10px] text-[#3a2a1a]">
          <span>{d.method === 'stripe' ? <CreditCard className="w-3.5 h-3.5" /> : d.method === 'collection_point' ? <Package className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}</span>
          {d.method?.replace('_', ' ')}
        </div>
      )
    },
    {
      header: t.dateLabel || "DATE",
      cell: (d) => new Date(d.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')
    },
    {
      header: t.statusLabel || "STATUS",
      cell: (d) => {
        const status = d.status || d.payment?.status || "completed";
        const colors = {
          "completed": "bg-green-100 text-green-600",
          "pending": "bg-orange-100 text-orange-600",
          "cancelled": "bg-gray-100 text-gray-600",
          "failed": "bg-red-100 text-red-600"
        };
        return (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${colors[status.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
            {status}
          </span>
        );
      }
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      cell: (d) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => fetchSingleDonation(d._id, 'details')}
            className="md:w-20 bg-[#fcfaf7] text-[#3a2a1a] text-[10px] font-bold px-3 py-1.5 rounded border border-[#e8ddd0] hover:bg-[#f0e8d8] transition-colors"
          >
            {t.detailsBtn || "Details"}
          </button>
          {(d.status?.toLowerCase().includes("pending") || (d.payment?.status?.toLowerCase().includes("pending"))) ? (
            <button
              onClick={() => fetchSingleDonation(d._id, 'receipt')}
              className="md:w-28 bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded hover:bg-blue-200 transition-colors text-center"
            >
              {t.receiptBtn}
            </button>
          ) : (
            <button
              onClick={() => fetchSingleDonation(d._id, 'fiscal')}
              className="md:w-28 bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded border border-blue-100 hover:bg-blue-100 transition-colors text-center"
            >
              {t.fiscalReceipt}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <StatCard key={i} loading={loading} {...s} />
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden shadow-sm flex flex-col">
        <FilterBar
          onSearch={(val) => setQueryParams(p => ({ ...p, search: val, page: 1 }))}
          onFilterChange={(name, val) => setQueryParams(p => ({ ...p, [name]: val, page: 1 }))}
          onSortChange={(sortBy, sort) => setQueryParams(p => ({ ...p, sortBy, sort, page: 1 }))}
          related={true}
          filters={[
            {
              name: "status", label: t.allStatuses || "ALL", options: [
                { label: t.approved || "COMPLETED", value: "completed" },
                { label: t.pending || "PENDING", value: "pending" },
                { label: t.cancelled || "CANCELLED", value: "cancelled" },
                { label: t.rejected || "REJECTED", value: "failed" }
              ]
            }
          ]}
          sortOptions={[
            { label: t.dateDesc || "Date (Newest)", value: "date:descending" },
            { label: t.dateAsc || "Date (Oldest)", value: "date:ascending" },
            { label: t.ptsDesc || "Amount (Highest)", value: "amount:descending" },
            { label: t.ptsAsc || "Amount (Lowest)", value: "amount:ascending" }
          ]}
          actionButton={
            <button className="bg-[#3a2a1a] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#2a1a0a] transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> {t.exportBtn}
            </button>
          }
        />
        
        <DataTable 
          columns={columns}
          data={donations}
          loading={loading}
          emptyMessage={t.noDataFound}
        />

        <div className="bg-[#fcfaf7]">
          <Pagination
            meta={meta}
            onPageChange={(page) => setQueryParams(p => ({ ...p, page }))}
          />
        </div>
      </div>

      <DonationDetailModal
        donation={selectedDonation}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
      />

      <ReceiptModal
        donation={selectedDonation}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        t={t}
        isFiscal={isFiscal}
      />
    </div>
  );
}


