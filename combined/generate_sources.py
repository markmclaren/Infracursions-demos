import json
import sys


def get_year_range(year):
    """Map a year to its 5-year range"""
    ranges = {
        (1985, 1989): "1985_1989",
        (1990, 1994): "1990_1994",
        (1995, 1999): "1995_1999",
        (2000, 2004): "2000_2004",
        (2005, 2009): "2005_2009",
        (2010, 2014): "2010_2014",
        (2015, 2019): "2015_2019",
        (2020, 2023): "2020_2023"
    }

    for range_tuple, range_name in ranges.items():
        if range_tuple[0] <= year <= range_tuple[1]:
            return range_name
    return None

def generate_sources():
    # Generate sources for each 5-year range
    for start_year in [1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020]:
        end_year = 1989 if start_year == 1985 else \
                  1994 if start_year == 1990 else \
                  1999 if start_year == 1995 else \
                  2004 if start_year == 2000 else \
                  2009 if start_year == 2005 else \
                  2014 if start_year == 2010 else \
                  2019 if start_year == 2015 else \
                  2023

        range_name = f"lulc_{start_year}_{end_year}"
        source = {
            range_name: {
                "type": "vector",
                "url": f"pmtiles://https://markmclaren.github.io/Infracursions-demos/combined/pmtiles/consolidated/lulc_{start_year}-{end_year}_ogr.pmtiles"
            }
        }
        # Pretty print the JSON with an indent of 4 spaces
        print(json.dumps(source, indent=4).strip('{').strip('}').strip())
        if start_year < 2020:  # Don't add comma after the last source
            print(',')

def generate_layers():
    for year in range(1985, 2024):
        # Get the appropriate 5-year range for this year
        range_name = get_year_range(year)
        if not range_name:
            continue

        layer = {
            "id": f"lulc{year}",
            "type": "fill",
            "source": f"lulc_{range_name}",
            "source-layer": f"year_{year}",
            "layout": {
                "visibility": "visible"  # Changed from "none" to match example
            },
            "paint": {
                "fill-color": [
                    "case",
                    ["==", ["get", "DN"], 0], "#7AB5AA",  # Updated colors to match example
                    ["==", ["get", "DN"], 1], "#5D877F",
                    "transparent"
                ],
                "fill-opacity": 0.8  # Updated opacity to match example
            }
        }
        print(json.dumps(layer, indent=4))
        if year < 2023:
            print(',')

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "sources":
            generate_sources()
        elif sys.argv[1] == "layers":
            generate_layers()
        else:
            print("Usage: python generate_sources.py [sources|layers]")
    else:
        print("Usage: python generate_sources.py [sources|layers]")
        print("Usage: python generate_sources.py [sources|layers]")
