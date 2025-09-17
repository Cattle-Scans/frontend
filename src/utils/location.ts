// src/utils/geolocation.ts
import { toast } from "sonner";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

// --- Native Browser GPS ---
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject("Geolocation is not supported by your browser.");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, // meters
        });
      },
      (error) => {
        reject(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10s
        maximumAge: 0,
      }
    );
  });
};

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
export const getBestLocation = async (): Promise<Coordinates> => {
  try {
    const gps = await getCurrentLocation();
    return gps;
  } catch (err) {
    const ip = await getLocationFromIP();
    return ip;
  }
};
