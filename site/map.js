/*
Icons:
 - https://github.com/python-visualization/folium/issues/617
 - https://getbootstrap.com/docs/3.3/components/#glyphicons
 - https://fontawesome.com/v4.7.0/icons/ , with prefix='fa'
*/

let iconNames = {
    'OK': 'camera',
    'damaged': 'camera',
    'destroyed': 'remove',
    'hidden': 'eye-close'
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

function refreshMarker(id) {
    let invader = invaders[id];

    // Icon.
    var customIcon = L.AwesomeMarkers.icon({
        "extraClasses": "fa-rotate-0",
        "icon": iconNames[invader.status] || 'wrench',
        "iconColor": "white",
        "markerColor": iconColors[invader.status] || 'red',
        "prefix": "glyphicon"
    });
    const isCollected = collectedIds.has(id);
    if (isCollected) {
        customIcon.options.markerColor = 'lightgray';
    }
    invader.marker.setIcon(customIcon);

    // Popup.
    var popupContent = `<h4>${invader.id} (${invader.status})</h4>`;
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
    invader.marker.bindPopup(`<div>` + popupContent + `</div>`);

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
    /*maxClusterRadius: 50,*/
    disableClusteringAtZoom: 15,
    spiderfyOnMaxZoom: false,
});
map.addLayer(markers);

L.control.scale({
    position: 'topright',
}).addTo(map);

var tile_layer;
var tileset = new URLSearchParams(window.location.search).get('tileset');
if (tileset === 'st') {
    tile_layer = L.tileLayer(
        "https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}{r}.png",
        { "attribution": "\u0026copy; \u003ca href=\"https://stadiamaps.com/\" target=\"_blank\"\u003eStadia Maps\u003c/a\u003e\n\u0026copy; \u003ca href=\"https://www.stamen.com/\" target=\"_blank\"\u003eStamen Design\u003c/a\u003e\n\u0026copy; \u003ca href=\"https://openmaptiles.org/\" target=\"_blank\"\u003eOpenMapTiles\u003c/a\u003e\n\u0026copy; \u003ca href=\"https://www.openstreetmap.org/about/\" target=\"_blank\"\u003eOpenStreetMap contributors\u003c/a\u003e", "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 0, "noWrap": false, "opacity": 1, "subdomains": "abc", "tms": false }
    );
} else if (tileset === 'grau') {
    tile_layer = L.tileLayer(
        'https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web_grau/default/WEBMERCATOR/{z}/{y}/{x}.png',
        { "attribution": 'Map data: \u0026copy; \u003ca href="https://www.govdata.de/dl-de/by-2-0"\u003edl-de/by-2-0\u003c/a\u003e' }
    );
} else if (tileset === 'none') {
    // No tile layer.
} else if (tileset === 'osm') {
    tile_layer = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            "attribution": '\u0026copy; \u003ca href="https://www.openstreetmap.org/copyright"\u003eOpenStreetMap\u003c/a\u003e contributors',
        }
    );
} else {
    tile_layer = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            "attribution": '\u0026copy; \u003ca href="https://www.openstreetmap.org/copyright"\u003eOpenStreetMap\u003c/a\u003e contributors',
            "className": "grayscale",
        }
    );
}
if (tile_layer) {
    tile_layer.addTo(map);
}

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

fetch('invaders.json?nocache=1')
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
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const invaderIds = Object.keys(data.invaders);
            statusSpan.innerHTML = `✅ ${invaderIds.length} mosaics marked as flashed`;
            collectedIds = new Set(invaderIds)
            saveCollectedIds();
            refreshAll();

            localStorage.setItem('uid', uid);
        })
        .catch(error => {
            statusSpan.innerHTML = `⚠️ Error fetching data`;
        });
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
