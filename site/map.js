/*
Icons:
 - https://github.com/python-visualization/folium/issues/617
 - https://fontawesome.com/v4.7.0/icons/ , with prefix='fa'
*/

let iconNames = {
    'OK': 'camera',
    'damaged': 'camera',
    'destroyed': 'xmark',
    'hidden': 'eye-slash'
};

let iconColors = {
    'OK': 'orange',
    'damaged': 'beige',
    'destroyed': 'black',
    'hidden': 'black'
}

function getCollectedIds() {
    const storedData = localStorage.getItem('collectedIds');
    if (!storedData) {
        return new Set([]);
    }
    try {
        return new Set(JSON.parse(storedData));
    } catch (e) {
        console.error('Error parsing collectedIds from localStorage:', e);
    }
    return new Set([]);
}

function saveCollectedIds() {
    const serialized = JSON.stringify(Array.from(collectedIds));
    localStorage.setItem('collectedIds', serialized);
}

function saveHideSettingsState() {
    const hideCollected = document.getElementById('hideCollectedCheckbox').checked;
    localStorage.setItem('hideCollected', JSON.stringify(hideCollected));

    const hideDestroyed = document.getElementById('hideDestroyedCheckbox').checked;
    localStorage.setItem('hideDestroyed', JSON.stringify(hideDestroyed));
}

function loadHideCollectedState() {
    const storedState = localStorage.getItem('hideCollected');
    if (storedState) {
        const hideCollected = JSON.parse(storedState);
        document.getElementById('hideCollectedCheckbox').checked = hideCollected;
        return hideCollected;
    }
    return false;
}

function loadHideDestroyedState(defValue) {
    const storedState = localStorage.getItem('hideDestroyed');
    if (storedState) {
        const hideDestroyed = JSON.parse(storedState);
        document.getElementById('hideDestroyedCheckbox').checked = hideDestroyed;
        return hideDestroyed;
    } else {
        // If no stored state, align with the existing state for hideCollected.
        document.getElementById('hideDestroyedCheckbox').checked = defValue;
        return defValue;
    }
}


function loadUid() {
    const storedState = localStorage.getItem('uid');
    if (storedState) {
        return storedState;
    }
    return "";
}

// Dict invader ID to invader object.
let invaders = {};

// Settings stored in local storage.
let collectedIds = getCollectedIds();
let hideCollected = loadHideCollectedState();
let hideDestroyed = loadHideDestroyedState(hideCollected);
let uid = loadUid();

function onCollected(id) {
    if (!collectedIds.has(id)) {
        collectedIds.add(id);
        saveCollectedIds();
    }
    refreshMarker(id);
}

function onNotCollected(id) {
    if (collectedIds.has(id)) {
        collectedIds.delete(id);
        saveCollectedIds();
    }
    refreshMarker(id);
}

function getSpriteStyle(invaderId) {
    const atlasInfo = animationState.atlases && animationState.atlases[invaderId];
    if (!atlasInfo) return null;
    const bgPosX = (atlasInfo.imgW === atlasInfo.w) ? 0 : atlasInfo.x / (atlasInfo.imgW - atlasInfo.w) * 100;
    const bgPosY = (atlasInfo.imgH === atlasInfo.h) ? 0 : atlasInfo.y / (atlasInfo.imgH - atlasInfo.h) * 100;
    const bgSizeX = atlasInfo.imgW / atlasInfo.w * 100;
    const bgSizeY = atlasInfo.imgH / atlasInfo.h * 100;
    return `background:url('assets/${atlasInfo.atlas}.avif') no-repeat;background-position:${bgPosX}% ${bgPosY}%;background-size:${bgSizeX}% ${bgSizeY}%;image-rendering:pixelated;`;
}

function getSpriteHtml(invaderId, size) {
    const style = getSpriteStyle(invaderId);
    if (!style) return '';
    return `<div style="width:${size}px;height:${size}px;${style}"></div>`;
}

function refreshMarker(id) {
    let invader = invaders[id];

    // Icon.
    var customIcon = L.AwesomeMarkers.icon({
        "extraClasses": "fa-rotate-0",
        "icon": iconNames[invader.status] || 'wrench',
        "iconColor": "white",
        "markerColor": iconColors[invader.status] || 'red',
        "prefix": "fa"
    });
    const isCollected = collectedIds.has(id);
    if (isCollected) {
        customIcon.options.markerColor = 'lightgray';
    }
    invader.marker.setIcon(customIcon);

    // Popup.
    var popupContent = `<h4>${invader.id} (${invader.status})</h4>`;
    popupContent += getSpriteHtml(invader.id, 128);
    if (invader.hint) {
        popupContent += `<p><i>${invader.hint}</i></p>`;
    }
    popupContent += `<p>`;
    if (isCollected) {
        popupContent += `<button onclick="onNotCollected('${invader.id}')">❌ Mark as not flashed</button>`;
    } else {
        popupContent += `<button onclick="onCollected('${invader.id}')">✅ Mark as flashed</button>`;
    }
    popupContent += `</p>`;
    popupContent += `<a href="${invader.instagramUrl}" target="_blank"><button>📷 Peek at Instagram</button></a></div>`;
    const popupHtml = `<div>` + popupContent + `</div>`;
    // setPopupContent updates in place, so an already open popup stays open.
    if (invader.marker.getPopup()) {
        invader.marker.setPopupContent(popupHtml);
    } else {
        invader.marker.bindPopup(popupHtml);
    }

    // Visibility.
    var curZoom = map.getZoom();
    const isFlashable = invader.status == "OK" || invader.status == "damaged";
    let shouldBeVisible = (
        !(hideCollected && isCollected) &&
        !(hideDestroyed && !isFlashable)
    );
    if (shouldBeVisible && !invader.visible) {
        markers.addLayer(invader.marker);
        //invader.marker.addTo(map);
        invader.visible = true;
    } else if (!shouldBeVisible && invader.visible) {
        markers.removeLayer(invader.marker);
        //invader.marker.remove();
        invader.visible = false;
    }
}

function refreshAll() {
    Object.keys(invaders).forEach(key => {
        refreshMarker(key);
    });
}

function addMarker(map, item) {
    // Create the marker.
    var marker = L.marker([item.obf_lat, item.obf_lng]);

    invaders[item.id] = item;
    invaders[item.id].marker = marker;
    // Markers start off as not visible (not added to the map). This will
    // be changed in refreshMarker.
    invaders[item.id].visible = false;
    refreshMarker(item.id);
}

// Read start zoom and location from the fragment URL or default to Paris
let startCoords = [48.858288443064026, 2.3477714064786586]; // Paris
let startZoom = 15;
var hashParams = window.location.hash.substr(1).split('&').reduce(function (result, item) {
    var parts = item.split('=');
    result[parts[0]] = parts[1];
    return result;
}, {});
if (hashParams.zoom && hashParams.lat && hashParams.lng) {
    let zoom = parseInt(hashParams.zoom, 10);
    let lat = parseFloat(hashParams.lat);
    let lng = parseFloat(hashParams.lng);
    startCoords = [lat, lng];
    startZoom = zoom;
}

let map = L.map(
    "map",
    {
        center: startCoords,
        crs: L.CRS.EPSG3857,
        zoom: startZoom,
        maxZoom: 17,
        zoomControl: true,
        preferCanvas: false,
        attributionControl: false,
    }
);
L.control.attribution({position: 'topright'}).addTo(map);
 let markers = L.markerClusterGroup({
     showCoverageOnHover: true,
     maxClusterRadius: 35,
     disableClusteringAtZoom: 10,
     spiderfyOnMaxZoom: true,  // Better UX: click cluster to unspider
 });
map.addLayer(markers);

L.control.scale({
    position: 'topright',
}).addTo(map);

// Available tile layers. The key is what `?tileset=` and localStorage store.
const TILESETS = {
    satellite: {
        label: 'Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: { attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18 },
    },
    osm: {
        label: 'Street',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    },
    grayscale: {
        label: 'Street (grey)',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            className: 'grayscale',
        },
    },
    dark: {
        label: 'Dark',
        url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        options: { attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/about/">OpenStreetMap</a>', maxZoom: 18 },
    },
    toner: {
        label: 'Toner (black & white)',
        url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png',
        options: { attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.stamen.com/">Stamen Design</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/about/">OpenStreetMap</a> contributors', maxZoom: 18, subdomains: 'abc' },
    },
    watercolor: {
        label: 'Watercolour',
        url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
        options: { attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.stamen.com/">Stamen Design</a>', maxZoom: 16 },
    },
    topo: {
        label: 'Topographic (grey)',
        url: 'https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web_grau/default/WEBMERCATOR/{z}/{y}/{x}.png',
        options: { attribution: 'Map data: &copy; <a href="https://www.govdata.de/dl-de/by-2-0">dl-de/by-2-0</a>' },
    },
    none: { label: 'No background' },
};

// Keys used by older links.
const TILESET_ALIASES = { st: 'toner', grau: 'topo', esri: 'satellite' };
const DEFAULT_TILESET = 'satellite';

function resolveTileset() {
    const requested = new URLSearchParams(window.location.search).get('tileset')
        || localStorage.getItem('tileset')
        || DEFAULT_TILESET;
    const key = TILESET_ALIASES[requested] || requested;
    return TILESETS[key] ? key : DEFAULT_TILESET;
}

var tile_layer = null;
let currentTileset = resolveTileset();

function applyTileset(key) {
    const spec = TILESETS[key];
    if (!spec) return;
    if (tile_layer) {
        map.removeLayer(tile_layer);
        tile_layer = null;
    }
    if (spec.url) {
        tile_layer = L.tileLayer(spec.url, spec.options || {});
        tile_layer.addTo(map);
        tile_layer.bringToBack();
    }
    currentTileset = key;
}

applyTileset(currentTileset);


var locate_control_48d140e7efd49a2600412d092814c0e3 = L.control.locate(
    {}
).addTo(map);

var lookup_control = L.Control.extend({
    options: {
        position: 'topleft'
    },

    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.innerHTML = '<a href="#" title="Lookup" role="button" aria-label="Lookup"><i class="fa fa-search" style="font-size: 1.4em; color: black;"></i></a>';
        container.onclick = function(e) {
            e.preventDefault();
            openLookupModal();
        }
        return container;
    }
});
map.addControl(new lookup_control());


// Check if we have an id parameter
let targetInvaderId = new URLSearchParams(window.location.search).get('id');
if (targetInvaderId) {
    targetInvaderId = targetInvaderId.toUpperCase();
}

const invadersReady = fetch('invaders.json?nocache=1')
    .then(response => response.json())
    .then(data => {
        // Iterate over each item in the JSON array
        data.forEach(item => addMarker(map, item));

        // If we have a target invader, center the map on it and open its popup
        if (targetInvaderId && invaders[targetInvaderId]) {
            const invader = invaders[targetInvaderId];

            // Make sure the marker is visible, regardless of filter settings
            if (!invader.visible) {
                markers.addLayer(invader.marker);
                invader.visible = true;
            }

            // Center the map on the invader and show popup
            map.setView([invader.obf_lat, invader.obf_lng], map.getMaxZoom());
            invader.marker.openPopup();
        }
        
        // Initialize sprite atlases for all cities
        initializeAtlases();

        // Precompute city centers (median lat/lng of all invaders per prefix)
        computeCityCenters();
    })
    .catch(error => {
        console.error('Error loading JSON:', error);
    });


function updateUrlFragment() {
    var currZoom = map.getZoom();
    var center = map.getCenter();
    var lat = center.lat;
    var lng = center.lng;

    // Encoding the current zoom level and center location as the URL fragment
    window.location.hash = `zoom=${currZoom}&lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`;
}

function onZoomEnd() {
    updateUrlFragment();
    /*refreshAll();*/
}
map.on('zoomend', onZoomEnd);
map.on('moveend', updateUrlFragment);

// Get the modal
var modal = document.getElementById("settingsModal");

// Get the button that opens the modal
var btn = document.getElementById("openSettings");

// When the user clicks the button, open the modal
btn.onclick = function () {
    openSettingsModal();
}

function openSettingsModal() {
    modal.style.display = "block";

    document.getElementById('uidInput').value = uid;

    document.getElementById("infoBox").style.display = "none";
}

// When the user clicks on <span> (x), close the modal
var settingsCloseBtn = document.getElementById("settingsCloseBtn");
settingsCloseBtn.onclick = function () {
    closeSettingsModal();
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target == modal) {
        closeSettingsModal();
    }
    if (event.target == lookupModal) {
        closeLookupModal();
    }
}

function closeSettingsModal() {
    modal.style.display = "none";
    document.getElementById('settingsRestoreStatus').innerHTML = "";
    document.getElementById('restoreFromAppStatus').innerHTML = "";

    document.getElementById("infoBox").style.display = "block";
}

// Lookup modal
var lookupModal = document.getElementById("lookupModal");
var lookupInput = document.getElementById("lookupInput");
var suggestions = document.getElementById("suggestions");
var lookupCloseBtn = document.getElementById("lookupCloseBtn");

function openLookupModal() {
    lookupModal.style.display = "block";
    lookupInput.value = "";
    suggestions.innerHTML = "";
    lookupInput.focus();
}

function closeLookupModal() {
    lookupModal.style.display = "none";
}

lookupCloseBtn.onclick = closeLookupModal;

lookupInput.addEventListener('keyup', function() {
    const input = lookupInput.value.toUpperCase();
    suggestions.innerHTML = '';
    if (input.length < 2) {
        return;
    }

    const matchingInvaders = Object.keys(invaders).filter(id => id.startsWith(input));

    matchingInvaders.forEach(id => {
        const suggestionDiv = document.createElement('div');
        suggestionDiv.innerHTML = id;
        suggestionDiv.onclick = function() {
            lookupInput.value = id;
            suggestions.innerHTML = '';
            goToInvader(id);
        }
        suggestions.appendChild(suggestionDiv);
    });
});

function goToInvader(id) {
    if (invaders[id]) {
        const invader = invaders[id];
        if (!invader.visible) {
            markers.addLayer(invader.marker);
            invader.visible = true;
        }
        map.setView([invader.obf_lat, invader.obf_lng], map.getMaxZoom());
        invader.marker.openPopup();
        closeLookupModal();
    } else {
        alert("Invader not found!");
    }
}


const tilesetSelect = document.getElementById('tilesetSelect');
Object.entries(TILESETS).forEach(([key, spec]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = spec.label;
    tilesetSelect.appendChild(option);
});
tilesetSelect.value = currentTileset;
tilesetSelect.addEventListener('change', function () {
    applyTileset(this.value);
    localStorage.setItem('tileset', this.value);
});

document.getElementById('hideCollectedCheckbox').addEventListener('change', function () {
    hideCollected = this.checked;
    saveHideSettingsState();
    refreshAll();
});

document.getElementById('hideDestroyedCheckbox').addEventListener('change', function () {
    hideDestroyed = this.checked;
    saveHideSettingsState();
    refreshAll();
});

document.getElementById('downloadButton').addEventListener('click', function () {
    const serialized = JSON.stringify(Array.from(collectedIds));
    const blob = new Blob([serialized], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);

    const date = new Date();
    const formattedDate = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, '0') + "-" + date.getDate().toString().padStart(2, '0');
    const filename = 'flashed-' + formattedDate + '.txt';

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('uploadInput').addEventListener('change', function (event) {
    const fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        const text = fileLoadedEvent.target.result;
        let statusSpan = document.getElementById('settingsRestoreStatus');
        try {
            statusSpan.innerHTML = `⚙️ loading, wait a moment...`;
            collectedIds = new Set(JSON.parse(text));
            saveCollectedIds(); // Update localStorage with the new set
            refreshAll();
            let count = collectedIds.size;
            statusSpan.innerHTML = `${count} invaders restored`;
        } catch (e) {
            statusSpan.innerHTML = `Error parsing the file (incorrect format?)`;
            console.error('Error parsing uploaded file:', e);
        }
    };
    fileReader.readAsText(event.target.files[0]);
});

document.getElementById('restoreFromAppButton').addEventListener('click', function () {
    const uid = document.getElementById('uidInput').value;
    const apiUrl = `https://api.space-invaders.com/flashinvaders_v3_pas_trop_predictif/api/gallery?uid=${uid}`;

    let statusSpan = document.getElementById('restoreFromAppStatus');
    if (!uid) {
        statusSpan.innerHTML = `⚠️ UID cannot be empty`;
        return;
    }
    statusSpan.innerHTML = `⚙️ syncing in progress`;
    Promise.all([
        fetch(apiUrl).then(response => response.json()),
        invadersReady
    ])
        .then(([data]) => {
            const invaderIds = Object.keys(data.invaders);
            const stats = calculateGalleryStats(data.invaders);
            statusSpan.innerHTML = `✅ ${invaderIds.length} mosaics marked as flashed<br>` +
                `${stats.cityCount} cities · ${Math.round(stats.distanceKm).toLocaleString()} km point-to-point`;
            collectedIds = new Set(invaderIds)
            saveCollectedIds();
            refreshAll();

            localStorage.setItem('uid', uid);
            // Cache gallery data for Animate My
            animationState.galleryData = data;
        })
        .catch(error => {
            statusSpan.innerHTML = `⚠️ Error fetching data`;
        });
});

// workd view - http://localhost:8000/#zoom=3&lat=16.8045&lng=5.6250
// Animation - spawner-based, supports PA sequence and user's flashed mosaics
let animationState = {
    isPlaying: false,
    runId: 0,              // bumped on start/stop to void pending sprite timers
    nextIndex: 0,
    startIndex: 0,         // start animation at this index (0 = first)
    animationList: [],     // ordered list of invader IDs to animate
    animationSpeed: 3000,  // ms per sprite animation
    spawnInterval: 100,    // ms between spawns (controls parallelism)
    spawnerTimer: null,
    redSquares: [],
    angleStep: 30,
    atlases: null,         // loaded atlas metadata
    galleryData: null,     // cached API response from 'restore from app'
    extraData: null,       // loaded invaders_extra.json (date_pos, points)
    mode: 'pa',            // 'pa', 'my', or 'all'
    cumulatedDistance: 0,   // km
    lastLat: null,
    lastLng: null,
    cumulatedPoints: 0,
    seenCities: null,      // Set of city prefixes seen so far (for city bonus)
    lastCity: null,        // last city prefix (to detect any city switch)
    autoPanOnCityChange: true,  // fly map to new/different city when prefix changes
    cityZoomLevels: {
        // Computed from geographic spread of invaders per city
        'PA': 13, 'LA': 11, 'NY': 12, 'LDN': 11, 'HK': 12, 'TK': 12,
        'MARS': 12, 'ROM': 11, 'MIA': 11, 'BAB': 12, 'DJBA': 11,
        'FTBL': 11, 'CAZ': 9, 'RA': 11, 'REUN': 11, 'CLR': 12,
        'KLN': 12, 'BGK': 11, 'BRL': 12, 'MPL': 11, 'LBR': 10,
        'BTA': 12, 'PRT': 12, 'FKF': 12, 'MRAK': 11, 'MBSA': 11,
        'TLS': 10, 'CAPF': 13, 'GRN': 13, 'SP': 13, 'POTI': 13,
        'WN': 13, 'MUN': 13, 'SL': 13, 'DJN': 13, 'MLB': 13,
        'MEN': 13, 'MLGA': 13, 'FAO': 13, 'GRU': 12, 'CCU': 12,
        'LIL': 11,
    },
    autoPanZoomDefault: 14,
    scrubbing: false,      // true while the progress slider is being dragged
    resumeTimeout: null,   // pending resume timer (to cancel on new city change)
    cityCenters: {},       // precomputed {prefix: {lat, lng}} median centers
};

// Precompute median center for each city prefix (robust to outliers)
function computeCityCenters() {
    const groups = {};
    Object.values(invaders).forEach(inv => {
        if (!inv.obf_lat || !inv.obf_lng) return;
        const prefix = getCityPrefix(inv.id || '');
        if (!groups[prefix]) groups[prefix] = { lats: [], lngs: [] };
        groups[prefix].lats.push(inv.obf_lat);
        groups[prefix].lngs.push(inv.obf_lng);
    });
    Object.entries(groups).forEach(([prefix, pts]) => {
        pts.lats.sort((a, b) => a - b);
        pts.lngs.sort((a, b) => a - b);
        const mid = Math.floor(pts.lats.length / 2);
        animationState.cityCenters[prefix] = {
            lat: pts.lats[mid],
            lng: pts.lngs[mid]
        };
    });
}

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getCityPrefix(id) {
    // Extract city prefix: PA_1234 → PA, SPACE2ISS → SPACE2ISS, FTBL_01 → FTBL
    const match = id.match(/^(.+?)_\d+$/);
    return match ? match[1] : id;
}

function calculateGalleryStats(galleryInvaders) {
    const entries = Object.entries(galleryInvaders);
    const cities = new Set(entries.map(([id]) => getCityPrefix(id)));
    const route = entries
        .filter(([id]) => {
            const invader = invaders[id];
            return invader &&
                Number.isFinite(invader.obf_lat) &&
                Number.isFinite(invader.obf_lng);
        })
        .sort((a, b) =>
            (a[1].date_flash || '').localeCompare(b[1].date_flash || '')
        );

    let distanceKm = 0;
    for (let index = 1; index < route.length; index++) {
        const previous = invaders[route[index - 1][0]];
        const current = invaders[route[index][0]];
        distanceKm += haversineKm(
            previous.obf_lat, previous.obf_lng,
            current.obf_lat, current.obf_lng
        );
    }

    return { cityCount: cities.size, distanceKm };
}

function accumulateStats(id, inv) {
    // Cumulated distance
    if (animationState.lastLat !== null) {
        animationState.cumulatedDistance += haversineKm(
            animationState.lastLat, animationState.lastLng,
            inv.obf_lat, inv.obf_lng
        );
    }
    animationState.lastLat = inv.obf_lat;
    animationState.lastLng = inv.obf_lng;

    // City bonus: +100 for each new city prefix
    const cityPrefix = getCityPrefix(id);
    if (!animationState.seenCities.has(cityPrefix)) {
        animationState.seenCities.add(cityPrefix);
        animationState.cumulatedPoints += 100;
    }

    const count = animationState.nextIndex;
    const cityCount = animationState.seenCities.size;
    let html = `${id} · ${Math.round(animationState.cumulatedDistance)} km · #${count}`;

    // Points and date from gallery data ('my' mode)
    if (animationState.mode === 'my' && animationState.galleryData) {
        const entry = animationState.galleryData.invaders[id];
        if (entry) {
            if (entry.point) {
                animationState.cumulatedPoints += entry.point;
            }
            html += ` · ${animationState.cumulatedPoints} pts · ${cityCount} 🏙️`;
            if (entry.date_flash) {
                html += ` · ${entry.date_flash.substring(0, 10)}`;
            }
        }
    }

    // Points and date_pos from extra data ('all' and 'pa' modes)
    if ((animationState.mode === 'all' || animationState.mode === 'pa') && animationState.extraData) {
        const entry = animationState.extraData[id];
        if (entry) {
            if (entry.points) {
                animationState.cumulatedPoints += entry.points;
            }
            html += ` · ${animationState.cumulatedPoints} pts · ${cityCount} 🏙️`;
            if (entry.date_pos) {
                html += ` · ${entry.date_pos}`;
            }
        }
    }

    return html;
}

function updateStatsOverlay(id, inv) {
    const overlay = document.getElementById('animationStats');
    if (!overlay) return;
    overlay.textContent = accumulateStats(id, inv);
    overlay.style.display = 'block';
}

const CITY_NAMES = {
    'AIX': 'Aix-en-Provence', 'AMI': 'Amiens', 'AMS': 'Amsterdam', 'ANVR': 'Anvers',
    'ANZR': 'Anzère', 'AVI': 'Avignon', 'BAB': 'Biarritz-Anglet-Bayonne', 'BBO': 'Bilbao',
    'BGK': 'Bangkok', 'BRC': 'Barcelona', 'BRL': 'Berlin', 'BRN': 'Bern', 'BSL': 'Basel',
    'BT': 'Bhutan', 'BTA': 'Bastia', 'BXL': 'Bruxelles', 'CAPF': 'Cap Ferret',
    'CAZ': 'Côte d\'Azur', 'CCU': 'Cancún', 'CHAR': 'Charleroi', 'CLR': 'Clermont-Ferrand',
    'CON': 'Contis-Les-Bains', 'DHK': 'Dhaka', 'DIJ': 'Dijon', 'DJBA': 'Djerba',
    'DJN': 'Daejeon', 'ELT': 'Eilat', 'FAO': 'Faro', 'FKF': 'Frankfurt',
    'FRQ': 'Forcalquier', 'FTBL': 'Fontainebleau', 'GNV': 'Genève', 'GRN': 'Grenoble',
    'GRTI': 'Grumeti', 'GRU': 'Grude', 'HALM': 'Halmstad', 'HK': 'Hong Kong',
    'IST': 'Istanbul', 'KAT': 'Katmandou', 'KLN': 'Köln', 'LA': 'Los Angeles',
    'LBR': 'Luberon', 'LCT': 'La Ciotat', 'LDN': 'London', 'LIL': 'Lille',
    'LJU': 'Ljubljana', 'LSN': 'Lausanne', 'LY': 'Lyon', 'MAN': 'Manchester',
    'MARS': 'Marseille', 'MBSA': 'Mombasa', 'MEN': 'Menorca', 'MIA': 'Miami',
    'MLB': 'Melbourne', 'MLGA': 'Málaga', 'MPL': 'Montpellier', 'MRAK': 'Marrakech',
    'MTB': 'Montauban', 'MUN': 'Munich', 'NA': 'Nantes', 'NCL': 'Newcastle',
    'NIM': 'Nîmes', 'NOO': 'Noordwijk', 'NY': 'New York', 'ORLN': 'Orléans',
    'PA': 'Paris', 'PAU': 'Pau', 'POTI': 'Potosí', 'PRP': 'Perpignan',
    'PRT': 'Perth', 'RA': 'Ravenna', 'RBA': 'Rabat', 'RDU': 'Redu',
    'REUN': 'La Réunion', 'RN': 'Rennes', 'ROM': 'Roma', 'RTD': 'Rotterdam',
    'SD': 'San Diego', 'SL': 'Seoul', 'SP': 'São Paulo', 'SPACE': 'Space',
    'SPACE2ISS': 'ISS', 'TK': 'Tokyo', 'TLS': 'Toulouse', 'VLMO': 'Valmorel',
    'VRN': 'Varanasi', 'VRS': 'Versailles', 'VSB': 'Visby', 'WN': 'Vienna',
};

function showCityBonusBanner(cityPrefix) {
    const cityName = CITY_NAMES[cityPrefix] || cityPrefix;
    const banner = document.createElement('div');
    banner.className = 'city-bonus-banner';
    banner.innerHTML = `<div class="city-bonus-name">${cityPrefix} – ${cityName}</div>BONUS NEW CITY +100 PTS`;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('visible'));
    setTimeout(() => {
        banner.classList.remove('visible');
        setTimeout(() => banner.remove(), 500);
    }, 2500);
}

function getCirclePosition(angleDeg) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    // 1.5× half-viewport so sprites spawn off-screen
    const rx = cx * 1.75;
    const ry = cy * 1.75;
    const rad = angleDeg * (Math.PI / 180);
    return {
        x: cx + rx * Math.cos(rad),
        y: cy + ry * Math.sin(rad)
    };
}

function initializeAtlases() {
    fetch('assets/all_atlases.json')
        .then(r => r.json())
        .then(data => {
            animationState.atlases = data.sprites;
            // Popups were built before the metadata arrived, so they hold no
            // sprite yet; rebuild them now that the atlas lookup is available.
            refreshAll();
            // Preload all atlas AVIF images for instant rendering
            data.atlasFiles.forEach(name => {
                const img = new Image();
                img.src = `assets/${name}.avif`;
            });
            console.log(`Atlases ready: ${Object.keys(data.sprites).length} sprites across ${data.atlasFiles.length} atlases`);
        })
        .catch(err => console.error('Failed to load atlas metadata:', err));

    // Preload extra data (date_pos, points)
    fetch('invaders_extra.json')
        .then(r => r.json())
        .then(data => {
            animationState.extraData = data;
            console.log(`Extra data ready: ${Object.keys(data).length} invaders with date_pos/points`);
        })
        .catch(err => console.error('Failed to load invaders_extra.json:', err));
}

function toggleMarkersVisibility(hide) {
    if (hide) {
        map.removeLayer(markers);
    } else {
        map.addLayer(markers);
    }
}

function createSpriteMarker(lat, lng, paId) {
    let html = getSpriteHtml(paId, 16) || '<div style="width:16px;height:16px;background:red;"></div>';
    const icon = L.divIcon({
        html: html,
        className: 'red-square-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
    const marker = L.marker([lat, lng], { icon }).addTo(map);
    animationState.redSquares.push(marker);
}

function clearRedSquares() {
    animationState.redSquares.forEach(m => map.removeLayer(m));
    animationState.redSquares = [];
}

// Coordinates of an invader, falling back to the city default in extraData.
function getInvaderPosition(id) {
    const inv = invaders[id];
    const extraEntry = animationState.extraData && animationState.extraData[id];
    const lat = inv ? inv.obf_lat : (extraEntry && extraEntry.default_lat);
    const lng = inv ? inv.obf_lng : (extraEntry && extraEntry.default_lng);
    if (lat == null || lng == null) return null;
    return { lat, lng };
}

// Date an invader is sorted by in the current mode, as YYYY-MM-DD.
function getEntryDate(id) {
    if (animationState.mode === 'my' && animationState.galleryData) {
        const entry = animationState.galleryData.invaders[id];
        return entry && entry.date_flash ? entry.date_flash.substring(0, 10) : null;
    }
    const entry = animationState.extraData && animationState.extraData[id];
    return entry && entry.date_pos ? entry.date_pos.substring(0, 10) : null;
}

function progressLabelFor(index) {
    const total = animationState.animationList.length;
    if (!total) return '';
    const shown = Math.min(Math.max(index, 0), total);
    const id = animationState.animationList[Math.min(shown, total - 1)];
    const date = getEntryDate(id);
    return `${shown} / ${total}${date ? ' · ' + date : ''}`;
}

function updateProgressBar() {
    const bar = document.getElementById('animationProgress');
    const slider = document.getElementById('progressSlider');
    const label = document.getElementById('progressLabel');
    if (!bar || !slider || !label) return;
    const total = animationState.animationList.length;
    if (!total) return;
    slider.max = total;
    if (!animationState.scrubbing) {
        slider.value = animationState.nextIndex;
        label.textContent = progressLabelFor(animationState.nextIndex);
    }
    bar.classList.add('visible');
    document.body.classList.add('progress-visible');
}

function hideProgressBar() {
    const bar = document.getElementById('animationProgress');
    if (bar) bar.classList.remove('visible');
    document.body.classList.remove('progress-visible');
}

// Jump the animation to `target`, rebuilding the markers and the running totals
// as if it had played up to that point.
function seekToIndex(target) {
    const list = animationState.animationList;
    if (!list.length) return;
    target = Math.max(0, Math.min(target, list.length));
    const wasPlaying = animationState.isPlaying;

    animationState.runId++;
    clearInterval(animationState.spawnerTimer);
    clearTimeout(animationState.resumeTimeout);
    animationState.resumeTimeout = null;
    document.querySelectorAll('#animationOverlay .animation-card').forEach(el => el.remove());
    clearRedSquares();

    animationState.cumulatedDistance = 0;
    animationState.cumulatedPoints = 0;
    animationState.seenCities = new Set();
    animationState.lastLat = null;
    animationState.lastLng = null;

    let stats = '';
    for (let i = 0; i < target; i++) {
        const id = list[i];
        const pos = getInvaderPosition(id);
        if (!pos) continue;
        animationState.nextIndex = i + 1;
        stats = accumulateStats(id, { obf_lat: pos.lat, obf_lng: pos.lng });
        createSpriteMarker(pos.lat, pos.lng, id);
    }
    animationState.nextIndex = target;
    animationState.lastCity = null;  // fly to whichever city we land in

    const overlay = document.getElementById('animationStats');
    if (overlay) {
        overlay.textContent = stats;
        overlay.style.display = stats ? 'block' : 'none';
    }

    if (wasPlaying) {
        spawnNext();
        if (!animationState.resumeTimeout) {
            animationState.spawnerTimer = setInterval(spawnNext, animationState.spawnInterval);
        }
    }
    updateProgressBar();
}

function spawnNext() {
    if (!animationState.isPlaying) return;
    if (animationState.nextIndex >= animationState.animationList.length) {
        clearInterval(animationState.spawnerTimer);
        return;
    }

    // Peek at next invader without consuming
    const idx = animationState.nextIndex;
    const id = animationState.animationList[idx];
    const inv = invaders[id];
    const pos = getInvaderPosition(id);
    if (!pos) { animationState.nextIndex++; return; }
    const lat = pos.lat;
    const lng = pos.lng;

    // Auto-pan when city prefix changes (new or returning)
    if (animationState.autoPanOnCityChange) {
        const prefix = getCityPrefix(id);
        if (prefix !== animationState.lastCity) {
            const zoom = animationState.cityZoomLevels[prefix] || animationState.autoPanZoomDefault;
            const isNewCity = !animationState.seenCities.has(prefix);

            // Pause spawning, let the map settle, fly to the new city, then resume
            clearTimeout(animationState.resumeTimeout);
            clearInterval(animationState.spawnerTimer);
            const settleDelay = 2500;
            // Use precomputed city center
            const cityCenter = animationState.cityCenters[prefix] || { lat, lng };
            setTimeout(() => {
                if (!animationState.isPlaying) return;
                map.flyTo([cityCenter.lat, cityCenter.lng], zoom, { duration: 3 });
                if (isNewCity) {
                    showCityBonusBanner(prefix);
                }
            }, settleDelay);
            animationState.lastCity = prefix;
            const flyDuration = isNewCity ? 3200 : 2200;
            animationState.resumeTimeout = setTimeout(() => {
                if (animationState.isPlaying) {
                    animationState.spawnerTimer = setInterval(spawnNext, animationState.spawnInterval);
                }
            }, settleDelay + flyDuration);
            return;
        }
    }

    // Consume the index
    animationState.nextIndex++;

    updateStatsOverlay(id, inv || { obf_lat: lat, obf_lng: lng });
    updateProgressBar();

    // Start position on ellipse
    const start = getCirclePosition(idx * animationState.angleStep);
    // End position on map
    const end = map.latLngToContainerPoint([lat, lng]);

    // Create sprite element
    const sprite = document.createElement('div');
    sprite.className = 'animation-card active';

    // Use atlas image if available, fallback to text
    const bgStyle = getSpriteStyle(id);
    if (bgStyle) {
        sprite.innerHTML = `<div class="animation-image" style="${bgStyle}"></div>`;
    } else {
        sprite.innerHTML = `<div class="animation-image">${id}</div>`;
    }
    sprite.style.cssText = `position:fixed;width:600px;height:600px;left:${start.x}px;top:${start.y}px;transform:translate(-50%,-50%)`;
    sprite.dataset.lat = lat;
    sprite.dataset.lng = lng;
    sprite.dataset.startX = start.x;
    sprite.dataset.startY = start.y;
    sprite.style.setProperty('--anim-duration', animationState.animationSpeed + 'ms');
    sprite.style.setProperty('--start-x', start.x + 'px');
    sprite.style.setProperty('--start-y', start.y + 'px');
    sprite.style.setProperty('--end-x', end.x + 'px');
    sprite.style.setProperty('--end-y', end.y + 'px');

    document.getElementById('animationOverlay').appendChild(sprite);

    requestAnimationFrame(() => sprite.classList.add('shrinking'));

    const runId = animationState.runId;

    // Place mini sprite marker when animation reaches destination
    setTimeout(() => {
        if (animationState.runId !== runId) return;
        createSpriteMarker(lat, lng, id);
    }, animationState.animationSpeed * 0.95);

    // Self-destruct after animation, check if done
    setTimeout(() => {
        sprite.remove();
        if (animationState.runId !== runId) return;
        if (animationState.nextIndex >= animationState.animationList.length &&
            !document.querySelector('#animationOverlay .animation-card')) {
            finishAnimation();
        }
    }, animationState.animationSpeed + 200);
}

function updateAnimationEndpoints() {
    document.querySelectorAll('#animationOverlay .animation-card').forEach(sprite => {
        const lat = parseFloat(sprite.dataset.lat);
        const lng = parseFloat(sprite.dataset.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const pt = map.latLngToContainerPoint([lat, lng]);
        sprite.style.setProperty('--end-x', pt.x + 'px');
        sprite.style.setProperty('--end-y', pt.y + 'px');
    });
}

function onZoomAnim(e) {
    // Update endpoints to target zoom positions so sprites track during zoom
    const halfSize = map.getSize().divideBy(2);
    const centerProjected = map.project(e.center, e.zoom);
    document.querySelectorAll('#animationOverlay .animation-card').forEach(sprite => {
        const lat = parseFloat(sprite.dataset.lat);
        const lng = parseFloat(sprite.dataset.lng);
        if (isNaN(lat) || isNaN(lng)) return;
        const pt = map.project([lat, lng], e.zoom).subtract(centerProjected).add(halfSize);
        sprite.style.setProperty('--end-x', pt.x + 'px');
        sprite.style.setProperty('--end-y', pt.y + 'px');
    });
}

function onZoomEnd() {
    updateAnimationEndpoints();
}

function startAnimation(list, mode) {
    animationState.isPlaying = true;
    animationState.runId++;
    animationState.animationList = list;
    animationState.nextIndex = animationState.startIndex;
    animationState.mode = mode || 'pa';
    animationState.cumulatedDistance = 0;
    animationState.cumulatedPoints = 0;
    animationState.seenCities = new Set();
    animationState.lastCity = null;
    animationState.resumeTimeout = null;
    animationState.lastLat = null;
    animationState.lastLng = null;
    toggleMarkersVisibility(true);
    document.getElementById('animationOverlay').classList.add('active');
    map.on('move', updateAnimationEndpoints);
    map.on('zoomanim', onZoomAnim);
    map.on('zoomend', onZoomEnd);
    updateProgressBar();

    spawnNext();
    // Only start interval if spawnNext didn't trigger a city-change pause
    if (!animationState.resumeTimeout) {
        animationState.spawnerTimer = setInterval(spawnNext, animationState.spawnInterval);
    }
}

function finishAnimation() {
    animationState.isPlaying = false;
    map.off('move', updateAnimationEndpoints);
    map.off('zoomanim', onZoomAnim);
    map.off('zoomend', onZoomEnd);
    // Keep sprite markers visible, keep original markers hidden
    document.getElementById('animationOverlay').classList.remove('active');
}

function stopAnimation() {
    animationState.isPlaying = false;
    animationState.runId++;
    clearInterval(animationState.spawnerTimer);
    clearTimeout(animationState.resumeTimeout);
    animationState.resumeTimeout = null;
    map.off('move', updateAnimationEndpoints);
    map.off('zoomanim', onZoomAnim);
    map.off('zoomend', onZoomEnd);
    document.querySelectorAll('#animationOverlay .animation-card').forEach(el => el.remove());
    // Keep sprite markers visible, keep original markers hidden
    document.getElementById('animationOverlay').classList.remove('active');
}

function restoreDefaultView() {
    if (animationState.isPlaying) {
        animationState.isPlaying = false;
        animationState.runId++;
        clearInterval(animationState.spawnerTimer);
        clearTimeout(animationState.resumeTimeout);
        animationState.resumeTimeout = null;
        map.off('move', updateAnimationEndpoints);
        map.off('zoomanim', onZoomAnim);
        map.off('zoomend', onZoomEnd);
        document.querySelectorAll('#animationOverlay .animation-card').forEach(el => el.remove());
        document.getElementById('animationOverlay').classList.remove('active');
    }
    clearRedSquares();
    toggleMarkersVisibility(false);
    hideProgressBar();
    const stats = document.getElementById('animationStats');
    if (stats) stats.style.display = 'none';
}

// Build PA list sorted by number
function getPAList() {
    return Object.keys(invaders)
        .filter(id => id.startsWith('PA_'))
        .sort((a, b) => parseInt(a.split('_')[1]) - parseInt(b.split('_')[1]));
}

// Build user's flashed list sorted by date_flash
function getMyFlashedList() {
    if (!animationState.galleryData) return null;
    return Object.entries(animationState.galleryData.invaders)
        .filter(([id]) => invaders[id]) // only invaders we have on the map
        .sort((a, b) => a[1].date_flash.localeCompare(b[1].date_flash))
        .map(([id]) => id);
}

// Build all-invaders list sorted by date_pos from invaders_extra.json
function getAllList() {
    if (!animationState.extraData) return null;
    return Object.entries(animationState.extraData)
        .filter(([id, data]) => invaders[id] || (data.default_lat && data.default_lng))
        .sort((a, b) => a[1].date_pos.localeCompare(b[1].date_pos))
        .map(([id]) => id);
}

const progressSlider = document.getElementById('progressSlider');
progressSlider.addEventListener('input', function () {
    animationState.scrubbing = true;
    document.getElementById('progressLabel').textContent =
        progressLabelFor(parseInt(this.value, 10));
});
progressSlider.addEventListener('change', function () {
    animationState.scrubbing = false;
    seekToIndex(parseInt(this.value, 10));
});

// Clicking the running animation returns to the plain map; clicking another one
// switches to it. Returns false when the click was handled as a stop.
function beginAnimationRequest(mode) {
    if (animationState.isPlaying) {
        if (animationState.mode === mode) {
            restoreDefaultView();
            return false;
        }
        stopAnimation();
    }
    clearRedSquares();
    return true;
}

document.getElementById('startAnimation').addEventListener('click', function(e) {
    e.preventDefault();
    if (!beginAnimationRequest('pa')) return;
    startAnimation(getPAList(), 'pa');
});

document.getElementById('startMyAnimation').addEventListener('click', function(e) {
    e.preventDefault();
    if (!beginAnimationRequest('my')) return;

    const uid = localStorage.getItem('uid');
    if (!uid) {
        alert('Please enter your UID in Settings → Restore from app first.');
        return;
    }

    // Fetch gallery data if not cached
    if (animationState.galleryData) {
        const list = getMyFlashedList();
        if (list && list.length > 0) {
            startAnimation(list, 'my');
        }
        return;
    }

    const apiUrl = `https://api.space-invaders.com/flashinvaders_v3_pas_trop_predictif/api/gallery?uid=${uid}`;
    fetch(apiUrl)
        .then(r => r.json())
        .then(data => {
            animationState.galleryData = data;
            const list = getMyFlashedList();
            if (list && list.length > 0) {
                startAnimation(list, 'my');
                console.log(`Animate My: ${list.length} flashed mosaics, from ${data.invaders[list[0]].date_flash} to ${data.invaders[list[list.length-1]].date_flash}`);
            } else {
                alert('No flashed mosaics found for this UID.');
            }
        })
        .catch(() => alert('Error fetching gallery data. Check your UID in Settings.'));
});

document.getElementById('startAllAnimation').addEventListener('click', function(e) {
    e.preventDefault();
    if (!beginAnimationRequest('all')) return;

    // Load extra data if not cached
    if (animationState.extraData) {
        const list = getAllList();
        if (list && list.length > 0) {
            startAnimation(list, 'all');
        }
        return;
    }

    fetch('invaders_extra.json')
        .then(r => r.json())
        .then(data => {
            animationState.extraData = data;
            const list = getAllList();
            if (list && list.length > 0) {
                startAnimation(list, 'all');
                console.log(`Animate All: ${list.length} invaders, from ${data[list[0]].date_pos} to ${data[list[list.length-1]].date_pos}`);
            } else {
                alert('No invaders with placement dates found.');
            }
        })
        .catch(() => alert('Error loading invaders_extra.json.'));
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('Service Worker registered successfully with scope: ', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker registration failed: ', error);
            });
    });
}
