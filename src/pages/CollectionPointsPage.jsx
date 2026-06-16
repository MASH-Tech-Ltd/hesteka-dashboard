import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useLang } from "../context/LanguageContext";
import { useApiCache } from "../context/ApiCacheContext";
import api from "../utils/api";
import DataTable from "../components/common/DataTable";
import Pagination from "../components/common/Pagination";
import CRUDModal from "../components/common/CRUDModal";
import FilterBar from "../components/common/FilterBar";
import StatusBadge from "../components/common/StatusBadge";
import { toast } from "react-toastify";
import ConfirmModal from "../components/common/ConfirmModal";
import {
  GoogleMap,
  MarkerF,
  InfoWindowF,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Store, ClipboardList, Plus, MapPin, X } from "lucide-react";
const mapContainerStyle = { height: "100%", width: "100%" };
const libraries = ['places'];

const CollectionPointsPage = React.memo(() => {
  const { t } = useLang();
  const { fetchWithCache, invalidateCache, getCachedData } = useApiCache();

  // Predict URL for initial cache hit
  const initialQueryStr = new URLSearchParams({
    page: 1,
    limit: 10,
    search: "",
    sortBy: "date",
    sort: "descending",
    type: "collection_point",
  }).toString();
  const cachedList = getCachedData(
    `/partner-ads/get-all-partner-ads?${initialQueryStr}`,
  );
  const cachedMap = getCachedData(
    "/partner-ads/get-all-partner-ads?type=collection_point&limit=500",
  );

  const [points, setPoints] = useState(cachedList?.data?.data || []);
  const [allPoints, setAllPoints] = useState(cachedMap?.data?.data || []); // All points for the map (no pagination)
  const [meta, setMeta] = useState(cachedList?.data?.meta || null);
  const [loading, setLoading] = useState(!cachedList);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10,
    status: "all",
    search: "",
    sortBy: "date",
    sort: "descending",
  });

  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeMarkerId, setActiveMarkerId] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const onMapLoad = useCallback(
    (map) => {
      if (!allPoints || allPoints.length === 0) return;
      const valid = allPoints.filter(
        (p) =>
          Array.isArray(p.location?.coordinates) &&
          p.location.coordinates.length === 2,
      );
      if (valid.length === 0) return;
      if (valid.length === 1) {
        map.setCenter({
          lat: valid[0].location.coordinates[1],
          lng: valid[0].location.coordinates[0],
        });
        map.setZoom(12);
        return;
      }

      const bounds = new window.google.maps.LatLngBounds();
      valid.forEach((p) => {
        bounds.extend({
          lat: p.location.coordinates[1],
          lng: p.location.coordinates[0],
        });
      });
      map.fitBounds(bounds);
      
      // Prevent over-zooming when points are very close together
      const listener = window.google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 14) map.setZoom(14);
        window.google.maps.event.removeListener(listener);
      });
    },
    [allPoints],
  );

  // Fetch ALL points (no pagination) specifically for map pins
  const fetchAllForMap = useCallback(async () => {
    try {
      const res = await fetchWithCache(
        "/partner-ads/get-all-partner-ads?type=collection_point&limit=500",
      );
      if (res.data.status === "ok") setAllPoints(res.data.data || []);
    } catch {
      /* silent */
    }
  }, [fetchWithCache]);

  useEffect(() => {
    fetchAllForMap();
  }, [fetchAllForMap]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = { ...queryParams, type: "collection_point" };
      // Keep status even if "all" because backend defaults to "active"
      const queryString = new URLSearchParams(q).toString();

      const res = await fetchWithCache(
        `/partner-ads/get-all-partner-ads?${queryString}`,
      );
      if (res.data.status === "ok") {
        setPoints(res.data.data || []);
        setMeta(res.data.meta);
      }
    } catch (err) {
      console.error("Failed to fetch collection points", err);
    } finally {
      setLoading(false);
    }
  }, [queryParams, fetchWithCache]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenAdd = () => {
    setEditingPoint(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (point) => {
    setEditingPoint(point);
    setIsModalOpen(true);
  };

  const handleOpenView = async (id) => {
    try {
      const res = await api.get(`/partner-ads/get-single-partner-ad/${id}`);
      if (res.data.status === "ok") {
        setSelectedPoint(res.data.data);
        setIsViewModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to load details", err);
    }
  };

  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== undefined) data.append(key, formData[key]);
      });

      const isUpdate = !!editingPoint;
      const endpoint = isUpdate
        ? `/partner-ads/update-partner-ad/${editingPoint._id}`
        : "/partner-ads/create-partner-ad";

      const res = await api[isUpdate ? "patch" : "post"](endpoint, data);

      if (res.data.status === "ok" || res.data.success) {
        toast.success(
          `Collection point ${isUpdate ? "updated" : "created"} successfully`,
        );
        invalidateCache("/partner-ads/get-all-partner-ads");
        fetchData();
        fetchAllForMap();
        setIsModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({
      isOpen: true,
      title: t.deletePointTitle || "Delete Collection Point",
      message:
        t.confirmDeletePoint ||
        "Are you sure you want to delete this collection point?",
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await api.delete(`/partner-ads/delete-partner-ad/${id}`);
          toast.success("Collection point deleted successfully");
          invalidateCache("/partner-ads/get-all-partner-ads");
          fetchData();
          fetchAllForMap();
        } catch (err) {
          toast.error(err.response?.data?.message || "Delete failed.");
        } finally {
          setConfirmLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const columns = [
    {
      header: t.point || "Point",
      cell: (p) => (
        <div className="flex items-center gap-3">
          {p.photo?.secure_url ? (
            <img
              src={p.photo.secure_url}
              alt={p.title}
              className="w-8 h-8 rounded object-cover shrink-0 border border-[#e8ddd0]"
            />
          ) : (
            <div className="w-8 h-8 rounded bg-[#8B6914] flex items-center justify-center text-white text-xs font-bold shrink-0">
              <Store className="w-4 h-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-bold text-[#3a2a1a]">{p.title}</span>
            <span className="text-[10px] text-[#9a8a7a] truncate max-w-[150px]">
              {p.address}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: t.partner || "Partner",
      cell: (p) => p.partner?.company || p.partner?.firstName || "N/A",
    },
    {
      header: t.statusLabel || "STATUS",
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      header: t.actionsLabel || "ACTIONS",
      align: "right",
      cell: (p) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => handleOpenView(p._id)}
            className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-200 transition-colors"
          >
            {t.viewBtn || "View"}
          </button>
          <button
            onClick={() => handleOpenEdit(p)}
            className="bg-orange-100 text-orange-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-orange-200 transition-colors"
          >
            {t.editBtn}
          </button>
          <button
            onClick={() => handleDelete(p._id)}
            className="bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            {t.deleteBtn}
          </button>
        </div>
      ),
    },
  ];

  const pointFields = [
    { name: "title", label: t.nameLabel || "Name", required: true },
    { name: "address", label: t.address || "Full Address", required: true },
    {
      name: "description",
      label: t.descriptionLabel || "Description",
      type: "textarea",
    },
    { name: "image", label: t.photoLabel || "Photo", type: "file" },
    { name: "latitude", label: t.latitudeLabel || "Latitude", type: "number" },
    {
      name: "longitude",
      label: t.longitudeLabel || "Longitude",
      type: "number",
    },
  ];

  return (
    <div className="px-4 md:px-6 py-4 flex flex-col gap-4 overflow-x-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Real Leaflet Map */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#e8ddd0] overflow-hidden relative min-h-[450px] lg:h-auto shadow-sm">
          {!isLoaded ? (
            <div className="w-full h-full bg-[#f5f0e8] animate-pulse" />
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={{ lat: 46.2276, lng: 2.2137 }}
              zoom={5}
              onLoad={onMapLoad}
              options={{ disableDefaultUI: true, zoomControl: true }}
            >
              {allPoints
                .filter(
                  (p) =>
                    Array.isArray(p.location?.coordinates) &&
                    p.location.coordinates.length === 2,
                )
                .map((p) => (
                  <MarkerF
                    key={p._id}
                    position={{
                      lat: p.location.coordinates[1],
                      lng: p.location.coordinates[0],
                    }}
                    onClick={() => setActiveMarkerId(p._id)}
                  >
                    {activeMarkerId === p._id && (
                      <InfoWindowF onCloseClick={() => setActiveMarkerId(null)}>
                        <div style={{ minWidth: 140 }}>
                          <div
                            style={{
                              fontWeight: "bold",
                              fontSize: 12,
                              color: "#3a2a1a",
                            }}
                          >
                            {p.title}
                          </div>
                          {p.address && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#9a8a7a",
                                marginTop: 2,
                              }}
                            >
                              {p.address}
                            </div>
                          )}
                          {p.partner?.company && (
                            <div
                              style={{
                                fontSize: 10,
                                color: "#8B6914",
                                marginTop: 2,
                                fontWeight: "bold",
                              }}
                            >
                              {p.partner.company}
                            </div>
                          )}
                          {p.status && (
                            <div
                              style={{
                                fontSize: 10,
                                marginTop: 4,
                                textTransform: "capitalize",
                                fontWeight: "bold",
                                color:
                                  p.status === "active" ? "#16a34a" : "#9a8a7a",
                              }}
                            >
                              {p.status}
                            </div>
                          )}
                        </div>
                      </InfoWindowF>
                    )}
                  </MarkerF>
                ))}
            </GoogleMap>
          )}

          {/* Loading overlay — shown while allPoints not yet ready */}
          {loading && allPoints.length === 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="w-8 h-8 border-4 border-[#8B6914] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur shadow-lg px-4 py-2 rounded-xl text-[10px] font-extrabold text-[#3a2a1a] border border-[#e8ddd0] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {meta?.total || 0}{" "}
            {t.activePointsLabel || "active collection points"}
          </div>
        </div>

        {/* List View */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-white rounded-xl border border-[#e8ddd0] overflow-hidden flex flex-col shadow-sm">
            <div className="p-4 border-b border-[#e8ddd0] bg-[#fcfaf7] flex items-center justify-between">
              <h3 className="font-bold text-[#3a2a1a] text-xs flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#8B6914]" />{" "}
                {t.pointsList}
              </h3>
              <span className="text-[10px] font-bold text-[#9a8a7a]">
                {meta?.total || 0} Total
              </span>
            </div>

            <FilterBar
              onSearch={(val) =>
                setQueryParams((p) =>
                  p.search === val ? p : { ...p, search: val, page: 1 },
                )
              }
              onFilterChange={(name, val) =>
                setQueryParams((p) =>
                  p[name] === val ? p : { ...p, [name]: val, page: 1 },
                )
              }
              onSortChange={(sortBy, sort) =>
                setQueryParams((p) =>
                  p.sortBy === sortBy && p.sort === sort
                    ? p
                    : { ...p, sortBy, sort, page: 1 },
                )
              }
              related={true}
              filters={[
                {
                  name: "status",
                  label: t.allStatuses || "All statuses",
                  options: [
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                  ],
                },
              ]}
              sortOptions={[
                {
                  label: t.dateDesc || "Date (Newest)",
                  value: "date:descending",
                },
                {
                  label: t.dateAsc || "Date (Oldest)",
                  value: "date:ascending",
                },
                { label: t.nameAsc || "Name (A-Z)", value: "title:ascending" },
                {
                  label: t.nameDesc || "Name (Z-A)",
                  value: "title:descending",
                },
              ]}
              actionButton={
                <button
                  onClick={handleOpenAdd}
                  className="bg-[#8B6914] text-white text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-[#6a5010] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> {t.addPoint}
                </button>
              }
            />

            <div className="overflow-x-auto">
              <DataTable
                columns={columns}
                data={points}
                loading={loading}
                skeletonCount={5}
                emptyMessage="No collection points found."
              />
            </div>

            <div className="p-4 mt-auto">
              <Pagination
                meta={meta}
                onPageChange={(page) => setQueryParams((p) => ({ ...p, page }))}
              />
            </div>
          </div>
        </div>
      </div>

      <CRUDModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPoint ? t.editPointLabel : t.addPointLabel}
        fields={pointFields}
        initialData={editingPoint}
        onSubmit={handleSubmit}
        loading={modalLoading}
      />

      {isViewModalOpen && selectedPoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[75vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-[#f0e8d8] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2">
                <Store className="w-5 h-5 text-[#8B6914]" />{" "}
                {t.viewBtn || "View"}: {selectedPoint.title}
              </h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.generalInfo || "General Information"}
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-[#9a8a7a]">
                      {t.titleLabel || "Title"}:
                    </span>
                    <span className="font-medium text-[#3a2a1a]">
                      {selectedPoint.title}
                    </span>
                    <span className="text-[#9a8a7a]">Statut:</span>
                    <span className="font-bold uppercase text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full w-fit">
                      {selectedPoint.status}
                    </span>
                    <span className="text-[#9a8a7a]">Adresse:</span>
                    <span
                      className="font-medium text-[#3a2a1a] truncate"
                      title={selectedPoint.address}
                    >
                      {selectedPoint.address}
                    </span>
                    <span className="text-[#9a8a7a]">Date:</span>
                    <span className="font-medium text-[#3a2a1a]">
                      {new Date(selectedPoint.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    Partenaire
                  </h3>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#8B6914] text-white flex items-center justify-center font-bold overflow-hidden border border-[#e8ddd0]">
                      {(
                        selectedPoint.partner?.company?.[0] ||
                        selectedPoint.partner?.firstName?.[0] ||
                        "P"
                      ).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[#3a2a1a]">
                        {selectedPoint.partner?.company ||
                          selectedPoint.partner?.firstName}
                      </span>
                      <span className="text-xs text-[#9a8a7a]">
                        {selectedPoint.partner?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-[#f5f0e8] p-4 rounded-xl">
                <h3 className="font-bold text-[#3a2a1a] text-sm">
                  {t.descriptionLabel || "Description"}
                </h3>
                <p className="text-sm text-[#5a4a3a] leading-relaxed whitespace-pre-wrap">
                  {selectedPoint.description || t.noDescription}
                </p>
              </div>

              {selectedPoint.photo?.secure_url && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.photoLabel || "Photo"}
                  </h3>
                  <img
                    src={selectedPoint.photo.secure_url}
                    alt="Point"
                    className="w-full max-h-64 object-cover rounded-lg border border-[#e8ddd0] shadow-sm"
                  />
                </div>
              )}

              {selectedPoint.location && selectedPoint.location.coordinates && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-bold text-[#3a2a1a] border-b pb-2">
                    {t.localisationLabel || "Localization"}
                  </h3>
                  <p className="text-sm text-[#5a4a3a] mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8B6914]" />{" "}
                    {selectedPoint.location.address || selectedPoint.address}
                  </p>
                  <div className="w-full h-64 bg-gray-200 rounded-xl overflow-hidden border border-[#e8ddd0]">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${selectedPoint.location.coordinates[1]},${selectedPoint.location.coordinates[0]}&hl=fr;z=14&output=embed`}
                    ></iframe>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onClose={() =>
          !confirmLoading &&
          setConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
        onConfirm={confirmModal.onConfirm}
        loading={confirmLoading}
      />
    </div>
  );
});

export default CollectionPointsPage;
