import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { useLang } from '../../context/LanguageContext';
import { Search, X, Image as ImageIcon } from 'lucide-react';

// Fix for default marker icon in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component to fly to search results
const MapFlyTo = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const LocationPicker = ({ lat, lng, onChange }) => {
  const { t } = useLang();
  const [position, setPosition] = useState(lat && lng ? [lat, lng] : [48.8566, 2.3522]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (lat && lng) {
      setPosition([lat, lng]);
    }
  }, [lat, lng]);

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onChange(lat, lng);
      },
    });
    return position ? <Marker position={position} /> : null;
  };

  const handleSearch = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPosition([newLat, newLng]);
        onChange(newLat, newLng);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input 
          type="text"
          placeholder={t.searchLocationPlaceholder || "Search location..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
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
          {isSearching ? "..." : (t.findBtn || "Find")}
        </button>
      </div>

      <div className="h-48 w-full rounded-xl overflow-hidden border border-[#e8ddd0] shadow-sm relative z-0">
        <MapContainer center={position} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapEvents />
          <MapFlyTo center={position} />
        </MapContainer>
        <div className="absolute bottom-2 right-2 z-[400] bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] font-bold text-[#8B6914] border border-[#e8ddd0] shadow-sm uppercase">
          {t.clickToPin || "CLICK TO PIN"}
        </div>
      </div>
    </div>
  );
};

const CRUDModal = ({ title, fields, initialData, isOpen, onClose, onSubmit, loading, isViewOnly, fieldErrors: externalErrors }) => {
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
        fields.forEach(f => {
          if (initialData[f.name] !== undefined) {
            initial[f.name] = initialData[f.name];
          }
          // Detect photo/image preview from any common field naming
          if (f.type === 'file') {
            const imgUrl =
              initialData.photo?.secure_url ||
              initialData.image?.secure_url ||
              initialData.profileImage?.secure_url ||
              initialData[f.name]?.secure_url;
            if (imgUrl) initialPreviews[f.name] = imgUrl;
          }

          if (f.name === 'latitude' && initialData.location?.coordinates?.[1]) {
            initial.latitude = initialData.location.coordinates[1];
          }
          if (f.name === 'longitude' && initialData.location?.coordinates?.[0]) {
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
    setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    if (type === 'file') {
      const file = files[0];
      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));
      
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => ({ ...prev, [name]: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleLocationChange = (lat, lng) => {
    if (isViewOnly) return;
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isViewOnly) {
      onClose();
      return;
    }
    onSubmit(formData);
  };

  const fileField = fields.find(f => f.type === 'file');
  const hasLocation = fields.some(f => f.name === 'latitude') && fields.some(f => f.name === 'longitude');

  // Resolve best available image from initialData or live file preview
  const liveFilePreview = fileField ? previews[fileField.name] : null;
  const staticImageUrl =
    initialData?.partnerImage?.secure_url ||
    initialData?.logo?.secure_url ||
    initialData?.profileImage?.secure_url ||
    initialData?.photo?.secure_url ||
    initialData?.image?.secure_url ||
    initialData?.images?.[0]?.secure_url ||
    null;
  const bannerImageUrl = liveFilePreview || staticImageUrl;
  const entityName =
    formData.name ||
    formData.title ||
    (formData.firstName ? `${formData.firstName} ${formData.lastName || ''}`.trim() : null) ||
    initialData?.name ||
    initialData?.title ||
    (initialData?.firstName ? `${initialData.firstName} ${initialData.lastName || ''}`.trim() : null) ||
    "Details";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto border border-[#e8ddd0]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex justify-between items-center bg-white relative z-10">
          <h2 className="text-lg font-black text-[#3a2a1a] tracking-tight">{isViewOnly ? `View ${title.replace('Edit ', '').replace('Add ', '')}` : title}</h2>
          <button 
            onClick={onClose}
            className="text-[#9a8a7a] hover:text-[#3a2a1a] transition-all p-1.5 hover:bg-[#f5f0e8] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cinematic Image Preview — shows for any record with an image */}
       {bannerImageUrl ? (
  <div className="w-full aspect-[21/9] sm:aspect-[21/7] md:aspect-[21/6] bg-[#f5f0e8] border-b border-[#e8ddd0] relative overflow-hidden group">
    {/* Optimized Image with Loading State */}
    <img
      src={bannerImageUrl}
      alt="Preview"
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      onLoad={(e) => e.target.classList.add('opacity-100')}
    />
    
    {/* Enhanced Gradient Overlay for text readability on bright images */}
    <div className="absolute inset-0 bg-gradient-to-t from-[#3a2a1a]/80 via-[#3a2a1a]/20 to-transparent"></div>
    
    <div className="absolute bottom-4 left-4 sm:left-6 flex flex-col">
      <span className="text-[9px] font-black text-white/90 uppercase tracking-[0.2em] mb-1">
        {t.visualPreview || "Visual Preview"}
      </span>
      <span className="text-white font-black text-lg sm:text-xl tracking-tight leading-none truncate max-w-[280px]">
        {entityName}
      </span>
    </div>
  </div>
) : entityName !== "Details" && (
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
)}
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[45vh] overflow-y-auto pr-3 custom-scrollbar pb-2">
            {fields.map((field) => {
              if (field.name === 'latitude' || field.name === 'longitude') return null;

              const hasError = !!fieldErrors[field.name];
              return (
                <div key={field.name} className={`flex flex-col gap-1.5 ${field.type === 'textarea' || field.type === 'file' ? 'md:col-span-2' : ''}`}>
                  <label className={`text-[9px] font-black tracking-wider uppercase ml-1 opacity-80 ${hasError ? 'text-red-500' : 'text-[#9a8a7a]'}`}>
                    {field.label}{field.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || isViewOnly}
                      className={`bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all font-bold disabled:opacity-80 ${hasError ? 'border-red-400 bg-red-50/30' : 'border-[#e8ddd0]'}`}
                    >
                      <option value="">{t.selectOption || "Select..."}</option>
                      {field.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || isViewOnly}
                      rows="3"
                      className={`bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all resize-none font-medium disabled:opacity-80 ${hasError ? 'border-red-400 bg-red-50/30' : 'border-[#e8ddd0]'}`}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  ) : field.type === 'file' ? (
                    <div className="flex flex-col gap-1">
                      <div className={`relative flex items-center gap-4 bg-[#fcfaf7] border border-dashed rounded-xl p-4 transition-all ${hasError ? 'border-red-400 bg-red-50/30' : 'border-[#e8ddd0]'} ${isViewOnly ? 'cursor-default' : 'hover:border-[#8B6914] cursor-pointer group'}`}>
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
                        <div className={`w-10 h-10 bg-[#f5f0e8] rounded-lg flex items-center justify-center text-[#8B6914] transition-all ${!isViewOnly && 'group-hover:bg-[#8B6914] group-hover:text-white'}`}>
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <p className="text-xs font-black text-[#3a2a1a] truncate max-w-[200px]">{formData[field.name]?.name || (initialData ? (t.existingPhoto || "Existing Photo") : (t.uploadPhoto || "Upload photo"))}</p>
                          <p className="text-[9px] text-[#9a8a7a]">{isViewOnly ? (t.viewOnly || "View only mode") : (t.dragDrop || "Click or drag & drop")}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={handleChange}
                      required={field.required}
                      disabled={field.disabled || isViewOnly}
                      className={`bg-[#fcfaf7] border rounded-xl px-4 py-2 text-xs text-[#3a2a1a] outline-none focus:border-[#8B6914] transition-all font-bold placeholder:font-medium placeholder:opacity-50 disabled:opacity-80 ${hasError ? 'border-red-400 bg-red-50/30' : 'border-[#e8ddd0]'}`}
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
                  <span>{isViewOnly ? (t.locationDetails || "Location Details") : (t.mapLocation || "Map Location")}</span>
                  <span className="text-[9px] font-bold text-[#8B6914]">
                    {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
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
              className={`rounded-xl border border-[#e8ddd0] text-[#3a2a1a] text-xs font-black transition-all active:scale-[0.98] ${isViewOnly ? 'w-full py-3 bg-[#fcfaf7]' : 'flex-1 py-2.5 hover:bg-[#fcfaf7]'}`}
            >
              {isViewOnly ? (t.closeView || 'Close View') : (t.discardBtn || 'Discard')}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2.5 rounded-xl bg-[#8B6914] text-white text-xs font-black hover:bg-[#6a5010] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#8B6914]/20 active:scale-[0.98]"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {initialData ? (t.saveChanges || 'Save Changes') : (t.createBtn || 'Create')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CRUDModal;
