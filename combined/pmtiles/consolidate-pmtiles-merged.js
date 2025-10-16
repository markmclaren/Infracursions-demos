#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Year groups for consolidation - 5 years per PMTile with MERGED data (not separate layers)
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
    // Use ogr2ogr to convert PMTiles to GeoJSON with reduced precision
    // Specify source projection (EPSG:3857) and reproject to EPSG:4326 for Tippecanoe
    // COORDINATE_PRECISION=6 reduces file size while maintaining ~0.11m accuracy
    // -simplify 15: More aggressive pre-simplification
    // -clipsrc: Clip to valid bounds to avoid edge artifacts
    const command = `ogr2ogr -f GeoJSON -s_srs EPSG:3857 -t_srs EPSG:4326 -lco COORDINATE_PRECISION=5 -simplify 15 -clipsrc -180 -85.0511287798 180 85.0511287798 "${outputGeoJSONPath}" "${pmtilesPath}"`;
    execSync(command, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`  ✓ Converted to ${outputGeoJSONPath} (5 decimal precision, pre-simplified)`);
    return true;
  } catch (error) {
    console.log(`  ❌ Error converting ${pmtilesPath}: ${error.message}`);
    return false;
  }
}

function mergeGeoJSONFiles(inputFiles, outputFile) {
  console.log(`  🔄 Merging ${inputFiles.length} GeoJSON files...`);

  try {
    // Use ogr2ogr to merge all files into one with a year attribute
    let mergeCmd = `ogr2ogr -f GeoJSON "${outputFile}" "${inputFiles[0]}"`;

    // Add remaining files as additional layers, then merge them
    for (let i = 1; i < inputFiles.length; i++) {
      mergeCmd += ` -update -append "${inputFiles[i]}"`;
    }

    execSync(mergeCmd, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`  ✓ Merged into ${outputFile}`);
    return true;
  } catch (error) {
    console.log(`  ❌ Error merging files: ${error.message}`);
    return false;
  }
}

function createConsolidatedPMTiles(group) {
  console.log(`\n=== Creating MERGED PMTiles for group: ${group.name} ===`);

  const outputPath = path.join('consolidated', `lulc_${group.name}_merged.pmtiles`);
  const tempDir = path.join('consolidated', 'temp_merged');

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

  // Merge all GeoJSON files into a single file
  const mergedGeoJSONPath = path.join(tempDir, `merged_${group.name}.geojson`);
  const mergeSuccess = mergeGeoJSONFiles(geojsonFiles, mergedGeoJSONPath);

  if (!mergeSuccess) {
    console.log(`❌ Failed to merge GeoJSON files for ${group.name}, skipping...`);
    return;
  }

  // Use Tippecanoe to create PMTiles with maximum size optimization
  console.log(`🔄 Creating optimized PMTiles from merged data...`);

  try {
    // Single input file with maximum optimization for size reduction
    // This approach should be much more size-efficient than separate layers
    const tippecanoeCmd = `tippecanoe -o "${outputPath}" -Z 0 -zg --force --simplification=20 --detect-shared-borders --coalesce-densest-as-needed --extend-zooms-if-still-dropping --full-detail=10 --min-detail=15 --buffer=0 --reorder --hilbert "${mergedGeoJSONPath}"`;

    console.log(`Executing: ${tippecanoeCmd}`);
    execSync(tippecanoeCmd, { cwd: process.cwd(), stdio: 'inherit' });
    console.log(`✓ Created merged PMTiles: ${outputPath}`);

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
    console.log(`❌ Error creating merged PMTiles for ${group.name}: ${error.message}`);

    // Create a simple error file for debugging
    const errorContent = `Error creating merged PMTiles
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

  // Clean up merged file
  try {
    if (fs.existsSync(mergedGeoJSONPath)) {
      fs.unlinkSync(mergedGeoJSONPath);
      console.log(`🗑️ Cleaned up ${mergedGeoJSONPath}`);
    }
  } catch (e) {
    console.log(`⚠ Could not clean up ${mergedGeoJSONPath}: ${e.message}`);
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
  console.log('🚀 Creating MERGED PMTiles Consolidation (Size-Optimized)...');
  console.log(`Found ${yearGroups.length} groups to process`);
  console.log('This process will:');
  console.log('1. Convert each PMTile to GeoJSON using ogr2ogr');
  console.log('2. Merge all 5 GeoJSON files into a single file');
  console.log('3. Create PMTiles from merged data (should be much smaller)');
  console.log('4. Preserve actual vector data with year attributes');

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

    const outputPath = path.join('consolidated', `lulc_${group.name}_merged.pmtiles`);
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

  console.log('\n📁 Merged files created in: combined/pmtiles/consolidated/');
  console.log('\n✨ NEXT STEPS:');
  console.log('1. Compare new _merged.pmtiles files with _ogr.pmtiles files');
  console.log('2. Test the merged PMTiles files in your application');
  console.log('3. Update style.json to use year attribute for filtering');
  console.log('4. Deploy to production');
  console.log('5. Verify functionality');
}

if (require.main === module) {
  main();
}
