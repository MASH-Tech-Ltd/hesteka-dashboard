import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
  InfoWindowF,
  MarkerClusterer,
  Autocomplete,
} from "@react-google-maps/api";
import api from "../utils/api";
import { useLang } from "../context/LanguageContext";
import { Loader2, Users, Search, MapPin } from "lucide-react";

const libraries = ["places"];
const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "0.5rem",
};

const defaultCenter = { lat: 46.2276, lng: 2.2137 }; // France coordinates

const getUserCategory = (user) => {
  if (user.isOnline) {
    return { label: "Active", color: "#22c55e", shape: "circle" }; // Green
  }

  return { label: "Offline", color: "#3b82f6", shape: "circle" }; // Blue
};

// Helper to generate a custom map pin with color and shape
const generatePinIcon = (color, shape = "circle") => {
  return new Promise((resolve) => {
    if (!window.google) return resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ffffff";

    if (shape === "star") {
      // Draw a 5-pointed star
      const cx = 20;
      const cy = 20;
      const spikes = 5;
      const outerRadius = 14;
      const innerRadius = 7;
      let rot = (Math.PI / 2) * 3;
      let x = cx;
      let y = cy;
      const step = Math.PI / spikes;

      ctx.beginPath();
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.lineTo(cx, cy - outerRadius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Draw circle
      ctx.beginPath();
      ctx.arc(20, 20, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    resolve({
      url: canvas.toDataURL(),
      scaledSize: new window.google.maps.Size(32, 32),
      anchor: new window.google.maps.Point(16, 16),
    });
  });
};

const LiveMapPage = () => {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markerIcons, setMarkerIcons] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [mapType, setMapType] = useState("roadmap");
  const mapRef = useRef(null);

  // Search state
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await api.get("/user/get-all-locations");
        if (res.data.status === "ok") {
          // Filter valid coordinates [lng, lat]
          const validUsers = res.data.data.filter(
            (u) =>
              u.location &&
              u.location.coordinates &&
              u.location.coordinates.length === 2,
          );
          setUsers(validUsers);
        }
      } catch (err) {
        console.error("Failed to fetch user locations", err);
        setError("Failed to load map data");
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!isLoaded || users.length === 0) return;

    // Generate icons for all needed colors and shapes
    const categories = [
      { color: "#22c55e", shape: "circle" },
      { color: "#3b82f6", shape: "circle" },
    ];
    categories.forEach((cat) => {
      const key = `${cat.color}_${cat.shape}`;
      if (!markerIcons[key]) {
        generatePinIcon(cat.color, cat.shape).then((icon) => {
          if (icon) {
            setMarkerIcons((prev) => ({ ...prev, [key]: icon }));
          }
        });
      }
    });
  }, [users, isLoaded]);

  const onLoadAutocomplete = (autoC) => {
    setAutocomplete(autoC);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      // Handle cases where the user types text without selecting a valid option from the dropdown menu
      if (!place.geometry || !place.geometry.location) {
        console.warn("No valid location selected from dropdown.");
        setSelectedLocation(null);
        return;
      }

      // Extract and handle the selected place's details
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      
      const locationData = {
        formattedAddress: place.formatted_address,
        lat: lat,
        lng: lng,
        placeId: place.place_id
      };

      // Store the selected location data in the component's state
      setSelectedLocation(locationData);
      
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        mapRef.current.setZoom(14); // Zoom in closer to the searched place
      }
    }
  };

  const onMapClick = (e) => {
    setSelectedUser(null);
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === "OK" && results[0]) {
          const formattedAddress = results[0].formatted_address;
          setSelectedLocation({
            formattedAddress,
            lat,
            lng,
            placeId: results[0].place_id
          });
          const input = document.getElementById('live-map-search-input');
          if (input) input.value = formattedAddress;
        } else {
          setSelectedLocation({
            formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
            placeId: null
          });
          const input = document.getElementById('live-map-search-input');
          if (input) input.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      });
    }
  };

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  const activeCount = users.filter((u) => u.isOnline).length;
  const offlineCount = users.filter((u) => !u.isOnline).length;

  // Ensure dropdown matches input width perfectly via ResizeObserver
  useEffect(() => {
    if (!isLoaded) return;
    
    const updatePacWidth = () => {
      const input = document.getElementById('live-map-search-input');
      const pacs = document.querySelectorAll('.pac-container');
      if (pacs.length > 0 && input) {
        const width = input.offsetWidth;
        pacs.forEach(pac => {
          pac.style.setProperty('min-width', `${width}px`, 'important');
          pac.style.setProperty('width', `${width}px`, 'important');
        });
      }
    };
    
    let observer;
    
    const initWidthSync = () => {
      const input = document.getElementById('live-map-search-input');
      if (input) {
        observer = new ResizeObserver(updatePacWidth);
        observer.observe(input);
        input.addEventListener('focus', updatePacWidth);
        input.addEventListener('input', updatePacWidth);
        window.addEventListener('resize', updatePacWidth);
      } else {
        setTimeout(initWidthSync, 100);
      }
    };
    
    initWidthSync();

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', updatePacWidth);
      const input = document.getElementById('live-map-search-input');
      if (input) {
        input.removeEventListener('focus', updatePacWidth);
        input.removeEventListener('input', updatePacWidth);
      }
    };
  }, [isLoaded]);

  // MarkerClusterer options
  const clusterOptions = {
    imagePath:
      "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m",
    gridSize: 50,
    maxZoom: 15,
  };

  return (
    <div className="p-4 flex flex-col gap-4 h-[calc(100vh-90px)]">
      <style>{`
        .pac-container {
          border-radius: 0.75rem !important;
          border: 1px solid #e8ddd0 !important;
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
          margin-top: 8px !important;
          font-family: inherit !important;
          box-sizing: border-box !important;
          padding-bottom: 0 !important;
        }

        /* Hide Powered by Google logo */
        .pac-container::after {
          display: none !important;
          content: none !important;
        }
        
        .pac-item {
          padding: 12px 16px !important;
          cursor: pointer !important;
          border-top: none !important;
          border-bottom: 1px solid #e8ddd0 !important;
          color: #9a8a7a !important;
          font-size: 13px !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
        }

        .pac-item:last-of-type {
          border-bottom: none !important;
        }
        
        .pac-item:hover, .pac-item-selected {
          background-color: #fcfaf7 !important;
        }
        
        .pac-item-query {
          color: #3a2a1a !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          padding-right: 6px !important;
        }
        
        .pac-icon {
          display: none !important;
        }
        
        .pac-item::before {
          content: '';
          display: inline-block;
          width: 18px;
          height: 18px;
          min-width: 18px;
          margin-right: 12px;
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%238B6914" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');
          background-repeat: no-repeat;
          background-position: center;
        }
      `}</style>
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0 gap-4">
        <h1 className="text-xl font-bold text-[#3a2a1a] flex items-center gap-2 shrink-0">
          <Users className="w-6 h-6 text-[#8B6914]" />
          {t.liveMap || "Live Map"}
        </h1>
        
        {/* Search Field */}
        <div className="flex-1 max-w-2xl relative z-[200]">
          {isLoaded && (
            <div className="relative">
              <Autocomplete
                onLoad={onLoadAutocomplete}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  id="live-map-search-input"
                  type="text"
                  placeholder={t.searchLocationPlaceholder || "Search for an address or city..."}
                  className="w-full bg-white border border-[#e8ddd0] rounded-xl pl-10 pr-4 py-2 text-sm text-[#3a2a1a] outline-none focus:ring-2 focus:ring-[#8B6914]/20 focus:border-[#8B6914] transition-all shadow-sm"
                />
              </Autocomplete>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a8a7a] pointer-events-none" />
            </div>
          )}
        </div>

        <div className="bg-white px-4 py-2 rounded-lg border border-[#e8ddd0] shadow-sm flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <p className="text-xs font-bold text-[#8B6914] uppercase tracking-widest">
            {users.length} Mapped Users
          </p>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-[#e8ddd0] flex-1 relative overflow-hidden">
        {loading || !isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
            <Loader2 className="w-8 h-8 text-[#8B6914] animate-spin" />
          </div>
        ) : loadError || error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500 z-10">
            {loadError ? "Error loading maps" : error}
          </div>
        ) : (
          <>
            {/* Custom Map Type Toggle */}
            <button
              onClick={() =>
                setMapType((prev) =>
                  prev === "roadmap" ? "hybrid" : "roadmap",
                )
              }
              className="absolute top-4 left-4 z-[10] w-10 h-10 bg-white rounded-lg shadow-lg border border-[#e8ddd0] flex flex-col items-center justify-center overflow-hidden hover:border-[#8B6914] transition-all group"
              title={
                mapType === "roadmap" ? "Switch to Satellite" : "Switch to Map"
              }
            >
              {mapType === "roadmap" ? (
                <div className="w-full h-full bg-[#3a2a1a] flex flex-col items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white mb-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  <span className="text-[7px] font-bold text-white leading-none">
                    SAT
                  </span>
                </div>
              ) : (
                <div className="w-full h-full bg-[#f5f0e8] flex flex-col items-center justify-center">
                  <svg
                    className="w-4 h-4 text-[#8B6914] mb-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    ></path>
                  </svg>
                  <span className="text-[7px] font-bold text-[#8B6914] leading-none">
                    MAP
                  </span>
                </div>
              )}
            </button>

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-4 z-[10] bg-white p-3 rounded-xl shadow-lg border border-[#e8ddd0]">
              <h3 className="text-[10px] font-bold text-[#3a2a1a] mb-2 uppercase tracking-wider">
                User Status Legend
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white shadow-sm ring-1 ring-[#22c55e]/20"></span>
                  <span className="text-[11px] text-[#5a4a3a] font-medium">
                    Active ({activeCount})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3b82f6] border-2 border-white shadow-sm ring-1 ring-[#3b82f6]/20"></span>
                  <span className="text-[11px] text-[#5a4a3a] font-medium">
                    Offline ({offlineCount})
                  </span>
                </div>
              </div>
            </div>

            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter} // France coordinates
              zoom={6}
              mapTypeId={mapType}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={onMapClick}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
              }}
            >
              <MarkerClusterer options={clusterOptions}>
                {(clusterer) =>
                  users.map((user) => {
                    const category = getUserCategory(user);
                    const iconKey = `${category.color}_${category.shape}`;
                    return (
                      <MarkerF
                        key={user._id}
                        position={{
                          lat: user.location.coordinates[1],
                          lng: user.location.coordinates[0],
                        }}
                        icon={markerIcons[iconKey]}
                        clusterer={clusterer}
                        onClick={() => setSelectedUser(user)}
                        onMouseOver={() => setSelectedUser(user)}
                        onMouseOut={() => setSelectedUser(null)}
                      />
                    );
                  })
                }
              </MarkerClusterer>

              {/* Pin for the searched location */}
              {selectedLocation && (
                <MarkerF
                  position={{
                    lat: selectedLocation.lat,
                    lng: selectedLocation.lng,
                  }}
                />
              )}

              {selectedUser && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none bg-black/5 backdrop-blur-[1px]">
                  <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-[#e8ddd0] min-w-[280px] pointer-events-none transform transition-all relative">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-[#f5f0e8] rounded-full mx-auto mb-4 overflow-hidden flex items-center justify-center text-[#8B6914] text-2xl font-bold border-2 border-[#e8ddd0] shadow-sm">
                        {selectedUser.profileImage?.secure_url ? (
                          <img
                            src={selectedUser.profileImage.secure_url}
                            alt={selectedUser.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          selectedUser.firstName?.charAt(0) || "U"
                        )}
                      </div>
                      <p className="font-bold text-[#3a2a1a] text-xl leading-tight">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2 mb-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                          style={{
                            backgroundColor:
                              getUserCategory(selectedUser).color,
                          }}
                        ></span>
                        <span className="text-[11px] text-[#9a8a7a] font-bold uppercase tracking-wider">
                          {getUserCategory(selectedUser).label}
                        </span>
                      </div>

                      <p className="text-sm text-gray-500 mt-1.5 truncate max-w-[240px] mx-auto pb-4">
                        {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </GoogleMap>
          </>
        )}
      </div>
    </div>
  );
};

export default LiveMapPage;
