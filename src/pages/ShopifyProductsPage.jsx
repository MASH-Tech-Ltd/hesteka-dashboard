import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import FilterBar from "../components/common/FilterBar";
import Pagination from "../components/common/Pagination";
import { toast } from "react-toastify";
import { ShoppingBag, RefreshCw, Search, Users, Settings, Key, Copy, AlertTriangle, Play, CheckCircle, XCircle } from "lucide-react";
import DataTable from "../components/common/DataTable";

const ProductSkeleton = () => (
  <div className="bg-white rounded-xl border border-[#e8ddd0] p-3 flex flex-col gap-2 animate-pulse h-full">
    <div className="bg-[#f5f0e8] rounded-lg aspect-[4/3] w-full"></div>
    <div className="flex flex-col gap-2 mt-1">
      <div className="h-4 bg-[#f5f0e8] rounded w-full"></div>
      <div className="h-3 bg-[#f5f0e8] rounded w-1/4"></div>
      <div className="h-2 bg-[#f5f0e8] rounded w-1/2 mt-1"></div>
      <div className="h-2 bg-[#f5f0e8] rounded w-1/3"></div>
      <div className="h-2 bg-[#f5f0e8] rounded w-1/4"></div>
    </div>
    <div className="mt-auto pt-2">
      <div className="h-8 bg-[#f5f0e8] rounded w-full"></div>
    </div>
  </div>
);

const ShopifyProductCard = ({ product, t }) => {
  const mainImage = product.image?.src || product.images?.[0]?.src;
  const price = product.variants?.[0]?.price;

  // Helper to optimize Shopify images for better performance and load time
  const getOptimizedImageUrl = (url, width = 200) => {
    if (!url) return url;
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set("width", width.toString());
      return urlObj.toString();
    } catch (e) {
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}width=${width}`;
    }
  };

  const optimizedImage = getOptimizedImageUrl(mainImage, 300);

  return (
    <div className="bg-white rounded-xl border border-[#e8ddd0] p-3 flex flex-col gap-2 hover:shadow-md transition-shadow relative h-full overflow-hidden">
      <div className="bg-[#fcfaf7] rounded-lg aspect-[4/3] w-full flex items-center justify-center relative overflow-hidden group">
        {mainImage ? (
          <img
            src={optimizedImage}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <ShoppingBag className="w-10 h-10 text-[#8B6914] opacity-20" />
        )}
        <div className="absolute top-1.5 right-1.5">
          <span className="bg-[#3a2a1a]/80 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
            Shopify
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h4 className="text-[11px] font-bold text-[#3a2a1a] line-clamp-2 min-h-[30px] leading-tight">
          {product.title}
        </h4>
        <p className="text-[12px] font-black text-[#8B6914]">{price} €</p>

        <div className="flex flex-col gap-0.5 mt-1">
          <p className="text-[9px] text-[#9a8a7a]"><span className="font-semibold">Vendor:</span> {product.vendor}</p>
          <p className="text-[9px] text-[#9a8a7a]"><span className="font-semibold">Variants:</span> {product.variants?.length || 0}</p>
          <p className="text-[9px] text-[#9a8a7a] flex items-center gap-1">
            <span className="font-semibold">Status:</span> 
            <span className={`px-1.5 py-0.5 rounded-full text-[8px] uppercase ${product.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
              {product.status}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-auto pt-1">
        <a
          href={product.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[10px] font-bold py-1.5 rounded-lg bg-[#3a2a1a] text-white hover:bg-[#2a1a0a] transition-colors"
        >
          {t.viewOnShopify || "View on Shopify"}
        </a>
      </div>
    </div>
  );
};

export default function ShopifyProductsPage() {
  const { t } = useLang();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [pageInfo, setPageInfo] = useState({ next: null, prev: null });
  const [currentPageInfo, setCurrentPageInfo] = useState(null);
  const [query, setQuery] = useState({
    collectionId: "all",
    search: "",
  });

  const [viewMode, setViewMode] = useState("products");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pageInfoCustomers, setPageInfoCustomers] = useState({ next: null, prev: null });
  const [currentPageInfoCustomers, setCurrentPageInfoCustomers] = useState(null);

  const [apiKey, setApiKey] = useState(null);
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [testKey, setTestKey] = useState("");
  const [customTestUrl, setCustomTestUrl] = useState("");
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.collectionId && query.collectionId !== "all") {
        params.append("collectionId", query.collectionId);
      }
      if (currentPageInfo) {
        params.append("pageInfo", currentPageInfo);
      }
      params.append("limit", "12");

      const res = await api.get(
        `/solidarity/shopify-products?${params.toString()}`,
      );
      if (res.data.status === "ok") {
        setProducts(res.data.data.products || []);
        setPageInfo(res.data.data.pageInfo || { next: null, prev: null });
      }
    } catch (err) {
      console.error("Failed to fetch Shopify products", err);
      toast.error("Failed to load products from Shopify");
    } finally {
      setLoading(false);
    }
  }, [query.collectionId, currentPageInfo]);

  const fetchCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await api.get("/solidarity/shopify-collections");
      if (res.data.status === "ok") {
        setCollections(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch collections", err);
    } finally {
      setLoadingCollections(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const params = new URLSearchParams();
      if (currentPageInfoCustomers) {
        params.append("pageInfo", currentPageInfoCustomers);
      }
      params.append("limit", "12");

      const res = await api.get(
        `/solidarity/shopify-customers?${params.toString()}`,
      );
      if (res.data.status === "ok") {
        setCustomers(res.data.data.customers || []);
        setPageInfoCustomers(res.data.data.pageInfo || { next: null, prev: null });
      }
    } catch (err) {
      console.error("Failed to fetch Shopify customers", err);
      toast.error("Failed to load customers from Shopify (Check App Permissions)");
    } finally {
      setLoadingCustomers(false);
    }
  }, [currentPageInfoCustomers]);

  useEffect(() => {
    if (viewMode === "customers" && customers.length === 0) {
      fetchCustomers();
    }
  }, [viewMode, currentPageInfoCustomers, fetchCustomers]);

  const fetchApiKey = useCallback(async () => {
    setLoadingApiKey(true);
    try {
      const res = await api.get("/settings/shopify-key");
      if (res.data.status === "ok" || res.data.success) {
        setApiKey(res.data.data?.apiKey || null);
      }
    } catch (err) {
      console.error("Failed to fetch API key", err);
    } finally {
      setLoadingApiKey(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "settings" && apiKey === null) {
      fetchApiKey();
    }
  }, [viewMode, fetchApiKey]);

  const handleGenerateKey = async () => {
    setLoadingApiKey(true);
    try {
      const res = await api.post("/settings/shopify-key");
      if (res.data.status === "ok" || res.data.success) {
        setApiKey(res.data.data.apiKey);
        toast.success("New API key generated");
        setShowConfirmModal(false);
      }
    } catch (err) {
      toast.error("Failed to generate API key");
    } finally {
      setLoadingApiKey(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success("Copied to clipboard!");
    }
  };

  const handleTestKey = async () => {
    if (!testKey) {
      toast.error("Please enter an API key to test");
      return;
    }
    setTestingKey(true);
    setTestResult(null);
    try {
      const defaultUrl = `${import.meta.env.VITE_API_BASE_URL.replace('/v1', '')}/intigration/shopify/users`;
      const urlToTest = customTestUrl || defaultUrl;
      const res = await api.get(urlToTest, {
        headers: {
          "x-api-key": testKey,
        },
      });
      if (res.data.status === "ok" || res.data.success) {
        setTestResult({ success: true, message: "API Key is valid! Connection successful.", data: res.data });
      } else {
        setTestResult({ success: true, message: "Request completed but success flag was false", data: res.data });
      }
    } catch (err) {
      setTestResult({ 
        success: false, 
        message: err.response?.data?.message || "Invalid API Key or connection failed",
        data: err.response?.data || err.message
      });
    } finally {
      setTestingKey(false);
    }
  };


  const handleFilterChange = (name, val) => {
    if (name === "collectionId") {
      setCurrentPageInfo(null);
    }
    setQuery((p) => ({ ...p, [name]: val }));
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(query.search.toLowerCase()),
  );

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4">
      <div className="flex gap-2">
        <button 
          onClick={() => setViewMode("products")} 
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${viewMode === "products" ? "bg-[#8B6914] text-white shadow-md" : "bg-white text-[#9a8a7a] border border-[#e8ddd0] hover:bg-[#fcfaf7]"}`}
        >
          <span className="flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Products</span>
        </button>
        <button 
          onClick={() => setViewMode("customers")} 
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${viewMode === "customers" ? "bg-[#8B6914] text-white shadow-md" : "bg-white text-[#9a8a7a] border border-[#e8ddd0] hover:bg-[#fcfaf7]"}`}
        >
          <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Customers</span>
        </button>
        <button 
          onClick={() => setViewMode("settings")} 
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${viewMode === "settings" ? "bg-[#8B6914] text-white shadow-md" : "bg-white text-[#9a8a7a] border border-[#e8ddd0] hover:bg-[#fcfaf7]"}`}
        >
          <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
        {viewMode === "products" && (
          <FilterBar
            onSearch={(val) => setQuery((p) => ({ ...p, search: val }))}
            onFilterChange={handleFilterChange}
            related={true}
            filters={[
              {
                name: "collectionId",
                label: t.allCollections,
                options: collections.map((c) => ({
                  label: c.title,
                  value: c.id.toString(),
                })),
              },
            ]}
            actionButton={
              <button
                onClick={() => {
                  setCurrentPageInfo(null);
                  fetchData();
                }}
                disabled={loading}
                className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
                />{" "}
                Sync Shopify
              </button>
            }
          />
        )}

        <div className="p-4 flex flex-col gap-6">
          {viewMode === "products" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {loading ? (
                  Array(12)
                    .fill(0)
                    .map((_, i) => <ProductSkeleton key={i} />)
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ShopifyProductCard key={product.id} product={product} t={t} />
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center flex flex-col items-center gap-3">
                    <Search className="w-12 h-12 text-[#8B6914] opacity-20" />
                    <p className="text-[#9a8a7a] text-sm italic">
                      {t.noItemsFound}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between bg-[#fcfaf7] px-4 py-3 rounded-xl border border-[#e8ddd0]">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-[#9a8a7a]">
                      {t.showing}{" "}
                      <span className="font-medium text-[#3a2a1a]">
                        {products.length}
                      </span>{" "}
                      {t.results}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPageInfo(pageInfo.prev)}
                      disabled={!pageInfo.prev || loading}
                      className="relative inline-flex items-center px-4 py-2 border border-[#e8ddd0] text-xs font-bold rounded-xl text-[#3a2a1a] bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {t.previous}
                    </button>
                    <button
                      onClick={() => setCurrentPageInfo(pageInfo.next)}
                      disabled={!pageInfo.next || loading}
                      className="relative inline-flex items-center px-4 py-2 border border-[#e8ddd0] text-xs font-bold rounded-xl text-[#3a2a1a] bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : viewMode === "customers" ? (
            <>
              <div className="flex justify-between items-center px-2">
                <h2 className="text-lg font-bold text-[#3a2a1a]">Shopify Customers</h2>
                <button
                  onClick={() => {
                    setCurrentPageInfoCustomers(null);
                    fetchCustomers();
                  }}
                  disabled={loadingCustomers}
                  className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingCustomers ? "animate-spin" : ""}`} /> Sync Customers
                </button>
              </div>
              <DataTable 
                columns={[
                  { header: "Name", cell: (row) => `${row.first_name || ""} ${row.last_name || ""}` },
                  { header: "Email", accessor: "email" },
                  { header: "State", cell: (row) => (
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${row.state === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{row.state || "N/A"}</span>
                  )},
                  { header: "Orders", accessor: "orders_count" },
                  { header: "Total Spent", cell: (row) => <span className="font-bold text-[#8B6914]">{row.total_spent || "0"} {row.currency || ""}</span> }
                ]}
                data={customers}
                loading={loadingCustomers}
                onEdit={null}
                onDelete={null}
              />
              
              {/* Pagination for Customers */}
              <div className="flex items-center justify-between bg-[#fcfaf7] px-4 py-3 rounded-xl border border-[#e8ddd0]">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-[#9a8a7a]">
                      {t.showing}{" "}
                      <span className="font-medium text-[#3a2a1a]">
                        {customers.length}
                      </span>{" "}
                      {t.results}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPageInfoCustomers(pageInfoCustomers.prev)}
                      disabled={!pageInfoCustomers.prev || loadingCustomers}
                      className="relative inline-flex items-center px-4 py-2 border border-[#e8ddd0] text-xs font-bold rounded-xl text-[#3a2a1a] bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {t.previous}
                    </button>
                    <button
                      onClick={() => setCurrentPageInfoCustomers(pageInfoCustomers.next)}
                      disabled={!pageInfoCustomers.next || loadingCustomers}
                      className="relative inline-flex items-center px-4 py-2 border border-[#e8ddd0] text-xs font-bold rounded-xl text-[#3a2a1a] bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {t.next}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-[#3a2a1a] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#8B6914]" /> Integration Settings
              </h2>
              <div className="flex flex-col xl:flex-row gap-6 items-start w-full">
                <div className="bg-[#fcfaf7] border border-[#e8ddd0] p-6 rounded-xl flex flex-col gap-4 w-full xl:w-1/2">
                  <div>
                    <h3 className="text-sm font-bold text-[#3a2a1a] mb-1">Shopify API Key</h3>
                  <p className="text-xs text-[#9a8a7a] mb-4">
                    This key is used to securely authenticate requests from Shopify to your server.
                    For example, configuring a webhook or fetching user emails via 
                    <code className="mx-1 bg-white px-1.5 py-0.5 rounded border border-[#e8ddd0]">/api/intigration/shopify/users</code>.
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={apiKey || "No key generated yet"}
                        className="block w-full pl-10 pr-3 py-2 border border-[#e8ddd0] rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8B6914] text-gray-700"
                      />
                    </div>
                    {apiKey && (
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-2 bg-white border border-[#e8ddd0] rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm text-[#3a2a1a] font-medium transition-colors"
                      >
                        <Copy className="w-4 h-4" /> Copy
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e8ddd0] flex items-center justify-between">
                  <p className="text-xs text-red-500 font-medium max-w-sm">
                    Warning: Generating a new key will instantly invalidate the old one. Make sure to update your Shopify App settings.
                  </p>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={loadingApiKey}
                    className="px-4 py-2 bg-[#3a2a1a] text-white rounded-lg text-sm font-bold hover:bg-[#2a1a0a] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingApiKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Generate New Key
                  </button>
                </div>
              </div>

              {/* Test API Key Box */}
              <div className="bg-[#fcfaf7] border border-[#e8ddd0] p-6 rounded-xl flex flex-col gap-4 w-full xl:w-1/2">
                <div>
                  <h3 className="text-sm font-bold text-[#3a2a1a] mb-1">Test API Connection</h3>
                  <p className="text-xs text-[#9a8a7a] mb-4">
                    Enter an API key to test the connection to your server's Shopify integration endpoints.
                  </p>
                  
                  <div className="flex flex-col gap-3 mt-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Paste API Key here..."
                        value={testKey}
                        onChange={(e) => setTestKey(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-[#e8ddd0] rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8B6914] text-gray-700"
                      />
                    </div>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-400 text-xs font-bold font-mono">URL</span>
                      </div>
                      <input
                        type="text"
                        placeholder={`${import.meta.env.VITE_API_BASE_URL.replace('/v1', '')}/intigration/shopify/users`}
                        value={customTestUrl}
                        onChange={(e) => setCustomTestUrl(e.target.value)}
                        className="block w-full pl-12 pr-3 py-2 border border-[#e8ddd0] rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#8B6914] text-gray-700 placeholder-gray-300"
                      />
                    </div>
                    
                    <button
                      onClick={handleTestKey}
                      disabled={testingKey || !testKey}
                      className="px-4 py-2 mt-1 bg-white border border-[#e8ddd0] text-[#3a2a1a] rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {testingKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      Test Connection
                    </button>

                    {testResult && (
                      <div className="flex flex-col gap-2 mt-2">
                        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          {testResult.success ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                          <p>{testResult.message}</p>
                        </div>
                        {testResult.data && (
                          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto border border-gray-700">
                            <pre className="text-xs text-gray-300 font-mono m-0">
                              {JSON.stringify(testResult.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-[#e8ddd0]">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-center text-[#3a2a1a] mb-2">Are you absolutely sure?</h3>
              <p className="text-sm text-center text-[#9a8a7a]">
                Generating a new API key will instantly invalidate your old key. Any external apps or webhooks relying on the old key will stop working immediately.
              </p>
            </div>
            <div className="p-4 bg-[#fcfaf7] border-t border-[#e8ddd0] flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loadingApiKey}
                className="px-4 py-2 text-sm font-bold rounded-xl text-[#3a2a1a] bg-white border border-[#e8ddd0] hover:bg-gray-50 transition-colors flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateKey}
                disabled={loadingApiKey}
                className="px-4 py-2 text-sm font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingApiKey ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {loadingApiKey ? "Generating..." : "Yes, Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
