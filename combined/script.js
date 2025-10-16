// PMTiles Viewer JavaScript
let map;

// Initialize PMTiles protocol with simple diagnostics wrapper
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);


// Layer toggle functions
function toggleLayer(layerId) {
    if (map) {
        const checkbox = document.getElementById(layerId);
        const visibility = checkbox.checked ? 'visible' : 'none';
        map.setLayoutProperty(layerId, 'visibility', visibility);
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
        // Ensure the initial year layer is visible
        toggleLulcLayer(1985);
        // Apply initial year filters to non-LULC layers
        updateNonLulcLayerFilters(1985);
    });
}

// Year range handler
function updateYearDisplay(year) {
    const yearDisplay = document.getElementById('currentYear');
    if (yearDisplay) {
        yearDisplay.textContent = year;
    }
}

function toggleLulcLayer(selectedYear) {
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

function updateNonLulcLayerFilters(selectedYear) {
    // List of non-LULC layers that have year properties
    const nonLulcLayers = [
        'airstrip', 'car', 'conservation_unit', 'deforestation_deter',
        'indigenous_land', 'map_region', 'mining_detection',
        'non_designated_public_forest', 'rural_settlement',
        'sigef_private', 'sigef_public', 'snci_private', 'snci_public'
    ];

    nonLulcLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
            console.log(`Updating filter for layer: ${layerId}`);
            console.log(`Selected year: ${selectedYear}`);
            // Apply year filter using the unified 'year' property
            //const yearFilter = ['==', ['get', 'year'], selectedYear];
            //map.setFilter(layerId, yearFilter);
        }
    });
}

function handleYearChange() {
    const yearRange = document.getElementById('yearRange');
    const selectedYear = parseInt(yearRange.value);

    updateYearDisplay(selectedYear);
    toggleLulcLayer(selectedYear);
    updateNonLulcLayerFilters(selectedYear);
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
