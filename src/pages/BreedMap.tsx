import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { supabase } from "../lib/supabase";
import L, { DivIcon } from "leaflet";
import { LoaderCircle } from "lucide-react";
import "leaflet.heat"; // npm install leaflet.heat

// --- Types ---
interface ConfirmedBreed {
  id: string;
  lat: number;
  lng: number;
  breed: string;
  image_url: string;
}
type HeatmapData = [number, number, number]; // [lat, lng, intensity]

// --- Heatmap Layer Component ---
interface HeatLayerProps {
  points: HeatmapData[];
  options?: any;
}
const HeatLayer = ({ points, options }: HeatLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const layer = (L as any).heatLayer(points, options);
    layer.addTo(map);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, options]);

  return null;
};

// --- Main Component ---
export default function BreedMapPage() {
  const [breedsData, setBreedsData] = useState<ConfirmedBreed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [allBreeds, setAllBreeds] = useState<string[]>(["All"]);
  const [selectedBreed, setSelectedBreed] = useState("All");
  const [viewMode, setViewMode] = useState<"points" | "heatmap">("points");

  // --- Fetch confirmed breeds ---
  useEffect(() => {
    const fetchConfirmedBreeds = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("confirmed_cattle_breeds")
        .select(`
          id,
          image_url,
          scan_id,
          breeds ( name ),
          cattle_scans ( location )
        `);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      const processed: ConfirmedBreed[] = [];
      const breedSet = new Set<string>();

      data?.forEach((row: any) => {
        const loc = row.cattle_scans?.location;
        if (!loc) return;

        // Normalize location (supports {latitude, longitude} OR GeoJSON Point)

        if (!loc.latitude || !loc.longitude) return;

        const breedName = row.breeds?.name;
        if (!breedName) return;
        breedSet.add(breedName);

        processed.push({
          id: row.id,
          lat: loc.latitude,
          lng: loc.longitude,
          breed: breedName,
          image_url: row.image_url,
        });
      });

      setBreedsData(processed);
      setAllBreeds(["All", ...Array.from(breedSet).sort()]);
      setLoading(false);
    };

    fetchConfirmedBreeds();
  }, []);

  // --- Filtered data ---
  const filteredData =
    selectedBreed === "All"
      ? breedsData
      : breedsData.filter((b) => b.breed === selectedBreed);

  const heatmapData: HeatmapData[] = filteredData.map((b) => [b.lat, b.lng, 1]);

  const stadiaApiKey = import.meta.env.VITE_STADIA_API_KEY;
  const tileUrl = `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${stadiaApiKey}`;

  return (
    <div className="relative w-screen h-screen">
      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-b from-green-100 to-white bg-opacity-50 flex items-center justify-center z-[1001]">
          <div className="text-center">
            <LoaderCircle className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p className="text-xl font-semibold">Loading Breed Data...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-gradient-to-b from-green-100 to-white bg-opacity-80 flex items-center justify-center z-[1001]">
          <p className=" text-xl font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] bg-gradient-to-b from-green-100 to-white rounded-xl shadow-xl p-4 space-y-4 w-[260px] backdrop-blur-sm">
        <div>
          <label
            htmlFor="breed-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by Breed
          </label>
          <select
            id="breed-filter"
            value={selectedBreed}
            onChange={(e) => setSelectedBreed(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-green-500 focus:border-green-500"
          >
            {allBreeds.map((breed) => (
              <option key={breed} value={breed}>
                {breed}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            View Mode
          </label>
          <div className="flex overflow-hidden rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode("points")}
              className={`flex-1 p-2 text-sm transition ${viewMode === "points"
                ? "bg-green-500 text-white"
                : "bg-white hover:bg-gray-100"
                }`}
            >
              Points
            </button>
            <button
              onClick={() => setViewMode("heatmap")}
              className={`flex-1 p-2 text-sm transition ${viewMode === "heatmap"
                ? "bg-green-500 text-white"
                : "bg-white hover:bg-gray-100"
                }`}
            >
              Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url={tileUrl}
        />

        {viewMode === "points" &&
          filteredData.map((scan) => (
            <Marker
              key={scan.id}
              position={[scan.lat, scan.lng]}
              icon={createPulseIcon(scan.breed)}
            >
              <Popup>
                <div className="font-bold text-md">{scan.breed}</div>
                <img
                  src={scan.image_url}
                  alt={scan.breed}
                  className="mt-2 w-full h-32 object-cover rounded-md"
                />
              </Popup>
            </Marker>
          ))}

        {viewMode === "heatmap" && (
          <HeatLayer
            points={heatmapData}
            options={{ radius: 40, blur: 25, maxZoom: 10 }}
          />
        )}
      </MapContainer>

      <style>{`
        .marker-pulse {
          background-color: #fff;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #fff;
          box-shadow: 0 0 6px rgba(0,0,0,0.5);
          position: relative;
        }
        .marker-pulse::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: inherit;
          transform: translate(-50%, -50%);
          z-index: -1;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(5); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-popup-tip {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
}

// --- Helper Functions ---
const breedColors: { [key: string]: string } = {
  Gir: "#E53935",
  Sahiwal: "#43A047",
  "Red Sindhi": "#FB8C00",
  Ongole: "#1E88E5",
  Murrah: "#8E24AA",
};
const defaultColor = "#757575";

const createPulseIcon = (breed: string): DivIcon => {
  const color = breedColors[breed] || defaultColor;
  return L.divIcon({
    html: `<div class="marker-pulse" style="background-color: ${color};"></div>`,
    className: "",
    iconSize: [12, 12],
  });
};
