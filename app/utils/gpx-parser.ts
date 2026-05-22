/**
 * GPX PARSER UTILITY
 * 
 * Parses GPX (GPS Exchange Format) files to extract route data.
 * GPX files contain GPS coordinates from running/fitness apps.
 * 
 * This parser:
 * 1. Extracts lat/lng coordinates from <trkpt> or <rtept> elements
 * 2. Calculates total distance using the Haversine formula
 * 3. Returns coordinates array and total distance in miles
 * 
 * The Haversine formula calculates the great-circle distance between
 * two points on a sphere (Earth) given their lat/lng coordinates.
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  
  // Convert degrees to radians
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in miles
}

/**
 * Parse a GPX file and extract coordinates and distance
 * @param gpxText - Raw GPX file content as string
 * @returns Object with distance (miles) and coordinates array
 */
export async function parseGPX(
  gpxText: string
): Promise<{ distance: number; coordinates: [number, number][] }> {
  try {
    // Parse XML string into DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxText, "text/xml");
    
    const coordinates: [number, number][] = [];
    let totalDistance = 0;

    // Extract track points (most common in GPX files)
    const trkpts = xmlDoc.querySelectorAll("trkpt");
    
    if (trkpts.length > 0) {
      // Process each track point
      trkpts.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute("lat") || "0");
        const lon = parseFloat(point.getAttribute("lon") || "0");
        coordinates.push([lat, lon]);

        // Calculate cumulative distance
        if (index > 0) {
          const prevCoord = coordinates[index - 1];
          totalDistance += calculateDistance(
            prevCoord[0],
            prevCoord[1],
            lat,
            lon
          );
        }
      });
    } else {
      // Fallback: Try route points if no track points found
      const rtepts = xmlDoc.querySelectorAll("rtept");
      
      rtepts.forEach((point, index) => {
        const lat = parseFloat(point.getAttribute("lat") || "0");
        const lon = parseFloat(point.getAttribute("lon") || "0");
        coordinates.push([lat, lon]);

        if (index > 0) {
          const prevCoord = coordinates[index - 1];
          totalDistance += calculateDistance(
            prevCoord[0],
            prevCoord[1],
            lat,
            lon
          );
        }
      });
    }

    return {
      distance: totalDistance,
      coordinates,
    };
  } catch (error) {
    console.error("Error parsing GPX:", error);
    throw new Error("Failed to parse GPX file");
  }
}