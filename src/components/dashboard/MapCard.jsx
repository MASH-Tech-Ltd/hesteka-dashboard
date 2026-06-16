import { useLang } from "../../context/LanguageContext";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  MarkerF,
  useJsApiLoader,
} from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const libraries = ['places'];

// Helper to generate a custom map pin with an image inside
const generatePinIcon = (imgUrl) => {
  return new Promise((resolve) => {
    if (!window.google) return resolve(null);
    const canvas = document.createElement('canvas');
    canvas.width = 60;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    
    // Draw pin shape
    ctx.fillStyle = '#dc2626'; // red-600
    ctx.beginPath();
    ctx.arc(30, 30, 30, Math.PI, 0, false);
    ctx.lineTo(60, 30);
    ctx.bezierCurveTo(60, 45, 30, 80, 30, 80);
    ctx.bezierCurveTo(30, 80, 0, 45, 0, 30);
    ctx.fill();

    // Draw white circle inside
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(30, 30, 24, 0, Math.PI * 2);
    ctx.fill();

    if (!imgUrl) {
      return resolve({
        url: canvas.toDataURL(),
        scaledSize: new window.google.maps.Size(40, 53),
        anchor: new window.google.maps.Point(20, 53)
      });
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(30, 30, 22, 0, Math.PI * 2);
      ctx.clip();
      
      const scale = Math.max(44 / img.width, 44 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = 30 - w / 2;
      const y = 30 - h / 2;
      
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      
      resolve({
        url: canvas.toDataURL(),
        scaledSize: new window.google.maps.Size(40, 53),
        anchor: new window.google.maps.Point(20, 53)
      });
    };
    img.onerror = () => {
      resolve({
        url: canvas.toDataURL(),
        scaledSize: new window.google.maps.Size(40, 53),
        anchor: new window.google.maps.Point(20, 53)
      });
    };
    img.src = imgUrl;
  });
};

export default function MapCard({ data, total }) {
  const { t } = useLang();
  const [activeIndex, setActiveIndex] = useState(0);
  const [markerIcons, setMarkerIcons] = useState({});
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Filter out invalid coordinates (0,0)
  const validReports = (data || []).filter(
    (r) => r.lat && r.lng && r.lat !== 0 && r.lng !== 0,
  );

  useEffect(() => {
    if (!isLoaded) return;
    
    // Generate icons for all valid reports
    validReports.forEach((report, idx) => {
      const imgUrl = report.image || report.photo || report.images?.[0]?.secure_url || report.avatar || report.imageUrl || report.image_url;
      const id = report.id || report._id || idx;
      
      if (!markerIcons[id]) {
        generatePinIcon(imgUrl).then(icon => {
          if (icon) {
            setMarkerIcons(prev => ({ ...prev, [id]: icon }));
          }
        });
      }
    });
  }, [validReports, isLoaded]);

  // Cycle through reports every 10 seconds
  useEffect(() => {
    if (validReports.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validReports.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [validReports.length]);

  const currentReport = validReports[activeIndex] || null;
  const center = currentReport
    ? { lat: currentReport.lat, lng: currentReport.lng }
    : { lat: 46.2276, lng: 2.2137 }; // France coordinates
  
  const defaultZoom = currentReport ? 14 : 5;

  const [mapType, setMapType] = useState('roadmap');

  const onLoad = useCallback(function callback(map) {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(function callback(map) {
    mapRef.current = null;
  }, []);

  if (loadError) {
    return (
      <div className="bg-white rounded-xl p-4 border border-[#e8ddd0] h-[350px] text-red-500">
        Error loading maps
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-white rounded-xl p-4 border border-[#e8ddd0] h-[350px] animate-pulse">
        <div className="bg-[#f5f0e8] h-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-[#e8ddd0] relative overflow-hidden">
      {/* Left Status Bar Indicator */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${currentReport?.type === "lost" ? "bg-red-500" : "bg-blue-500"}`}
      />

      {/* Header with status label and animal info */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-red-50 p-1.5 rounded-lg">
            <span className="text-red-500 text-lg leading-none">📍</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                {currentReport?.type || "Lost"} Report
              </span>
              <h2 className="text-[14px] font-bold text-[#3a2a1a] leading-tight transition-all duration-500">
                {currentReport?.title || "Animal"}
              </h2>
            </div>
            <p className="text-[11px] text-[#9a8a7a] font-medium leading-tight mt-0.5 ml-0.5">
              {currentReport?.address || "Location unknown"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {validReports.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeIndex ? "bg-[#8B6914] scale-125" : "bg-gray-300"}`}
            />
          ))}
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden h-[350px] border border-[#e8ddd0] z-[0]">
        
        {/* Custom Map Type Toggle */}
        <button
          onClick={() => setMapType(prev => prev === 'roadmap' ? 'satellite' : 'roadmap')}
          className="absolute bottom-6 left-2 z-[10] w-9 h-9 bg-white rounded-lg shadow-md border border-[#e8ddd0] flex flex-col items-center justify-center overflow-hidden hover:border-[#8B6914] transition-all group"
          title={mapType === 'roadmap' ? 'Switch to Satellite' : 'Switch to Map'}
        >
          {mapType === 'roadmap' ? (
            <div className="w-full h-full bg-[#3a2a1a] flex flex-col items-center justify-center">
              <svg className="w-4 h-4 text-white mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-[7px] font-bold text-white leading-none">SAT</span>
            </div>
          ) : (
            <div className="w-full h-full bg-[#f5f0e8] flex flex-col items-center justify-center">
              <svg className="w-4 h-4 text-[#8B6914] mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
              <span className="text-[7px] font-bold text-[#8B6914] leading-none">MAP</span>
            </div>
          )}
        </button>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={defaultZoom}
          mapTypeId={mapType}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
              position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM
            },
            mapTypeControl: false,
            scrollwheel: false,
          }}
        >
          {validReports.map((p, idx) => {
            const id = p.id || p._id || idx;
            return (
              <MarkerF
                key={id}
                position={{ lat: p.lat, lng: p.lng }}
                opacity={idx === activeIndex ? 1 : 0.6}
                icon={markerIcons[id]}
              />
            );
          })}
        </GoogleMap>
      </div>
    </div>
  );
}
