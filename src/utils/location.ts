// src/utils/geolocation.ts

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}


// --- IP Fallback (IPInfo) ---
export const getLocationFromIP = async (): Promise<Coordinates> => {
  const token = import.meta.env.VITE_IPINFO_TOKEN;
  if (!token) throw new Error("Missing IPInfo token in .env");

  const res = await fetch(`https://ipinfo.io/json?token=${token}`);
  if (!res.ok) throw new Error("Failed to fetch IP-based location");

  const data = await res.json();
  const [lat, lng] = data.loc.split(",");

  return {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    accuracy: 50000, // IP-based ~ 50km
  };
};

// --- Hybrid Method ---
export const getBestLocation = async () => {
  try {
    const ip = await getLocationFromIP();
    return { error: null, data: ip };

  } catch (error: Error | any) {
    return { error: error.message, data: null };
  }
};
