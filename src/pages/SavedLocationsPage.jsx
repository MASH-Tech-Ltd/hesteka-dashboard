import React, { useEffect, useState, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import StatCard from "../components/dashboard/StatCard";
import api from "../utils/api";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import {
  Database,
  MapPin,
  Search,
  Globe,
  Trash2,
  RefreshCw,
  Eye,
  X,
  Code,
  Map,
  Filter,
  Clock,
  Layers,
} from "lucide-react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const libraries = ["places"];

export default function SavedLocationsPage() {
  const { t } = useLang();
  const [locations, setLocations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Query State
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 20,
    search: "",
    type: "all",
  });

  const [stats, setStats] = useState({
    all: 0,
    details: 0,
    autocomplete: 0,
    geocode: 0,
  });

  // Modal State
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'json'

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const fetchLocations = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const query = new URLSearchParams({
          page: queryParams.page,
          limit: queryParams.limit,
          search: queryParams.search,
          type: queryParams.type,
        }).toString();

        const res = await api.get(`/location/saved?${query}`);
        if (res.data && res.data.status === "ok") {
          const result = res.data.data;
          setLocations(result.locations || []);
          setMeta(result.pagination || null);
          if (result.stats) {
            setStats(result.stats);
          }
        }
      } catch (err) {
        console.error("Failed to fetch saved locations:", err);
        toast.error("Failed to load saved locations from database");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [queryParams],
  );

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSearchChange = (e) => {
    setQueryParams((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleTypeChange = (type) => {
    setQueryParams((prev) => ({ ...prev, type, page: 1 }));
  };

  const handleDeleteSingle = (item) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Saved Location",
      message: `Are you sure you want to remove cache key "${item.key}"? Subsequent requests for this location will re-fetch from OpenStreetMap.`,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/location/saved/${item._id}`);
          toast.success("Saved location removed from cache");
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchLocations();
        } catch (err) {
          console.error("Delete failed:", err);
          toast.error("Failed to delete saved location");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const handleClearAll = () => {
    setConfirmModal({
      isOpen: true,
      title: "Clear All Location Cache",
      message: "WARNING: Are you sure you want to clear ALL saved location data from the MongoDB database? All autocomplete, place details, and geocoding cache will be erased.",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/location/saved`);
          toast.success("All saved location cache cleared successfully");
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchLocations();
        } catch (err) {
          console.error("Clear all failed:", err);
          toast.error("Failed to clear location cache");
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const getTypeInfo = (key) => {
    if (key?.startsWith("pd:")) {
      return { label: "Place Details", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: MapPin };
    }
    if (key?.startsWith("ac:") || key?.startsWith("auto_")) {
      return { label: "Autocomplete", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Search };
    }
    if (key?.startsWith("gc:") || key?.startsWith("rev_")) {
      return { label: "Geocode", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Globe };
    }
    return { label: "General Cache", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Database };
  };

  const getCoordinates = (data) => {
    if (!data) return null;
    if (data.geometry?.location?.lat !== undefined && data.geometry?.location?.lng !== undefined) {
      return {
        lat: Number(data.geometry.location.lat),
        lng: Number(data.geometry.location.lng),
      };
    }
    if (Array.isArray(data) && data[0]?.geometry?.location) {
      return {
        lat: Number(data[0].geometry.location.lat),
        lng: Number(data[0].geometry.location.lng),
      };
    }
    return null;
  };

  const getDisplayName = (item) => {
    const data = item?.data;
    if (!data) return item?.key || "Unknown Item";
    if (data.name && data.formatted_address) {
      return `${data.name} (${data.formatted_address})`;
    }
    if (data.formatted_address) return data.formatted_address;
    if (data.description) return data.description;
    if (data.name) return data.name;
    if (Array.isArray(data)) {
      return `Array of ${data.length} predictions/results`;
    }
    return item?.key;
  };

  const columns = [
    {
      header: "CACHE KEY & TYPE",
      cell: (item) => {
        const typeInfo = getTypeInfo(item.key);
        const Icon = typeInfo.icon;
        return (
          <div className="flex items-center gap-2.5 max-w-[140px]">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${typeInfo.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-[#3a2a1a] text-xs truncate" title={item.key}>
                {item.key}
              </span>
              <span className="text-[10px] text-[#9a8a7a] font-semibold mt-0.5 truncate">
                {typeInfo.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      header: "LOCATION SUMMARY",
      cell: (item) => {
        const name = getDisplayName(item);
        const coords = getCoordinates(item.data);
        return (
          <div className="flex flex-col min-w-[240px] max-w-[400px]">
            <span className="text-xs font-semibold text-[#3a2a1a] break-words leading-snug" title={name}>
              {name}
            </span>
            {coords && (
              <span className="text-[10px] text-[#8B6914] font-mono font-medium flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5 inline" />
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "CACHED ON",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[#3a2a1a]">
            {new Date(item.createdAt || item.updatedAt).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-[#9a8a7a] font-mono">
            {new Date(item.createdAt || item.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      header: "EXPIRES (TTL)",
      cell: (item) => {
        const expiresAt = new Date(item.expiresAt);
        const isExpired = expiresAt < new Date();
        return (
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${isExpired ? "text-red-500" : "text-[#8B6914]"}`} />
            <span className={`text-xs font-mono font-medium ${isExpired ? "text-red-600 font-bold" : "text-[#3a2a1a]"}`}>
              {expiresAt.toLocaleDateString()} {expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      },
    },
    {
      header: "ACTIONS",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedLocation(item);
              setActiveTab("overview");
              setIsDetailModalOpen(true);
            }}
            className="p-1.5 bg-[#f5f0e8] text-[#8B6914] hover:bg-[#8B6914] hover:text-white rounded-lg transition-all"
            title="View Details & Map"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDeleteSingle(item)}
            className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
            title="Remove from Cache"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[#fcfaf7]">
      {/* Sleek Page Title & Actions Header */}
      {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e8ddd0] shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-[#3a2a1a] flex items-center gap-2">
              {t.savedLocationsTitle || "Saved Database Locations"}
              <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300/60 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                MongoDB Cache
              </span>
            </h1>
            <p className="text-xs text-[#9a8a7a] mt-0.5 font-medium">
              {t.savedLocationsDesc || "Monitor, inspect, and manage OpenStreetMap Nominatim and geocoding results saved in your database."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchLocations(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 bg-[#fcfaf7] hover:bg-[#f5f0e8] text-[#3a2a1a] text-xs font-bold px-3.5 py-2 rounded-xl border border-[#e8ddd0] transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-700 ${refreshing ? "animate-spin" : ""}`} />
            <span>{t.refreshBtn || "Refresh"}</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={loading || locations.length === 0}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3.5 py-2 rounded-xl border border-red-200 transition-all disabled:opacity-50 active:scale-95 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAllBtn || "Clear All Cache"}</span>
          </button>
        </div>
      </div> */}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={loading}
          label="Total Saved Items"
          value={{ text: (stats?.all || 0).toLocaleString(), color: "text-[#3a2a1a]" }}
          sub="All cached database entries"
          subType="neutral"
          color="bg-amber-600"
        />
        <StatCard
          loading={loading}
          label="Place Details Cached"
          value={{ text: (stats?.details || 0).toLocaleString(), color: "text-[#3a2a1a]" }}
          sub="Full location coordinates & address"
          subType="neutral"
          color="bg-emerald-600"
        />
        <StatCard
          loading={loading}
          label="Autocomplete Queries"
          value={{ text: (stats?.autocomplete || 0).toLocaleString(), color: "text-[#3a2a1a]" }}
          sub="Debounced search prediction lists"
          subType="neutral"
          color="bg-blue-600"
        />
        <StatCard
          loading={loading}
          label="Geocode / Reverse"
          value={{ text: (stats?.geocode || 0).toLocaleString(), color: "text-[#3a2a1a]" }}
          sub="Lat/Lng and forward geocoding"
          subType="neutral"
          color="bg-purple-600"
        />
      </div>

      {/* Filter Bar & Table Section */}
      <div className="bg-white rounded-2xl border border-[#e8ddd0] shadow-sm overflow-hidden p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#f5f0e8]">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={queryParams.search}
              onChange={handleSearchChange}
              placeholder="Search by cache key, name, or address..."
              className="w-full bg-[#fcfaf7] border border-[#e8ddd0] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all font-medium shadow-inner"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a8a7a]" />
            {queryParams.search && (
              <button
                onClick={() => setQueryParams((prev) => ({ ...prev, search: "", page: 1 }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a8a7a] hover:text-[#3a2a1a]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: "all", label: "All Types", icon: Layers },
              { id: "details", label: "Place Details", icon: MapPin },
              { id: "autocomplete", label: "Autocomplete", icon: Search },
              { id: "geocode", label: "Geocoding", icon: Globe },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = queryParams.type === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTypeChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#8B6914] text-white shadow-md shadow-[#8B6914]/20 scale-[1.02]"
                      : "bg-[#f5f0e8] text-[#6a5010] hover:bg-[#e8ddd0]"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={locations}
          loading={loading}
          emptyMessage="No saved locations found in the MongoDB cache matching your criteria."
        />

        {/* Pagination */}
        {meta && (
          <div className="pt-4 border-t border-[#f5f0e8]">
            <Pagination
              meta={meta}
              loading={loading}
              onPageChange={(page) => setQueryParams((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {isDetailModalOpen && selectedLocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#e8ddd0] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#3a2a1a] to-[#22180f] text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-orange-400 shrink-0 border border-white/15">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate" title={selectedLocation.key}>
                    {selectedLocation.key}
                  </h3>
                  <p className="text-[11px] text-white/70 mt-0.5">
                    Cached on {new Date(selectedLocation.createdAt || selectedLocation.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-6 pt-4 bg-[#fcfaf7] border-b border-[#e8ddd0]">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "overview"
                    ? "border-[#8B6914] text-[#8B6914] bg-white rounded-t-xl shadow-sm"
                    : "border-transparent text-[#9a8a7a] hover:text-[#3a2a1a]"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Visual Overview & Map</span>
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === "json"
                    ? "border-[#8B6914] text-[#8B6914] bg-white rounded-t-xl shadow-sm"
                    : "border-transparent text-[#9a8a7a] hover:text-[#3a2a1a]"
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw Cached JSON Data</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-[#fcfaf7]">
              {activeTab === "overview" ? (
                <div className="flex flex-col gap-6">
                  {/* Summary Card */}
                  <div className="bg-white p-5 rounded-2xl border border-[#e8ddd0] shadow-sm flex flex-col gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">
                        Primary Name / Description
                      </span>
                      <p className="text-sm font-bold text-[#3a2a1a] mt-1">
                        {getDisplayName(selectedLocation)}
                      </p>
                    </div>

                    {selectedLocation.data?.formatted_address && (
                      <div className="pt-3 border-t border-[#f5f0e8]">
                        <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">
                          Formatted Address
                        </span>
                        <p className="text-xs text-[#6a5010] font-medium mt-1">
                          {selectedLocation.data.formatted_address}
                        </p>
                      </div>
                    )}

                    {selectedLocation.data?.place_id && (
                      <div className="pt-3 border-t border-[#f5f0e8] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-[#9a8a7a] uppercase tracking-wider">
                            Place / OSM Identifier
                          </span>
                          <p className="text-xs font-mono text-[#3a2a1a] mt-0.5">
                            {selectedLocation.data.place_id}
                          </p>
                        </div>
                        <span className="text-[10px] bg-[#f5f0e8] text-[#8B6914] font-bold px-2.5 py-1 rounded-lg border border-[#e8ddd0]">
                          {selectedLocation.data.types?.[0] || "OpenStreetMap Geocode"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Map or Autocomplete Array List Preview */}
                  {getCoordinates(selectedLocation.data) ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-[#3a2a1a] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Map className="w-3.5 h-3.5 text-[#8B6914]" />
                          Cached Coordinates Preview
                        </span>
                        <span className="font-mono text-[11px] text-[#8B6914]">
                          {getCoordinates(selectedLocation.data).lat}, {getCoordinates(selectedLocation.data).lng}
                        </span>
                      </span>

                      <div className="h-64 w-full rounded-2xl overflow-hidden border border-[#e8ddd0] shadow-md relative z-0">
                        {!isLoaded ? (
                          <div className="w-full h-full bg-[#f5f0e8] animate-pulse flex items-center justify-center text-xs font-bold text-[#9a8a7a]">
                            Loading Google Maps preview...
                          </div>
                        ) : (
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={getCoordinates(selectedLocation.data)}
                            zoom={15}
                            options={{
                              disableDefaultUI: false,
                              zoomControl: true,
                            }}
                          >
                            <MarkerF position={getCoordinates(selectedLocation.data)} />
                          </GoogleMap>
                        )}
                      </div>
                    </div>
                  ) : Array.isArray(selectedLocation.data) && selectedLocation.data.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#3a2a1a] flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-amber-700" />
                          <span>Suggested Autocomplete Results ({selectedLocation.data.length})</span>
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                          Cached Predictions List
                        </span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {selectedLocation.data.map((item, idx) => (
                          <div
                            key={item.place_id || idx}
                            className="p-3.5 bg-white rounded-xl border border-[#e8ddd0] hover:border-amber-400 transition-all shadow-sm flex flex-col gap-1"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-[#3a2a1a] break-words leading-snug">
                                {item.structured_formatting?.main_text || item.description || `Result #${idx + 1}`}
                              </p>
                              {item.types?.[0] && (
                                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#f5f0e8] text-[#6a5010] border border-[#e8ddd0] shrink-0">
                                  {item.types[0].replace(/_/g, " ")}
                                </span>
                              )}
                            </div>
                            {item.structured_formatting?.secondary_text && (
                              <p className="text-xs text-[#6a5010] font-medium break-words leading-relaxed">
                                {item.structured_formatting.secondary_text}
                              </p>
                            )}
                            <p className="text-[11px] text-[#9a8a7a] break-words leading-relaxed mt-1 bg-[#fcfaf7] p-2 rounded-lg border border-[#e8ddd0]/60">
                              <span className="font-semibold text-[#8B6914]">Full Description: </span>
                              {item.description}
                            </p>
                            {item.place_id && (
                              <div className="flex items-center justify-between pt-1 mt-1 border-t border-[#f5f0e8] text-[10px] font-mono text-[#9a8a7a]">
                                <span>Place ID: {item.place_id}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#e8ddd0] text-xs font-medium text-[#9a8a7a]">
                      No precise latitude/longitude coordinates available in this cached item preview.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#1e140d] text-[#e8ddd0] p-5 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner max-h-[450px]">
                  <pre>{JSON.stringify(selectedLocation.data, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 bg-white border-t border-[#e8ddd0]">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleDeleteSingle(selectedLocation);
                }}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-600 text-red-600 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete from DB</span>
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 bg-[#8B6914] hover:bg-[#6a5010] text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-[#8B6914]/20"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() => !confirmLoading && setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}
