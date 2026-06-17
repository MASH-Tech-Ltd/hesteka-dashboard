import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import api from "../utils/api";
import FilterBar from "../components/common/FilterBar";
import Pagination from "../components/common/Pagination";
import { toast } from "react-toastify";
import { ShoppingBag, RefreshCw, Search } from "lucide-react";

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
      <div className="bg-white rounded-2xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
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

        <div className="p-4 flex flex-col gap-6">
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
        </div>
      </div>
    </div>
  );
}
