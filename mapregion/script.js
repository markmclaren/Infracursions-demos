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
                center: [-68.862935, -10.899291],
                zoom: 12,
                marker: [-68.862935, -10.899291],
                position: {
                    lng: -68.862935,
                    lat: -10.899291,
                    offset: { x: 50, y: 50 }
                }
            }
        };
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
                        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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
            center: [-68.250977, -10.245638],
            zoom: 6.5,
            minZoom: 3,
            maxZoom: 15
        });

        this.mainMap.addControl(new maplibregl.NavigationControl(), 'top-right');
        this.mainMap.addControl(new maplibregl.FullscreenControl(), 'top-right');

        this.mainMap.on('load', () => {
            this.onMainMapLoad();
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
