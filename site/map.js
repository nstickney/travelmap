// Global state for filtering
const selectedVisitors = new Set();
const allMarkers = [];
let familyColors = {};

// Define different tile layers (map styles)
const openStreetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true,
    attribution: '© OpenStreetMap contributors'
});

const osmHot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19,
    noWrap: true,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>'
});

const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    noWrap: true,
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
});

const openTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    noWrap: true,
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
});

const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
});

const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
    noWrap: true
});

const cyclOSM = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
    maxZoom: 20,
    noWrap: true,
    attribution: '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Function to calculate the minimum zoom to fit the map height and width
function getMinZoom() {
    const mapDiv = document.getElementById('map');
    // Fallback to window dimensions if mapDiv isn't yet rendered with size
    const height = (mapDiv && mapDiv.clientHeight > 0) ? mapDiv.clientHeight : window.innerHeight;
    const width = (mapDiv && mapDiv.clientWidth > 0) ? mapDiv.clientWidth : window.innerWidth;
    
    // Each tile is 256px. Zoom 0 is 1 tile (256px) for the whole world.
    const zoomH = Math.log2(height / 256);
    const zoomW = Math.log2(width / 256);
    
    // We want the zoom level that ensures the world is at least as large as the screen in both dimensions
    return Math.max(0, Math.ceil(Math.max(zoomH, zoomW)));
}

// Initialize the map centered on the world with the default layer
const initialZoom = getMinZoom();
const map = L.map('map', {
    center: [20, 0],
    zoom: initialZoom,
    minZoom: initialZoom,
    layers: [openStreetMap],
    worldCopyJump: false,
    maxBounds: [[-85, -180], [85, 180]], // Strictly limit to world bounds
    maxBoundsViscosity: 1.0
});

// Update minZoom and current zoom on window resize
window.addEventListener('resize', () => {
    const newMinZoom = getMinZoom();
    map.setMinZoom(newMinZoom);
    if (map.getZoom() < newMinZoom) {
        map.setZoom(newMinZoom);
    }
});

// Create an object for the layer switcher menu
const baseMaps = {
    "Open Street Map": openStreetMap,
    "OSM Humanitarian": osmHot,
    "Open Topographic Map": openTopoMap,
    "ESRI Satellite Imagery": esri,
    "CARTO Light (Positron)": cartoPositron,
    "CARTO Dark (Matter)": cartoDark,
    "CyclOSM (Cycling)": cyclOSM
};

// Add the layer control menu to the map
L.control.layers(baseMaps).addTo(map);

function applyFilters() {
    const isFiltering = selectedVisitors.size > 0;
    const selectedArray = Array.from(selectedVisitors);
    allMarkers.forEach((marker, index) => {
        if (!isFiltering) {
            marker.setOpacity(1.0);
            // Default layering: chronological (newest on top)
            // Using index ensures newer items (later in allMarkers) are on top
            marker.setZIndexOffset(index);
        } else {
            const hasMatch = selectedArray.every(v => marker.visitors.includes(v));
            marker.setOpacity(hasMatch ? 1.0 : 0.2);
            
            // If it matches, put it in a much higher "layer" (100,000 boost)
            // Non-matches stay at their base chronological z-index
            marker.setZIndexOffset(hasMatch ? 100000 + index : index);
        }
    });
}

// Define a custom Legend Control
L.Control.Legend = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    initialize: function (familyColors, options) {
        L.Util.setOptions(this, options);
        this._familyColors = familyColors;
    },

    onAdd: function (map) {
        this._container = L.DomUtil.create('div', 'leaflet-control-legend leaflet-bar leaflet-control');
        this._container.id = 'legend';
        this._render();
        this._initEvents();
        return this._container;
    },

    _render: function () {
        this._container.innerHTML = Object.entries(this._familyColors).map(([name, color]) => `
            <div class="legend-item" data-visitor="${name}">
                <div class="legend-color" style="background: ${color}"></div>
                <span>${name}</span>
            </div>
        `).join('') + `
            <button class="clear-filter-btn">Clear Filter</button>
        `;
    },

    _initEvents: function () {
        L.DomEvent.on(this._container, 'click', (e) => {
            const item = e.target.closest('.legend-item');
            if (item) {
                const visitor = item.getAttribute('data-visitor');
                if (selectedVisitors.has(visitor)) {
                    selectedVisitors.delete(visitor);
                } else {
                    selectedVisitors.add(visitor);
                }
                applyFilters();
                this.update();
                return;
            }

            if (e.target.classList.contains('clear-filter-btn')) {
                selectedVisitors.clear();
                applyFilters();
                this.update();
            }
        });
    },

    update: function () {
        this._container.querySelectorAll('.legend-item').forEach(item => {
            const name = item.querySelector('span').textContent;
            if (selectedVisitors.has(name)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        const clearBtn = this._container.querySelector('.clear-filter-btn');
        if (clearBtn) {
            if (selectedVisitors.size > 0) {
                clearBtn.classList.add('visible');
            } else {
                clearBtn.classList.remove('visible');
            }
        }
    }
});

let legend; // Will be initialized after fetching people.json


// Function to generate a multi-colored marker icon
function getMarkerIcon(visitors, isLived) {
    const shadowStyle = 'box-shadow: 0 2px 5px rgba(0,0,0,0.5);';
    // Use a lighter border for dark mode residencies to make them pop
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    let borderColor = isLived ? 'black' : 'white';
    if (isDark && isLived) borderColor = '#444'; // Dark grey instead of pure black for lived-in

    const borderStyle = `border: 0.125em solid ${borderColor};`;
    
    if (!visitors || visitors.length === 0) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: grey; border-radius: 50%; ${borderStyle} ${shadowStyle}"></div>`,
            iconSize: null,
            iconAnchor: null
        });
    }

    if (visitors.length === 1) {
        const color = familyColors[visitors[0]] || 'grey';
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${color}; border-radius: 50%; ${borderStyle} ${shadowStyle}"></div>`,
            iconSize: null,
            iconAnchor: null
        });
    }

    // Generate conic-gradient for multiple visitors
    const sliceSize = 100 / visitors.length;
    let gradientParts = [];
    visitors.forEach((visitor, index) => {
        const color = familyColors[visitor] || 'grey';
        const start = index * sliceSize;
        const end = (index + 1) * sliceSize;
        gradientParts.push(`${color} ${start}% ${end}%`);
    });

    const gradient = `conic-gradient(${gradientParts.join(', ')})`;
    
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${gradient}; border-radius: 50%; ${borderStyle} ${shadowStyle}"></div>`,
        iconSize: null,
        iconAnchor: null
    });
}

// Helper to format the standardized date back to human-friendly strings
function formatDateForDisplay(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') return dateStr;
    
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    if (day && month) {
        return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
    } else if (month) {
        return `${months[parseInt(month, 10) - 1]} ${year}`;
    }
    return year;
}

// Helper to format the list of entries (lived or visited)
function formatEntries(entries, label) {
    if (!entries || !Array.isArray(entries) || entries.length === 0) return '';
    
    const entryLines = entries.map(e => {
        let dateText = formatDateForDisplay(e.date) || '';
        if (e.start && e.end) {
            dateText = `${formatDateForDisplay(e.start)} - ${formatDateForDisplay(e.end)}`;
        } else if (e.start) {
            dateText = `${formatDateForDisplay(e.start)} - Present`;
        }
        
        const tripVisitors = (e.visitors && e.visitors.length > 0) 
            ? ` (${e.visitors.join(', ')})` 
            : '';
            
        return dateText + tripVisitors;
    }).filter(e => e !== '');

    if (entryLines.length === 0) return '';
    
    return `<div class="entry-section">
        <div class="entry-label">${label}</div>
        ${entryLines.map(line => `<div class="entry-line">• ${line}</div>`).join('')}
    </div>`;
}

// Helper to parse standardized YYYY[-MM[-DD]] dates for sorting
function parseToTimestamp(dateStr) {
    if (!dateStr || dateStr.toLowerCase() === 'present') return Date.now();
    
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
    const day = parts[2] ? parseInt(parts[2], 10) : 1;
    
    const d = new Date(year, month, day);
    return d.getTime();
}

// Get the latest activity timestamp for a location
function getLatestTimestamp(location) {
    const dates = [];
    if (location.lived) {
        location.lived.forEach(l => {
            dates.push(parseToTimestamp(l.end || l.start || l.date));
        });
    }
    if (location.visits) {
        location.visits.forEach(v => {
            dates.push(parseToTimestamp(v.end || v.date || v.start));
        });
    }
    return dates.length > 0 ? Math.max(...dates) : 0;
}

// Get unique visitors for a location
function getUniqueVisitors(location) {
    const visitorsSet = new Set();
    if (location.lived) location.lived.forEach(l => l.visitors?.forEach(v => visitorsSet.add(v)));
    if (location.visits) location.visits.forEach(v => v.visitors?.forEach(p => visitorsSet.add(p)));
    return Array.from(visitorsSet);
}

// Fetch people config, then locations and add markers
fetch('people.json')
    .then(response => response.json())
    .then(people => {
        familyColors = people;
        legend = new L.Control.Legend(people).addTo(map);
        return fetch('locations.json');
    })
    .then(response => response.json())
    .then(data => {
        // Sort by visitor count (ASC) then by latest timestamp (ASC)
        // This ensures markers with more people and more recent dates are processed later 
        // and thus receive a higher z-index offset in applyFilters.
        data.sort((a, b) => {
            const visitorsA = getUniqueVisitors(a);
            const visitorsB = getUniqueVisitors(b);
            
            if (visitorsA.length !== visitorsB.length) {
                return visitorsA.length - visitorsB.length;
            }
            return getLatestTimestamp(a) - getLatestTimestamp(b);
        });

        data.forEach(location => {
            const livedEntries = location.lived || [];
            const isLived = livedEntries.length > 0;
            
            const allVisitors = getUniqueVisitors(location);
            
            const icon = getMarkerIcon(allVisitors, isLived);
            const marker = L.marker([location.lat, location.lng], { icon: icon }).addTo(map);
            
            // Store data for filtering
            marker.visitors = allVisitors;
            allMarkers.push(marker);
            
            const livedHtml = formatEntries(location.lived, 'Lived');
            const visitsHtml = formatEntries(location.visits, 'Visits');
            
            marker.bindPopup(`
                <div class="custom-popup-content">
                    <b class="popup-title">${location.name}</b>
                    ${livedHtml}
                    ${visitsHtml}
                </div>
            `);
        });

        // Apply initial layering (newest on top)
        applyFilters();
    })
    .catch(error => console.error('Error loading locations:', error));
