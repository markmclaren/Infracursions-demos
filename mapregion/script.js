// MapLibre Amazon Rainforest Map with Interactive Insets
class AmazonMap {
    constructor() {
        this.mainMap = null;
        this.insetMaps = {};
        this.markers = {};
        this.activeInsets = new Set();
        this.locations = {
            acre: {
                name: "Acre, Brazil",
                subtitle: "Land grabbing",
                center: [-67.912299, -10.576747],
                zoom: 12,
                marker: [-67.912299, -10.576747],
                position: {
                    lng: -67.912299,
                    lat: -10.576747,
                    offset: { x: -150, y: -250 }
                }
            },
            madre: {
                name: "Madre de Dios, Peru",
                subtitle: "Gold mining",
                center: [-70.167261, -12.591915],
                zoom: 15,
                marker: [-70.167261, -12.591915],
                position: {
                    lng: -70.167261,
                    lat: -12.591915,
                    offset: { x: -200, y: -250 }
                }
            },
            pando: {
                name: "Pando, Bolivia",
                subtitle: "Logging",
                center: [-68.984913, -11.617947],
                zoom: 12,
                marker: [-68.984913, -11.617947],
                position: {
                    lng: -68.984913,
                    lat: -11.617947,
                    offset: { x: 50, y: 50 }
                }
            }
        };
    }

    // Load GeoJSON region data and add to map
    loadRegionData() {
        // Define region configurations with styling
        const regions = {
            acre: {
                file: 'acre.geojson',
                color: '#e74c3c', // Red for Acre (Brazil)
                opacity: 0.3
            },
            madre: {
                file: 'madrede_dios.geojson',
                color: '#f39c12', // Orange for Madre de Dios (Peru)
                opacity: 0.3
            },
            pando: {
                file: 'pando.geojson',
                color: '#27ae60', // Green for Pando (Bolivia)
                opacity: 0.3
            }
        };

        // Load each region
        Object.keys(regions).forEach(key => {
            const region = regions[key];

            // Load GeoJSON file
            fetch(region.file)
                .then(response => response.json())
                .then(data => {
                    // Add source to map
                    this.mainMap.addSource(`region-${key}`, {
                        type: 'geojson',
                        data: data
                    });

                    // Add fill layer
                    this.mainMap.addLayer({
                        id: `region-fill-${key}`,
                        type: 'fill',
                        source: `region-${key}`,
                        paint: {
                            'fill-color': region.color,
                            'fill-opacity': region.opacity,
                            'fill-opacity-transition': {
                                duration: 300
                            }
                        }
                    });

                    // Add border layer
                    this.mainMap.addLayer({
                        id: `region-border-${key}`,
                        type: 'line',
                        source: `region-${key}`,
                        paint: {
                            'line-color': this.darkenColor(region.color, 0.3),
                            'line-width': 2,
                            'line-opacity': 0.8
                        }
                    });

                    // Add hover effects
                    this.addRegionInteractivity(key, region);
                })
                .catch(error => {
                    console.error(`Error loading ${region.file}:`, error);
                });
        });
    }

    // Add interactivity to region polygons
    addRegionInteractivity(regionKey, regionConfig) {
        const map = this.mainMap;

        // Hover effect - increase opacity on hover
        map.on('mouseenter', `region-fill-${regionKey}`, () => {
            map.setPaintProperty(`region-fill-${regionKey}`, 'fill-opacity', regionConfig.opacity * 1.5);
            map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', `region-fill-${regionKey}`, () => {
            map.setPaintProperty(`region-fill-${regionKey}`, 'fill-opacity', regionConfig.opacity);
            map.getCanvas().style.cursor = '';
        });

        // Click effect - show region info
        map.on('click', `region-fill-${regionKey}`, (e) => {
            e.originalEvent.stopPropagation();

            // Get region name from locations data
            const location = this.locations[regionKey];
            if (location) {
                // Create popup with region information
                new maplibregl.Popup()
                    .setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="font-family: 'Courier New', Courier, monospace;">
                            <strong style="font-size: 16px;">${location.name}</strong><br>
                            <span style="font-size: 14px; opacity: 0.9;">${location.subtitle}</span><br>
                            <small style="opacity: 0.7;">Click marker for detailed view</small>
                        </div>
                    `)
                    .addTo(map);
            }
        });
    }

    // Helper function to darken colors for borders
    darkenColor(color, percent) {
        // Convert hex color to RGB, darken it, then return as hex
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const darkenedR = Math.max(0, Math.floor(r * (1 - percent)));
        const darkenedG = Math.max(0, Math.floor(g * (1 - percent)));
        const darkenedB = Math.max(0, Math.floor(b * (1 - percent)));

        return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
    }

    initialize() {
        // Initialize main map
        this.mainMap = new maplibregl.Map({
            container: 'map',
            style: {
                version: 8,
                sources: {
                    'satellite': {
                        type: 'raster',
                        tiles: [
                            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        ],
                        tileSize: 256,
                        attribution: '© Esri & GIS User Community'
                    }
                },
                layers: [
                    {
                        id: 'satellite-layer',
                        type: 'raster',
                        source: 'satellite',
                        minzoom: 0,
                        maxzoom: 16
                    }
                ]
            },
            center: [-69.686875, -10.381195],
            zoom: 6.5,
            minZoom: 3,
            maxZoom: 15
        });

        this.mainMap.addControl(new maplibregl.NavigationControl(), 'top-right');
        this.mainMap.addControl(new maplibregl.FullscreenControl(), 'top-right');

        this.mainMap.on('load', () => {
            this.loadRegionData();
            this.onMainMapLoad();
            this.showAllInsetsByDefault();
        });

        this.mainMap.on('zoom', () => {
            this.handleZoomChange();
        });

        this.mainMap.on('move', () => {
            this.updateInsetPositions();
        });
    }

    onMainMapLoad() {
        // Create markers for each location
        Object.keys(this.locations).forEach(key => {
            const location = this.locations[key];

            // Create custom marker element
            const markerElement = document.createElement('div');
            markerElement.className = 'custom-marker';
            markerElement.style.width = '20px';
            markerElement.style.height = '20px';
            markerElement.style.borderRadius = '50%';
            markerElement.style.background = '#4A90E2';
            markerElement.style.border = '3px solid white';
            markerElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            markerElement.style.cursor = 'pointer';

            // Create popup
            const popup = new maplibregl.Popup({
                offset: 25,
                closeButton: false,
                closeOnClick: false
            }).setHTML(`
                <strong>${location.name}</strong><br>
                <span style="font-size: 12px; opacity: 0.8;">${location.subtitle}</span><br>
                <small>Click to view details</small>
            `);

            // Create marker
            const marker = new maplibregl.Marker(markerElement)
                .setLngLat(location.marker)
                .setPopup(popup)
                .addTo(this.mainMap);

            // Add click handler
            markerElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleInset(key);
            });

            this.markers[key] = marker;
        });

        // Initialize inset maps
        this.initializeInsetMaps();
    }

    initializeInsetMaps() {
        Object.keys(this.locations).forEach(key => {
            const location = this.locations[key];
            const insetMapElement = document.getElementById(`inset-map-${key}`);

            if (insetMapElement) {
                this.insetMaps[key] = new maplibregl.Map({
                    container: insetMapElement,
                    style: {
                        version: 8,
                        sources: {
                            'satellite': {
                                type: 'raster',
                                tiles: [
                                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                                ],
                                tileSize: 256
                            }
                        },
                        layers: [
                            {
                                id: 'satellite-layer',
                                type: 'raster',
                                source: 'satellite',
                                minzoom: 0,
                                maxzoom: 16
                            }
                        ]
                    },
                    center: location.center,
                    zoom: location.zoom,
                    interactive: true
                });
            }
        });
    }

    toggleInset(locationKey) {
        const insetWindow = document.getElementById(`inset-${locationKey}`);
        const insetLabel = document.getElementById(`label-${locationKey}`);
        const insetLine = document.getElementById(`line-${locationKey}`);

        if (this.activeInsets.has(locationKey)) {
            // Hide inset
            this.activeInsets.delete(locationKey);
            insetWindow.classList.remove('visible');
            insetLabel.classList.remove('visible');
            insetLine.classList.remove('visible');
        } else {
            // Show inset
            this.activeInsets.add(locationKey);
            insetWindow.classList.add('visible');
            insetLabel.classList.add('visible');
            insetLine.classList.add('visible');

            // Position label and line
            this.positionMarkerAndLine(locationKey);

            // Ensure inset map is loaded
            if (this.insetMaps[locationKey] && !this.insetMaps[locationKey].loaded()) {
                this.insetMaps[locationKey].on('load', () => {
                    this.insetMaps[locationKey].setCenter(this.locations[locationKey].center);
                    this.insetMaps[locationKey].setZoom(this.locations[locationKey].zoom);
                });
            }
        }
    }

    closeInset(locationKey) {
        const insetWindow = document.getElementById(`inset-${locationKey}`);
        const insetLabel = document.getElementById(`label-${locationKey}`);
        const insetLine = document.getElementById(`line-${locationKey}`);
        this.activeInsets.delete(locationKey);
        insetWindow.classList.remove('visible');
        insetLabel.classList.remove('visible');
        insetLine.classList.remove('visible');
    }

    handleZoomChange() {
        const currentZoom = this.mainMap.getZoom();

        // Show/hide insets based on zoom level
        if (currentZoom >= 7) {
            // At higher zoom levels, show insets when active
            this.activeInsets.forEach(key => {
                const insetWindow = document.getElementById(`inset-${key}`);
                const insetLabel = document.getElementById(`label-${key}`);
                const insetLine = document.getElementById(`line-${key}`);
                if (insetWindow && !insetWindow.classList.contains('visible')) {
                    insetWindow.classList.add('visible');
                    insetLabel.classList.add('visible');
                    insetLine.classList.add('visible');
                    this.positionMarkerAndLine(key);
                }
            });
        } else {
            // At lower zoom levels, hide all insets
            this.activeInsets.forEach(key => {
                const insetWindow = document.getElementById(`inset-${key}`);
                const insetLabel = document.getElementById(`label-${key}`);
                const insetLine = document.getElementById(`line-${key}`);
                if (insetWindow) {
                    insetWindow.classList.remove('visible');
                    insetLabel.classList.remove('visible');
                    insetLine.classList.remove('visible');
                }
            });
            this.activeInsets.clear();
        }
    }

    // Convert geographic coordinates to screen coordinates
    geographicToScreen(lng, lat) {
        const container = document.querySelector('.map-container');
        const containerRect = container.getBoundingClientRect();
        const map = this.mainMap;

        // Project geographic coordinates to world coordinates
        const point = map.project([lng, lat]);

        // Convert world coordinates to screen coordinates
        const screenX = point.x;
        const screenY = point.y;

        return { x: screenX, y: screenY };
    }

    // Position inset based on geographic coordinates
    positionInsetGeographically(locationKey) {
        const location = this.locations[locationKey];
        const insetWindow = document.getElementById(`inset-${locationKey}`);

        if (!insetWindow || !location.position) return;

        // Convert geographic position to screen coordinates
        const screenPos = this.geographicToScreen(location.position.lng, location.position.lat);

        // Apply offset
        const finalX = screenPos.x + (location.position.offset?.x || 0);
        const finalY = screenPos.y + (location.position.offset?.y || 0);

        // Position the inset window
        insetWindow.style.left = `${finalX}px`;
        insetWindow.style.top = `${finalY}px`;
        insetWindow.style.position = 'absolute';

        return {
            x: finalX,
            y: finalY,
            width: insetWindow.offsetWidth,
            height: insetWindow.offsetHeight
        };
    }

    positionMarkerAndLine(locationKey) {
        const insetWindow = document.getElementById(`inset-${locationKey}`);
        const insetLabel = document.getElementById(`label-${locationKey}`);
        const insetLine = document.getElementById(`line-${locationKey}`);
        const marker = this.markers[locationKey];

        if (!insetWindow || !insetLine || !marker) return;

        // First position the inset geographically
        const insetPos = this.positionInsetGeographically(locationKey);

        const container = document.querySelector('.map-container');
        const containerRect = container.getBoundingClientRect();
        const windowRect = insetWindow.getBoundingClientRect();

        // Get marker position on screen
        const markerLngLat = marker.getLngLat();
        const markerScreenPos = this.geographicToScreen(markerLngLat.lng, markerLngLat.lat);

        // Calculate center of inset window
        const windowCenterX = windowRect.left + windowRect.width / 2 - containerRect.left;
        const windowCenterY = windowRect.top + windowRect.height / 2 - containerRect.top;

        // Position label (adjust based on inset position)
        const labelRect = insetLabel.getBoundingClientRect();
        let labelX, labelY;

        if (locationKey === 'acre') {
            // Acre - position label to the left of inset
            labelX = windowRect.left - labelRect.width - 20;
            labelY = windowCenterY - labelRect.height / 2;
        } else if (locationKey === 'madre') {
            // Madre - position label above inset
            labelX = windowCenterX - labelRect.width / 2;
            labelY = windowRect.top - labelRect.height - 15;
        } else if (locationKey === 'pando') {
            // Pando - position label to the right of inset
            labelX = windowRect.right + 20;
            labelY = windowCenterY - labelRect.height / 2;
        }

        if (insetLabel) {
            insetLabel.style.left = `${labelX}px`;
            insetLabel.style.top = `${labelY}px`;
        }

        // Position and rotate connection line from marker to inset center
        const lineStartX = markerScreenPos.x;
        const lineStartY = markerScreenPos.y;
        const lineEndX = windowCenterX;
        const lineEndY = windowCenterY;

        const deltaX = lineEndX - lineStartX;
        const deltaY = lineEndY - lineStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

        insetLine.style.left = `${lineStartX}px`;
        insetLine.style.top = `${lineStartY}px`;
        insetLine.style.width = `${distance}px`;
        insetLine.style.transform = `rotate(${angle}deg)`;
        insetLine.style.transformOrigin = '0 0';
    }

    // Method to update inset positions (useful for responsive design)
    updateInsetPositions() {
        Object.keys(this.locations).forEach(key => {
            if (this.activeInsets.has(key)) {
                this.positionMarkerAndLine(key);
            }
        });
    }

    // Helper method to set new geographic position for an inset
    // Example usage: amazonMap.setInsetPosition('acre', -67.912299, -10.576747, { x: -100, y: -50 });
    setInsetPosition(locationKey, lng, lat, offset = { x: 0, y: 0 }) {
        if (this.locations[locationKey]) {
            this.locations[locationKey].position = {
                lng: lng,
                lat: lat,
                offset: offset
            };

            // Update position if inset is currently visible
            if (this.activeInsets.has(locationKey)) {
                this.positionMarkerAndLine(locationKey);
            }
        }
    }

    // Helper method to get current screen position of a geographic coordinate
    // Useful for debugging or manual positioning
    getScreenPosition(lng, lat) {
        return this.geographicToScreen(lng, lat);
    }

    // Show all insets by default when map loads
    showAllInsetsByDefault() {
        // Set all locations as active
        Object.keys(this.locations).forEach(key => {
            this.activeInsets.add(key);
        });

        // Show all insets after a short delay to ensure DOM elements are ready
        setTimeout(() => {
            Object.keys(this.locations).forEach(key => {
                const insetWindow = document.getElementById(`inset-${key}`);
                const insetLabel = document.getElementById(`label-${key}`);
                const insetLine = document.getElementById(`line-${key}`);

                if (insetWindow && insetLabel && insetLine) {
                    // Show the inset elements
                    insetWindow.classList.add('visible');
                    insetLabel.classList.add('visible');
                    insetLine.classList.add('visible');

                    // Position everything correctly
                    this.positionMarkerAndLine(key);

                    // Ensure inset map is loaded and positioned correctly
                    if (this.insetMaps[key] && !this.insetMaps[key].loaded()) {
                        this.insetMaps[key].on('load', () => {
                            this.insetMaps[key].setCenter(this.locations[key].center);
                            this.insetMaps[key].setZoom(this.locations[key].zoom);
                        });
                    }
                }
            });
        }, 100); // Small delay to ensure all elements are rendered
    }


}

// Global function for close buttons
function closeInset(locationKey) {
    window.amazonMap.closeInset(locationKey);
}



// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.amazonMap = new AmazonMap();
    window.amazonMap.initialize();

    // Handle window resize for responsive insets
    window.addEventListener('resize', () => {
        window.amazonMap.updateInsetPositions();
    });
});
