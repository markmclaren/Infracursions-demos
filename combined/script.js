// PMTiles Viewer JavaScript
let map;
let loadedYears = new Set([1985]); // Track loaded years for caching
let loadingPromises = new Map(); // Track ongoing loading operations

// Initialize PMTiles protocol with enhanced caching and diagnostics
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

// Enhanced loading with retry logic and timeout
const ORIGINAL_LOAD_FN = protocol.tile.load;
protocol.tile.load = function(url, callback) {
    const startTime = Date.now();

    // Add timeout and retry logic
    const loadWithRetry = (retryCount = 0) => {
        const timeout = setTimeout(() => {
            if (retryCount < 2) {
                console.log(`Retrying load for ${url}, attempt ${retryCount + 1}`);
                loadWithRetry(retryCount + 1);
            } else {
                callback(new Error(`Load timeout for ${url}`));
            }
        }, 10000 + (retryCount * 5000)); // 10s + 5s per retry

        ORIGINAL_LOAD_FN.call(this, url, (err, data) => {
            clearTimeout(timeout);
            if (err && retryCount < 2) {
                console.log(`Load failed for ${url}, retrying...`, err.message);
                setTimeout(() => loadWithRetry(retryCount + 1), 1000);
            } else {
                const loadTime = Date.now() - startTime;
                console.log(`Loaded ${url} in ${loadTime}ms`);
                callback(err, data);
            }
        });
    };

    loadWithRetry();
};

// Cache for loaded tile data
const tileCache = new Map();

// Performance monitoring
let loadStartTime = 0;

// Service Worker for caching
let serviceWorkerRegistration = null;


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

// Lazy loading for LULC layers - only load current and adjacent years
async function toggleLulcLayer(selectedYear) {
    // Hide all currently visible LULC layers first
    for (let year = 1985; year <= 2023; year++) {
        const layerId = `lulc${year}`;
        if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none');
        }
    }

    // Determine which years to load (current, previous, next)
    const yearsToLoad = [
        Math.max(1985, selectedYear - 1),
        selectedYear,
        Math.min(2023, selectedYear + 1)
    ].filter(year => year >= 1985 && year <= 2023);

    // Unload years that are no longer needed (not in current view range)
    const yearsToUnload = [];
    for (let year = 1985; year <= 2023; year++) {
        if (!yearsToLoad.includes(year) && loadedYears.has(year)) {
            yearsToUnload.push(year);
        }
    }

    // Unload unnecessary years first
    yearsToUnload.forEach(year => {
        const layerId = `lulc${year}`;
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }
        if (map.getSource(`lulc${year}`)) {
            map.removeSource(`lulc${year}`);
        }
        loadedYears.delete(year);
        loadingPromises.delete(year); // Clean up any pending promises
        // console.log(`Unloaded year ${year}`);
    });

    // Load required years
    for (const year of yearsToLoad) {
        if (!loadedYears.has(year)) {
            await loadYearLayer(year);
        }
    }

    // Show the selected year layer
    const selectedLayerId = `lulc${selectedYear}`;
    if (map.getLayer(selectedLayerId)) {
        map.setLayoutProperty(selectedLayerId, 'visibility', 'visible');
        // console.log(`Showing year ${selectedYear}`);
    }
}

// Load a specific year layer
async function loadYearLayer(year) {
    // If already loaded, return immediately
    if (loadedYears.has(year)) {
        return Promise.resolve();
    }

    // If currently loading, return existing promise
    if (loadingPromises.has(year)) {
        return loadingPromises.get(year);
    }

    const loadPromise = new Promise((resolve, reject) => {
        try {
            const sourceId = `lulc${year}`;
            const layerId = `lulc${year}`;

            // Check if source already exists (can happen with navigation back/forth)
            if (map.getSource(sourceId)) {
                console.log(`Source ${sourceId} already exists, just adding layer`);
                loadedYears.add(year);
                resolve();
                return;
            }

            // Add source for this year
            map.addSource(sourceId, {
                type: 'vector',
                url: `pmtiles://https://markmclaren.github.io/Infracursions-demos/combined/pmtiles/lulc_nat_ant_${year}_gpu.pmtiles`
            });

            // Add layer for this year
            map.addLayer({
                id: layerId,
                type: 'fill',
                source: sourceId,
                'source-layer': `lulc_nat_ant_${year}_gpu_wgs84_dissolved`,
                layout: {
                    visibility: 'none'
                },
                paint: {
                    'fill-color': [
                        'case',
                        ['==', ['get', 'DN'], 0], '#7AB5AA',
                        ['==', ['get', 'DN'], 1], '#5D877F',
                        'transparent'
                    ],
                    'fill-opacity': 0.8
                }
            });

            loadedYears.add(year);
            // console.log(`Loaded year ${year}`);
            resolve();

        } catch (error) {
            console.error(`Failed to load year ${year}:`, error);
            reject(error);
        }
    });

    loadingPromises.set(year, loadPromise);
    return loadPromise;
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
            // console.log(`Updating filter for layer: ${layerId}`);
            // console.log(`Selected year: ${selectedYear}`);
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

    // Show loading indicator
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    // Load the selected year (this will now be async)
    toggleLulcLayer(selectedYear).then(() => {
        // Hide loading indicator when done
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }).catch((error) => {
        console.error('Error loading year:', error);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.textContent = 'Error loading data';
            loadingIndicator.style.background = '#ffe7e7';
            loadingIndicator.style.color = '#cc0000';
        }
    });

    // updateNonLulcLayerFilters(selectedYear);
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

    // Add performance monitoring
    console.log('Performance monitoring enabled');
    if (window.performance) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            }, 1000);
        });
    }
});
