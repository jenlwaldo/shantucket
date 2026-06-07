const NANTUCKET_CENTER = [41.2835, -70.0995];
const DEFAULT_ZOOM = 12;

const TYPE_COLORS = {
  "Coffee": "#6b4a2b",
  "Eat": "#b54a30",
  "Sweet": "#c9962b",
  "Shop": "#7a4a8c",
  "Beach": "#2e7a8c",
  "See": "#1c3553"
};
const FALLBACK_COLORS = ["#3d7a4f", "#a83d5c", "#6b5d3c", "#2e4a6b"];
let fallbackIndex = 0;
const colorByType = new Map(Object.entries(TYPE_COLORS));
function colorFor(type) {
  if (!colorByType.has(type)) {
    colorByType.set(type, FALLBACK_COLORS[fallbackIndex++ % FALLBACK_COLORS.length]);
  }
  return colorByType.get(type);
}

const activeTypes = new Set();
const markersByType = new Map();

const map = L.map("map", {
  center: NANTUCKET_CENTER,
  zoom: DEFAULT_ZOOM,
  scrollWheelZoom: true
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function makePin(color) {
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="background:${color}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10]
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function popupHtml(place) {
  const color = colorFor(place.type);
  const photo = place.photos && place.photos.length
    ? `<img class="photo" src="${escapeHtml(place.photos[0])}" alt="${escapeHtml(place.name)}" />`
    : "";
  const address = place.address
    ? `<p class="address">${escapeHtml(place.address)}</p>` : "";
  const note = place.note
    ? `<p class="note">${escapeHtml(place.note)}</p>` : "";
  return `<div class="popup">
    ${photo}
    <h2 class="name">${escapeHtml(place.name)}</h2>
    <span class="type-badge" style="background:${color}">${escapeHtml(place.type)}</span>
    ${address}
    ${note}
  </div>`;
}

const TYPE_ORDER = ["Coffee", "Eat", "Sweet", "Shop", "Beach", "See"];

function renderFilters() {
  const container = document.getElementById("filters");
  container.innerHTML = "";
  const present = Array.from(markersByType.keys());
  const ordered = TYPE_ORDER.filter(t => present.includes(t))
    .concat(present.filter(t => !TYPE_ORDER.includes(t)).sort());
  for (const type of ordered) {
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.type = "button";
    btn.setAttribute("aria-pressed", activeTypes.has(type) ? "true" : "false");
    btn.innerHTML = `<span class="swatch" style="background:${colorFor(type)}"></span>${escapeHtml(type)}`;
    btn.addEventListener("click", () => toggleType(type));
    container.appendChild(btn);
  }
}

function toggleType(type) {
  if (activeTypes.has(type)) {
    activeTypes.delete(type);
    for (const m of markersByType.get(type)) map.removeLayer(m);
  } else {
    activeTypes.add(type);
    for (const m of markersByType.get(type)) m.addTo(map);
  }
  renderFilters();
}

async function loadPlaces() {
  const res = await fetch("places.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load places.json: ${res.status}`);
  return res.json();
}

(async function init() {
  let places;
  try {
    places = await loadPlaces();
  } catch (err) {
    console.error(err);
    return;
  }

  for (const place of places) {
    const color = colorFor(place.type);
    const marker = L.marker([place.lat, place.lng], { icon: makePin(color) });
    marker.bindPopup(popupHtml(place), { maxWidth: 280 });
    if (!markersByType.has(place.type)) markersByType.set(place.type, []);
    markersByType.get(place.type).push(marker);
    activeTypes.add(place.type);
    marker.addTo(map);
  }
  renderFilters();
})();
