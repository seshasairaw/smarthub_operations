import L from "leaflet";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import icon from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon paths (important for correct marker display)
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: icon2x,
    iconUrl: icon,
    shadowUrl: shadow,
});