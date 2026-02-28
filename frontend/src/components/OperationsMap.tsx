/**
 * OperationsMap component displays a map with markers for logistics hubs, showing their operational status.
 * Hub locations are fetched from the backend API and geocoded using the hub's pincode via Nominatim (OpenStreetMap).
 * Each marker shows a popup with hub code, name, city, and current status.
 */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletIconFix";
import { api } from "../api/client";

type HubFromApi = {
  hub_code: string;
  hub_name: string;
  city: string;
  pincode: string;
  status: "OPERATIONAL" | "CONGESTED" | "DOWN";
};

type HubWithCoords = HubFromApi & { lat: number; lng: number };

async function geocodePincode(pincode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=IN&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // silently skip hubs that fail geocoding
  }
  return null;
}

// India center as default map view
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

export default function OperationsMap() {
  const [hubs, setHubs] = useState<HubWithCoords[]>([]);

  useEffect(() => {
    api.get<HubFromApi[]>("/api/hubs/status").then(async (res) => {
      const withCoords: HubWithCoords[] = [];
      for (const hub of res.data) {
        if (!hub.pincode) continue;
        const coords = await geocodePincode(hub.pincode);
        if (coords) {
          withCoords.push({ ...hub, ...coords });
        }
      }
      setHubs(withCoords);
    });
  }, []);

  return (
    <div style={{ height: 520, width: "100%" }}>
      <MapContainer center={INDIA_CENTER} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {hubs.map((h) => (
          <Marker key={h.hub_code} position={[h.lat, h.lng]}>
            <Popup>
              <div>
                <b>{h.hub_code}</b> — {h.hub_name}
                <br />
                {h.city}
                <br />
                Status: <b>{h.status}</b>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
