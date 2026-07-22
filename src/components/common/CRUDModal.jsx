import React, { useState, useEffect, useRef, useCallback } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import axios from "axios";
import { useLang } from "../../context/LanguageContext";
import { Search, X, Image as ImageIcon, Pencil, MapPin } from "lucide-react";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const libraries = ['places'];

const LocationPicker = ({ lat, lng, onChange }) => {
  const { t } = useLang();

  const isValidCoord = (c) => typeof c === "number" && !isNaN(c);
  const initialPos =
    isValidCoord(lat) && isValidCoord(lng)
      ? { lat, lng }
      : { lat: 48.8566, lng: 2.3522 };

  const [position, setPosition] = useState(initialPos);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    if (isValidCoord(lat) && isValidCoord(lng)) {
      setPosition({ lat, lng });
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
      }
    }
  }, [lat, lng]);

  const onMapClick = async (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosition({ lat, lng });
    try {
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );
      const address = res.data?.display_name || "";
      onChange(lat, lng, address);
    } catch (err) {
      onChange(lat, lng);
    }
  };

  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
      );
      if (response.data && response.data.length > 0) {
        const { lat, lon, display_name } = response.data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPosition({ lat: newLat, lng: newLng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat: newLat, lng: newLng });
          mapRef.current.setZoom(14);
        }
        onChange(newLat, newLng, display_name);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          type="text"
          placeholder={t.searchLocationPlaceholder || "Search location..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleSearch(e);
            }
          }}
          className="w-full bg-[#fcfaf7] border border-[#e8ddd0] rounded-lg pl-8 pr-20 py-1.5 text-[10px] text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all font-medium"
        />
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#9a8a7a]" />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#8B6914] text-white text-[9px] font-bold px-3 py-1 rounded-md hover:bg-[#6a5010] transition-all disabled:opacity-50"
        >
          {isSearching ? "..." : t.findBtn || "Find"}
        </button>
      </div>

      <div className="h-48 w-full rounded-xl overflow-hidden border border-[#e8ddd0] shadow-sm relative z-0">
        {!isLoaded ? (
          <div className="w-full h-full bg-[#f5f0e8] animate-pulse" />
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={position}
            zoom={13}
            onClick={onMapClick}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            {position && <MarkerF position={position} />}
          </GoogleMap>
        )}
        <div className="absolute bottom-2 right-2 z-[400] bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] font-bold text-[#8B6914] border border-[#e8ddd0] shadow-sm uppercase">
          {t.clickToPin || "CLICK TO PIN"}
        </div>
      </div>
    </div>
  );
};

const CustomSelectField = ({
  name,
  value,
  options: initialOptions,
  onChange,
  disabled,
  hasError,
  t,
  required,
  loadOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = React.useRef(null);
  const [options, setOptions] = useState(initialOptions || []);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!loadOptions) {
      setOptions(initialOptions || []);
    }
  }, [initialOptions, loadOptions]);

  React.useEffect(() => {
    if (loadOptions) {
      if (!searchTerm.trim()) {
        setOptions(initialOptions || []);
        return;
      }
      const fetchOptions = async () => {
        setLoading(true);
        try {
          const result = await loadOptions(searchTerm);
          setOptions(result || []);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      const timeoutId = setTimeout(fetchOptions, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, loadOptions]);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search term when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || {
    label: t.selectOption || "Select...",
    value: "",
  };

  const filteredOptions = loadOptions 
    ? options 
    : options.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] transition-all font-bold flex justify-between items-center ${disabled ? "cursor-default opacity-80" : "cursor-pointer hover:border-[#8B6914] focus:border-[#8B6914]"} ${hasError ? "border-red-400 bg-red-50/30" : "border-[#e8ddd0]"}`}
      >
        <span className="truncate pr-4 flex items-center gap-2">
          {selectedOption.logo && (
            <img src={selectedOption.logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#e8ddd0]" />
          )}
          {selectedOption.label}
        </span>
        <svg
          className={`w-4 h-4 text-[#9a8a7a] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-[#e8ddd0] rounded-xl shadow-xl z-[500] max-h-60 flex flex-col overflow-hidden">
          {(options.length > 5 || loadOptions) && (
            <div className="p-2 border-b border-[#e8ddd0] shrink-0 sticky top-0 bg-white z-10">
              <input
                type="text"
                placeholder={t.searchPlaceholder || "Search..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-[#fcfaf7] border border-[#e8ddd0] rounded-lg px-3 py-1.5 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all"
              />
            </div>
          )}
          <div className="overflow-y-auto custom-scrollbar flex-1">
            {!required && !searchTerm && (
              <div
                onClick={() => {
                  onChange({ target: { name, value: "", type: "select" } });
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-xs cursor-pointer transition-colors ${value === "" ? "bg-[#f5f0e8] text-[#8B6914] font-bold" : "text-[#3a2a1a] hover:bg-[#fcfaf7]"}`}
              >
                {t.selectOption || "Select..."}
              </div>
            )}
            {loading ? (
              <div className="px-4 py-2.5 text-xs text-[#9a8a7a] text-center">
                {t.loading || "Loading..."}
              </div>
            ) : loadOptions && !searchTerm.trim() ? (
              <>
                {filteredOptions.length > 0 && filteredOptions.map((opt, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange({
                        target: { name, value: opt.value, type: "select" },
                      });
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 text-xs cursor-pointer transition-colors flex items-center gap-2 ${value === opt.value ? "bg-[#f5f0e8] text-[#8B6914] font-bold" : "text-[#3a2a1a] hover:bg-[#fcfaf7]"}`}
                  >
                    {opt.logo && (
                      <img src={opt.logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#e8ddd0]" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                ))}
                <div className="px-4 py-3 text-xs text-[#9a8a7a] text-center italic border-t border-[#e8ddd0]/50">
                  {t.typeToSearch || "Type to search..."}
                </div>
              </>
            ) : filteredOptions.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-[#9a8a7a] text-center">
                {t.noDataFound || "No options found"}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onChange({
                      target: { name, value: opt.value, type: "select" },
                    });
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 text-xs cursor-pointer transition-colors flex items-center gap-2 ${value === opt.value ? "bg-[#f5f0e8] text-[#8B6914] font-bold" : "text-[#3a2a1a] hover:bg-[#fcfaf7]"}`}
                >
                  {opt.logo && (
                    <img src={opt.logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-[#e8ddd0]" />
                  )}
                  <span className="truncate">{opt.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CRUDModal = ({
  title,
  fields,
  initialData,
  isOpen,
  onClose,
  onSubmit,
  loading,
  isViewOnly,
  fieldErrors: externalErrors,
}) => {
  const { t } = useLang();
  const [formData, setFormData] = useState({});
  const [previews, setPreviews] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});

  // Sync external field errors (from server) into local state
  useEffect(() => {
    if (externalErrors && externalErrors.length > 0) {
      const map = {};
      externalErrors.forEach(({ field, message }) => {
        map[field] = message;
      });
      setFieldErrors(map);
    } else {
      setFieldErrors({});
    }
  }, [externalErrors]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const initial = {};
        const initialPreviews = {};
        fields.forEach((f) => {
          if (initialData[f.name] !== undefined) {
            if (f.type === "date" && initialData[f.name]) {
              try {
                initial[f.name] = new Date(initialData[f.name])
                  .toISOString()
                  .split("T")[0];
              } catch (e) {
                initial[f.name] = initialData[f.name];
              }
            } else {
              initial[f.name] = initialData[f.name];
            }
          }
          // Detect photo/image preview from any common field naming
          if (f.type === "file") {
            const imgUrl = initialData[f.name]?.secure_url;
            if (imgUrl) initialPreviews[f.name] = imgUrl;
          }

          if (f.name === "latitude" && initialData.location?.coordinates?.[1]) {
            initial.latitude = initialData.location.coordinates[1];
          }
          if (
            f.name === "longitude" &&
            initialData.location?.coordinates?.[0]
          ) {
            initial.longitude = initialData.location.coordinates[0];
          }
        });
        setFormData(initial);
        setPreviews(initialPreviews);
      } else {
        // Only reset when opening a fresh "Create" modal (no initialData)
        setFormData({});
        setPreviews({});
      }
      setFieldErrors({});
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    if (isViewOnly) return;
    const { name, value, type, checked, files } = e.target;
    // Clear error for field on change
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (type === "file") {
      const file = files[0];
      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews((prev) => ({ ...prev, [name]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const handleLocationChange = (lat, lng, addressStr) => {
    if (isViewOnly) return;
    setFormData((prev) => {
      const updated = { ...prev, latitude: lat, longitude: lng };
      if (addressStr) {
        updated.address = addressStr;
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }
    onSubmit(formData);
  };

  const hasLocation =
    fields.some((f) => f.name === "latitude") &&
    fields.some((f) => f.name === "longitude");

  // Determine Logo URL
  const logoLive =
    previews["logo"] || previews["profileImage"] || previews["avatar"];
  const logoStatic =
    initialData?.logo?.secure_url ||
    initialData?.profileImage?.secure_url ||
    initialData?.avatar?.secure_url;
  let logoImageUrl = logoLive || logoStatic;

  // Determine Banner URL
  const bannerLive =
    previews["partnerImage"] ||
    previews["coverImage"] ||
    previews["photo"] ||
    previews["image"] ||
    previews["banner"];
  const bannerStatic =
    initialData?.partnerImage?.secure_url ||
    initialData?.coverImage?.secure_url ||
    initialData?.photo?.secure_url ||
    initialData?.image?.secure_url ||
    initialData?.banner?.secure_url ||
    initialData?.images?.[0]?.secure_url;
  let bannerImageUrl = bannerLive || bannerStatic;

  // Generic fallback if we don't have explicit logo/banner fields but have file fields
  const fileFields = fields.filter((f) => f.type === "file");
  const logoField = fileFields.find((f) =>
    ["logo", "profileImage", "avatar"].includes(f.name),
  );
  const bannerField = fileFields.find(
    (f) => !["logo", "profileImage", "avatar"].includes(f.name),
  );

  if (!bannerImageUrl && fileFields.length > 0) {
    if (bannerField) {
      bannerImageUrl =
        previews[bannerField.name] ||
        initialData?.[bannerField.name]?.secure_url;
    }
  }

  if (!logoImageUrl && logoField) {
    logoImageUrl =
      previews[logoField.name] || initialData?.[logoField.name]?.secure_url;
  }

  const entityName =
    formData.company ||
    formData.name ||
    formData.title ||
    (formData.firstName
      ? `${formData.firstName} ${formData.lastName || ""}`.trim()
      : null) ||
    initialData?.company ||
    initialData?.name ||
    initialData?.title ||
    (initialData?.firstName
      ? `${initialData.firstName} ${initialData.lastName || ""}`.trim()
      : null) ||
    "Details";

  const showCinematic = bannerImageUrl || logoImageUrl || fileFields.length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto border border-[#e8ddd0]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex justify-between items-center bg-white relative z-10">
          <h2 className="text-lg font-black text-[#3a2a1a] tracking-tight">
            {isViewOnly
              ? `View ${title.replace("Edit ", "").replace("Add ", "")}`
              : title}
          </h2>
          <button
            onClick={onClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-all p-1.5 hover:bg-[#f5f0e8] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cinematic Image Preview — shows for any record with an image or file fields */}
        {showCinematic ? (
          <div
            className={`w-full aspect-[21/9] sm:aspect-[21/7] md:aspect-[21/6] ${bannerImageUrl ? "bg-[#f5f0e8]" : "bg-gradient-to-r from-[#3a2a1a] to-[#8B6914]"} border-b border-[#e8ddd0] relative overflow-hidden group`}
          >
            {bannerImageUrl && (
              <img
                src={bannerImageUrl}
                alt="Preview"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onLoad={(e) => e.target.classList.add("opacity-100")}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-[#3a2a1a]/90 via-[#3a2a1a]/30 to-transparent"></div>

            {bannerField && !isViewOnly && (
              <div className="absolute top-4 right-4 z-20">
                <label className="w-8 h-8 rounded-full bg-white/30 hover:bg-white/50 backdrop-blur flex items-center justify-center text-white cursor-pointer transition-colors border border-white/40 shadow-sm relative group/btn">
                  <Pencil className="w-4 h-4" />
                  <span className="absolute top-full mt-2 right-0 whitespace-nowrap bg-[#3a2a1a] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity z-50">
                    {bannerImageUrl
                      ? t.editCover || "Edit Cover"
                      : t.addCover || "Add Cover"}
                  </span>
                  <input
                    type="file"
                    name={bannerField.name}
                    onChange={handleChange}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
              </div>
            )}

            <div className="absolute bottom-4 left-4 sm:left-6 flex items-end gap-4">
              {(logoImageUrl || logoField) && (
                <div className="relative z-20 shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-4 border-white bg-white shadow-sm overflow-hidden relative">
                    {logoImageUrl ? (
                      <img
                        src={logoImageUrl}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#fcfaf7] flex items-center justify-center text-2xl font-black text-[#8B6914]">
                        {entityName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  {logoField && !isViewOnly && (
                    <label className="absolute -bottom-1.5 -right-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-[#8B6914] hover:bg-[#6a5010] text-white rounded-full flex items-center justify-center cursor-pointer shadow-md border-2 border-white transition-colors group/editbtn">
                      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#3a2a1a] text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg opacity-0 pointer-events-none group-hover/editbtn:opacity-100 transition-opacity z-[100]">
                        {t.editPhoto || "Edit Photo"}
                      </span>
                      <input
                        type="file"
                        name={logoField.name}
                        onChange={handleChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
              <div className="flex flex-col mb-1 sm:mb-2 relative z-10">
                <span className="text-[9px] font-black text-white/90 uppercase tracking-[0.2em] mb-1">
                  {t.visualPreview || "Visual Preview"}
                </span>
                <span className="text-white font-black text-lg sm:text-2xl tracking-tight leading-none truncate max-w-[280px] drop-shadow-md">
                  {entityName !== "Details"
                    ? entityName
                    : t.newRecord || "New Record"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          entityName !== "Details" && (
            // Responsive fallback banner
            <div className="w-full h-auto py-6 sm:h-[90px] bg-gradient-to-r from-[#3a2a1a] to-[#8B6914] border-b border-[#e8ddd0] relative overflow-hidden flex items-center px-4 sm:px-6 gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xl sm:text-2xl font-black text-white shrink-0">
                {entityName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-black text-white/70 uppercase tracking-[0.2em] mb-0.5">
                  {t.informationsLabel || "Details"}
                </span>
                <span className="text-white font-black text-lg sm:text-xl tracking-tight leading-none truncate">
                  {entityName}
                </span>
              </div>
            </div>
          )
        )}

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar pb-2">
            {fields.map((field) => {
              if (
                field.name === "latitude" ||
                field.name === "longitude" ||
                field.type === "file"
              )
                return null;

              if (field.dependsOn) {
                const { field: depField, value: depValue } = field.dependsOn;
                if (formData[depField] !== depValue) return null;
              }

              const hasError = !!fieldErrors[field.name];
              return (
                <div
                  key={field.name}
                  className={`flex flex-col gap-1.5 ${field.type === "textarea" || field.type === "file" || field.fullWidth ? "md:col-span-2" : ""}`}
                >
                  <label
                    className={`text-[9px] font-black tracking-wider uppercase ml-1 opacity-80 ${hasError ? "text-red-500" : "text-[#9a8a7a]"}`}
                  >
                    {field.label}
                    {field.required && (
                      <span className="text-red-400 ml-0.5">*</span>
                    )}
                  </label>

                  {field.type === "select" ? (
                    <CustomSelectField
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      options={field.options}
                      disabled={field.disabled || isViewOnly}
                      hasError={hasError}
                      t={t}
                      required={field.required}
                      loadOptions={field.loadOptions}
                    />
                  ) : field.type === "textarea" ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || isViewOnly}
                      rows="3"
                      className={`bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all resize-none font-medium disabled:opacity-80 ${hasError ? "border-red-400 bg-red-50/30" : "border-[#e8ddd0]"}`}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  ) : field.type === "file" ? (
                    <div className="flex flex-col gap-1">
                      <div
                        className={`relative flex items-center gap-4 bg-[#fcfaf7] border border-dashed rounded-xl p-4 transition-all ${hasError ? "border-red-400 bg-red-50/30" : "border-[#e8ddd0]"} ${isViewOnly ? "cursor-default" : "hover:border-[#8B6914] cursor-pointer group"}`}
                      >
                        {!isViewOnly && (
                          <input
                            type="file"
                            name={field.name}
                            onChange={handleChange}
                            required={field.required && !initialData}
                            disabled={field.disabled}
                            accept="image/*"
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                        )}
                        <div
                          className={`w-10 h-10 bg-[#f5f0e8] rounded-lg flex items-center justify-center text-[#8B6914] transition-all ${!isViewOnly && "group-hover:bg-[#8B6914] group-hover:text-white"}`}
                        >
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs font-black text-[#3a2a1a] truncate max-w-[200px]">
                            {formData[field.name]?.name ||
                              (initialData
                                ? t.existingPhoto || "Existing Photo"
                                : t.uploadPhoto || "Upload photo")}
                          </p>
                          <p className="text-[9px] text-[#9a8a7a]">
                            {isViewOnly
                              ? t.viewOnly || "View only mode"
                              : t.dragDrop || "Click or drag & drop"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || isViewOnly}
                      className={`bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all font-bold placeholder:font-medium placeholder:opacity-50 disabled:opacity-80 ${hasError ? "border-red-400 bg-red-50/30" : "border-[#e8ddd0]"}`}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  )}
                  {hasError && (
                    <p className="text-[10px] text-red-500 font-semibold ml-1 flex items-center gap-1">
                      <span>⚠</span> {fieldErrors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}

            {hasLocation && (
              <div className="md:col-span-2 flex flex-col gap-2 mt-2">
                <label className="text-[9px] font-black text-[#9a8a7a] tracking-wider uppercase ml-1 flex justify-between items-center">
                  <span>
                    {isViewOnly
                      ? t.locationDetails || "Location Details"
                      : t.mapLocation || "Map Location"}
                  </span>
                  <span className="text-[9px] font-bold text-[#8B6914] flex items-center gap-1 bg-[#fcfaf7] px-2 py-1 rounded border border-[#e8ddd0]">
                    <MapPin className="w-3 h-3 text-[#8B6914]" />
                    {typeof formData.latitude === "number"
                      ? formData.latitude.toFixed(4)
                      : "N/A"}
                    ,{" "}
                    {typeof formData.longitude === "number"
                      ? formData.longitude.toFixed(4)
                      : "N/A"}
                  </span>
                </label>
                <LocationPicker
                  lat={formData.latitude}
                  lng={formData.longitude}
                  onChange={handleLocationChange}
                />
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-[#f0e8d8]">
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border border-[#e8ddd0] text-[#3a2a1a] text-xs font-black transition-all active:scale-[0.98] ${isViewOnly ? "w-full py-3 bg-[#fcfaf7]" : "flex-1 py-2.5 hover:bg-[#fcfaf7]"}`}
            >
              {isViewOnly
                ? t.closeView || "Close View"
                : t.discardBtn || "Discard"}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2.5 rounded-xl bg-[#8B6914] text-white text-xs font-black hover:bg-[#6a5010] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#8B6914]/20 active:scale-[0.98]"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {initialData
                  ? t.saveChanges || "Save Changes"
                  : t.createBtn || "Create"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CRUDModal;
