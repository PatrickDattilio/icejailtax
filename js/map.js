/**
 * ICE Jail Tax - Interactive Leaflet Map Visualizer
 * Shows proposed facility, 1.24mi, 1.86mi, and 2.49mi study impact zones, and user's home location
 */

let mapInstance = null;
let userMarker = null;
let connectionLine = null;
let facilityMarker = null;
let zoneCircles = [];

const FACILITY_LAT = 39.616220;
const FACILITY_LNG = -77.802920;

// Conversion: 1 mile = 1609.34 meters
const METERS_PER_MILE = 1609.344;

function initMap(mapContainerId = 'map') {
  const container = document.getElementById(mapContainerId);
  if (!container || typeof L === 'undefined') return null;

  if (mapInstance) {
    mapInstance.invalidateSize();
    return mapInstance;
  }

  // Create Leaflet Map
  mapInstance = L.map(mapContainerId, {
    center: [FACILITY_LAT, FACILITY_LNG],
    zoom: 13,
    minZoom: 10,
    maxZoom: 18,
    scrollWheelZoom: false
  });

  // Enable scroll zoom on click/focus
  mapInstance.on('focus', () => mapInstance.scrollWheelZoom.enable());
  container.addEventListener('click', () => mapInstance.scrollWheelZoom.enable());

  // Base Tile Layer (CartoDB Positron / OSM style clean tiles)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(mapInstance);

  // Add 3 Study Impact Radius Zones
  // 1. 2.49 miles (Outermost cumulative study radius - 1.8% loss)
  const circle249 = L.circle([FACILITY_LAT, FACILITY_LNG], {
    radius: 2.49 * METERS_PER_MILE,
    color: '#d97706',
    weight: 2,
    dashArray: '5, 5',
    fillColor: '#fbbf24',
    fillOpacity: 0.12
  }).addTo(mapInstance);
  circle249.bindTooltip('<strong>2.49-Mile Study Boundary</strong><br>−1.8% Average Loss', { sticky: true });

  // 2. 1.86 miles (Intermediate cumulative radius - 2.0% loss)
  const circle186 = L.circle([FACILITY_LAT, FACILITY_LNG], {
    radius: 1.86 * METERS_PER_MILE,
    color: '#ea580c',
    weight: 2,
    dashArray: '4, 4',
    fillColor: '#f97316',
    fillOpacity: 0.15
  }).addTo(mapInstance);
  circle186.bindTooltip('<strong>1.86-Mile Study Radius</strong><br>−2.0% Average Loss', { sticky: true });

  // 3. 1.24 miles (High impact radius - 3.4% loss)
  const circle124 = L.circle([FACILITY_LAT, FACILITY_LNG], {
    radius: 1.24 * METERS_PER_MILE,
    color: '#b42318',
    weight: 2.5,
    fillColor: '#b42318',
    fillOpacity: 0.22
  }).addTo(mapInstance);
  circle124.bindTooltip('<strong>1.24-Mile High-Impact Radius</strong><br>−3.4% Average Loss (p &lt; 0.01)', { sticky: true });

  zoneCircles = [circle124, circle186, circle249];

  // Facility Custom Icon
  const facilityIcon = L.divIcon({
    className: 'custom-facility-pin',
    html: `<div style="
      background:#171717;
      color:#fff;
      padding:6px 10px;
      border-radius:6px;
      font-size:12px;
      font-weight:800;
      border:2px solid #b42318;
      box-shadow:0 3px 8px rgba(0,0,0,0.35);
      white-space:nowrap;
      display:flex;
      align-items:center;
      gap:5px;
      transform:translate(-50%, -100%);
    ">
      <span style="display:inline-block;width:10px;height:10px;background:#b42318;border-radius:50%;"></span>
      Proposed ICE Jail
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  facilityMarker = L.marker([FACILITY_LAT, FACILITY_LNG], { icon: facilityIcon }).addTo(mapInstance);
  facilityMarker.bindPopup(`
    <div style="font-family:Inter,sans-serif;font-size:13px;line-height:1.4;">
      <strong style="color:#b42318;font-size:14px;">Proposed Washington County ICE Jail</strong><br>
      <strong>Location:</strong> 10900 Hopewell Rd / 16220 Wright Rd, Williamsport, MD<br>
      <em>Purchased Jan 2026 by DHS (825,000 sq ft industrial facility)</em>
    </div>
  `);

  return mapInstance;
}

/**
 * Updates the map with searched property location and visual feedback
 */
function updateMapLocation(lat, lng, label, distanceMiles, withinStudy) {
  if (!mapInstance) initMap();
  if (!mapInstance) return;

  // Remove existing user marker & line
  if (userMarker) mapInstance.removeLayer(userMarker);
  if (connectionLine) mapInstance.removeLayer(connectionLine);

  const homeColor = withinStudy ? '#b42318' : '#176b3a';

  // Custom User Marker Icon
  const homeIcon = L.divIcon({
    className: 'custom-home-pin',
    html: `<div style="
      background:${homeColor};
      color:#fff;
      padding:6px 10px;
      border-radius:6px;
      font-size:12px;
      font-weight:800;
      border:2px solid #ffffff;
      box-shadow:0 3px 8px rgba(0,0,0,0.35);
      white-space:nowrap;
      transform:translate(-50%, -100%);
    ">
      🏠 Matched Address
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });

  userMarker = L.marker([lat, lng], { icon: homeIcon }).addTo(mapInstance);
  userMarker.bindPopup(`
    <div style="font-family:Inter,sans-serif;font-size:13px;">
      <strong>${label || 'Your Address'}</strong><br>
      <span>Distance to ICE facility: <strong>${Number(distanceMiles).toFixed(2)} miles</strong></span><br>
      <span style="color:${homeColor};font-weight:700;">
        ${withinStudy ? 'Within Study Impact Zone' : 'Outside 2.49-mile study area'}
      </span>
    </div>
  `).openPopup();

  // Draw straight line between facility and property
  connectionLine = L.polyline(
    [[FACILITY_LAT, FACILITY_LNG], [lat, lng]],
    {
      color: homeColor,
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.85
    }
  ).addTo(mapInstance);

  // Fit bounds to show both facility and property nicely
  const bounds = L.latLngBounds([[FACILITY_LAT, FACILITY_LNG], [lat, lng]]);
  mapInstance.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
}

window.IceJailTaxMap = {
  initMap,
  updateMapLocation
};
