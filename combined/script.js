// Simplified PMTiles Viewer JavaScript
let map;

// Initialize PMTiles protocol (needed for style.json)
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// Initialize map
function initMap() {
    map = new maplibregl.Map({
        container: 'map',
        style: 'style.json',
        center: [-65, -10],
        zoom: 4
    });

    map.on('load', function() {
        console.log('Map loaded successfully');
        updateYearDisplay(1985);
    });
}

// Layer toggle functions
function toggleLayer(layerId) {
    if (map && map.getLayer(layerId)) {
        const checkbox = document.getElementById(layerId);
        if (checkbox) {
            const visibility = checkbox.checked ? 'visible' : 'none';
            map.setLayoutProperty(layerId, 'visibility', visibility);
        }
    }
}

function toggleAllLayers() {
    const checkboxes = document.querySelectorAll('.layer-item input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const newState = !allChecked;

    checkboxes.forEach(checkbox => {
        checkbox.checked = newState;
        toggleLayer(checkbox.id);
    });
}

// Year display handler
function updateYearDisplay(year) {
    const yearDisplay = document.getElementById('currentYear');
    if (yearDisplay) {
        yearDisplay.textContent = year;
    }
}

// Simple year change handler - just show the selected LULC year layer
function handleYearChange() {
    const yearRange = document.getElementById('yearRange');
    const selectedYear = parseInt(yearRange.value);

    updateYearDisplay(selectedYear);

    // Hide all LULC layers first
    for (let year = 1985; year <= 2023; year++) {
        const layerId = `lulc${year}`;
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none');
        }
    }

    // Show the selected year layer
    const selectedLayerId = `lulc${selectedYear}`;
    if (map.getLayer(selectedLayerId)) {
        map.setLayoutProperty(selectedLayerId, 'visibility', 'visible');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    // Add year range event listener
    const yearRange = document.getElementById('yearRange');
    if (yearRange) {
        yearRange.addEventListener('input', handleYearChange);
        // Initialize with default year (1985)
        updateYearDisplay(1985);
    }
});
