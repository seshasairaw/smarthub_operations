/**
 * OperationsMap component displays a map with markers for different hubs, showing their operational status.
 * It uses the react-leaflet library to render the map and markers, and includes a popup for each marker with hub details.
 * The component is designed to provide a visual representation of hub locations and their current status, which can be useful for monitoring and operational decision-making.
 * Note: The map uses OpenStreetMap tiles, which are free to use and do not require an API key. The leafletIconFix is included to ensure that marker icons display correctly in the React/Vite environment.
 * The hub data is currently hardcoded for demonstration purposes, but it can be easily modified to fetch real data from the backend API in the future.
 */
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletIconFix";

type Hub = { code: string; name: string; lat: number; lng: number; status: "OPERATIONAL" | "CONGESTED" | "DOWN" };

const hubs: Hub[] = [
  { code: "NYC", name: "New York Hub", lat: 40.7128, lng: -74.006, status: "OPERATIONAL" },
  { code: "EWR", name: "Newark Hub", lat: 40.7357, lng: -74.1724, status: "CONGESTED" },
  { code: "PHL", name: "Philadelphia Hub", lat: 39.9526, lng: -75.1652, status: "DOWN" },
];

export default function OperationsMap() {
  return (
    <div style={{ height: 520, width: "100%" }}>
      <MapContainer center={[40.7128, -74.006]} zoom={8} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          // OpenStreetMap tiles (free, no key)
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {hubs.map((h) => (
          <Marker key={h.code} position={[h.lat, h.lng]}>
            <Popup>
              <div>
                <b>{h.code}</b> — {h.name}
                <br />
                Status: {h.status}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}