#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Year groups for consolidation - 5 years per PMTile with separate layers
const yearGroups = [
  { name: '1985-1989', years: [1985, 1986, 1987, 1988, 1989] },
  { name: '1990-1994', years: [1990, 1991, 1992, 1993, 1994] },
  { name: '1995-1999', years: [1995, 1996, 1997, 1998, 1999] },
  { name: '2000-2004', years: [2000, 2001, 2002, 2003, 2004] },
  { name: '2005-2009', years: [2005, 2006, 2007, 2008, 2009] },
  { name: '2010-2014', years: [2010, 2011, 2012, 2013, 2014] },
  { name: '2015-2019', years: [2015, 2016, 2017, 2018, 2019] },
  { name: '2020-2023', years: [2020, 2021, 2022, 2023] }
];

function convertPmtilesToGeoJSON(pmtilesPath, outputGeoJSONPath) {
  console.log(`  🔄 Converting ${pmtilesPath} to GeoJSON...`);

  try {
    // Use ogr2ogr to convert PMTiles to GeoJSON with proper projection handling
    // PMTiles contains MVT (Mapbox Vector Tiles) format data in EPSG:3857
    // Convert to EPSG:4326 (WGS84) which is what Tippecanoe expects
    // Use COORDINATE_PRECISION=6 for better compression and -simplify 10 for size reduction
    const command = `ogr2ogr -f GeoJSON -s_srs EPSG:3857 -t_srs EPSG:4326 -lco COORDINATE_PRECISION=6 -simplify 10 "${outputGeoJSONPath}" "${pmtilesPath}"`;
    execSync(command, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`  ✓ Converted to ${outputGeoJSONPath} (reprojected to EPSG:4326)`);
    return true;
  } catch (error) {
    console.log(`  ❌ Error converting ${pmtilesPath}: ${error.message}`);
    return false;
  }
}

function createConsolidatedPMTiles(group) {
  console.log(`\n=== Creating consolidated PMTiles for group: ${group.name} ===`);

  const outputPath = path.join('consolidated', `lulc_${group.name}_ogr.pmtiles`);
  const tempDir = path.join('consolidated', 'temp_ogr');

  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  console.log(`📖 Converting ${group.years.length} PMTiles to GeoJSON...`);

  const geojsonFiles = [];

  for (const year of group.years) {
    const pmtilesPath = `lulc_nat_ant_${year}_gpu.pmtiles`;
    const yearGeoJSONPath = path.join(tempDir, `year_${year}.geojson`);

    if (fs.existsSync(pmtilesPath)) {
      const success = convertPmtilesToGeoJSON(pmtilesPath, yearGeoJSONPath);
      if (success && fs.existsSync(yearGeoJSONPath)) {
        geojsonFiles.push(yearGeoJSONPath);
        console.log(`✓ Processed year ${year} (${geojsonFiles.length}/${group.years.length})`);
      }
    } else {
      console.log(`⚠ PMTiles file not found: ${pmtilesPath}`);
    }
  }

  if (geojsonFiles.length === 0) {
    console.log(`❌ No valid GeoJSON files created for group ${group.name}, skipping...`);
    return;
  }

  // Use Tippecanoe to create PMTiles with separate layers and optimizations
  console.log(`🔄 Creating PMTiles with ${geojsonFiles.length} separate layers...`);

  try {
    // Create command with multiple input files for separate layers
    // Enhanced optimization flags for maximum size reduction:
    // --simplification=15: More aggressive simplification (was 10)
    // --detect-shared-borders: Eliminate redundant polygon borders
    // --coalesce-densest-as-needed: Better compression for dense areas
    // --extend-zooms-if-still-dropping: Extend zoom levels to maintain detail
    // --full-detail=12: Maintain full detail up to zoom 12, then simplify
    // --buffer=0: No buffering to reduce size
    // Note: --min-detail not supported in tippecanoe v2.79.0
    let tippecanoeCmd = `tippecanoe -o "${outputPath}" -Z 0 -zg --force --simplification=15 --detect-shared-borders --coalesce-densest-as-needed --extend-zooms-if-still-dropping --full-detail=12 --buffer=0`;

    // Add each year file as a separate layer
    for (let i = 0; i < geojsonFiles.length; i++) {
      const year = group.years[i];
      tippecanoeCmd += ` --named-layer="year_${year}:${geojsonFiles[i]}"`;
    }

    console.log(`Executing: ${tippecanoeCmd}`);
    execSync(tippecanoeCmd, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`✓ Created consolidated PMTiles: ${outputPath}`);

    // Verify the file was created and check its properties
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`📊 File size: ${Math.round(stats.size / 1024)}KB`);

      // Show PMTiles info
      try {
        console.log(`\n📋 PMTiles Information:`);
        execSync(`pmtiles show "${outputPath}"`, { cwd: process.cwd(), stdio: 'inherit' });
      } catch (infoError) {
        console.log(`⚠ Could not read PMTiles info: ${infoError.message}`);
      }
    }

  } catch (error) {
    console.log(`❌ Error creating consolidated PMTiles for ${group.name}: ${error.message}`);

    // Create a simple error file for debugging
    const errorContent = `Error creating consolidated PMTiles
Group: ${group.name}
Years: ${group.years.join(', ')}
Error: ${error.message}
`;
    fs.writeFileSync(outputPath + '.error', errorContent);
  }

  // Clean up temporary GeoJSON files
  for (const geojsonFile of geojsonFiles) {
    try {
      fs.unlinkSync(geojsonFile);
      console.log(`🗑️ Cleaned up ${geojsonFile}`);
    } catch (e) {
      console.log(`⚠ Could not clean up ${geojsonFile}: ${e.message}`);
    }
  }

  // Remove temp directory if empty
  try {
    if (fs.existsSync(tempDir) && fs.readdirSync(tempDir).length === 0) {
      fs.rmdirSync(tempDir);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

function main() {
  console.log('🚀 Creating OGR-based PMTiles Consolidation...');
  console.log(`Found ${yearGroups.length} groups to process`);
  console.log('This process will:');
  console.log('1. Convert each PMTile to GeoJSON using ogr2ogr');
  console.log('2. Combine 5 GeoJSON files into consolidated PMTiles');
  console.log('3. Preserve actual vector data (not just bounding boxes)');

  // Process each group
  for (const group of yearGroups) {
    try {
      createConsolidatedPMTiles(group);
    } catch (error) {
      console.error(`❌ Error processing group ${group.name}:`, error.message);
    }
  }

  console.log('\n📊 CONSOLIDATION SUMMARY:');
  console.log('================================');

  let totalYears = 0;
  let totalFiles = 0;

  for (const group of yearGroups) {
    totalYears += group.years.length;
    totalFiles++;

    const outputPath = path.join('consolidated', `lulc_${group.name}_ogr.pmtiles`);
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✓ ${group.name}: ${Math.round(stats.size / 1024)}KB (${group.years.length} years)`);
    } else {
      console.log(`❌ ${group.name}: Failed to create`);
    }
  }

  console.log(`\n🎉 Consolidation Results:`);
  console.log(`- Total years processed: ${totalYears}`);
  console.log(`- Consolidated files created: ${totalFiles}`);
  console.log(`- Reduction: 39 files → 8 files (${Math.round((1 - 8/39) * 100)}% reduction)`);

  console.log('\n📁 Consolidated files created in: combined/pmtiles/consolidated/');
  console.log('\n✨ NEXT STEPS:');
  console.log('1. Compare new _ogr.pmtiles files with original consolidated files');
  console.log('2. Test the multi-layer PMTiles files in your application');
  console.log('3. Update style.json if needed');
  console.log('4. Deploy to production');
  console.log('5. Verify functionality');
}

if (require.main === module) {
  main();
}
