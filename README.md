# Infracursions - Deforestation Visualizations

Interactive visualizations of deforestation patterns across South American protected territories using RAISG data.

## Demos

This repository contains three interactive map visualizations:

### 1. 2D Choropleth Map (`/choropleth/`)
Interactive 2D choropleth visualization showing deforestation patterns across South American protected territories.

**Features:**
- Interactive year slider (2001-2020)
- Country filtering (Brasil, Bolivia, Perú)
- Territory type toggles (Bosque Protector, Departamental, Nacional, Indigenous)
- Hover information panels
- Color-coded legend

### 2. 3D Choropleth Map (`/choropleth3d/`)
Three-dimensional visualization where territory height represents deforestation intensity.

**Features:**
- 3D extruded territories
- Height-based data representation
- Interactive camera controls
- Same filtering capabilities as 2D version
- Enhanced visual impact

### 3. Combined Analysis (`/combined/`)
Comprehensive analysis combining multiple data sources with extended time series (1985-2023).

**Features:**
- Extended timeline (1985-2023)
- Multiple PMTiles data sources
- Advanced layering system
- Research-grade visualization

## Technical Details

### Built With
- **MapLibre GL JS** - Open-source mapping library
- **PMTiles** - Cloud-optimized + compressed vector tiles
- **Bootstrap 5** - Responsive styling
- **HTML5/JavaScript** - Pure web technologies

### Data Sources
- **RAISG** (Amazonian Network of Georeferenced Socio-Environmental Information)
- Territory boundaries and deforestation data for South American protected areas

### Browser Compatibility
- Modern browsers with WebGL support
- Chrome, Firefox, Safari, Edge (recent versions)
- Mobile browsers supported

## About the Data

These visualizations show deforestation patterns in South American territories including:
- Protected forests (Bosque Protector)
- Departmental territories
- National territories
- Indigenous territories

The data covers multiple years and allows for temporal analysis of deforestation trends across different territory types and countries.

## License

The visualization code is open-source. Data sources and territorial information belong to their respective owners (RAISG network).