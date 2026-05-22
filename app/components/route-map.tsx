import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import imgFinish from "figma:asset/449015b397eb0c262c46e94752e0b0d55d31976f.png";
import svgPathsStar from "@/imports/svg-laafib5wfp";
import svgPathsTriangle from "@/imports/svg-gtqgsg4li3";
import svgPathsSquare from "@/imports/svg-fbtjz40zel";
import svgPathsCircleM from "@/imports/svg-fi6kkbqxp3";
import svgPathsLeaf from "@/imports/svg-jlb0npjlu6";

/**
 * ROUTE MAP COMPONENT
 * 
 * Renders a running route on an OpenStreetMap using Leaflet.
 * 
 * Features:
 * - Gradient polyline route (burgundy → purple → blue → dark green)
 * - Custom start marker icon (varies by location type)
 * - Finish marker (green circle)
 * - Color overlay based on time/run type (AM/PM × TNB/General)
 * - Zoom modes: full route view or zoomed to start point
 * - Supports map synchronization between two side-by-side maps
 */

type RouteMapProps = {
  coordinates: [number, number][];  // Array of [lat, lng] points
  className?: string;                // CSS classes for container
  mapRef?: React.MutableRefObject<L.Map | null>;  // External ref for map sync
  theme?: "am-tnb" | "am-else" | "pm-tnb" | "pm-else";  // Determines overlay color
  startLocationType?: "central-library" | "macri-triangle" | "maria-hernandez" | "prospect-park" | "other" | "";  // Determines start icon
  zoomToStart?: boolean;  // If true, zoom to start point; if false, fit entire route
  hasCircularInset?: boolean;  // If true, add extra padding to avoid circular inset overlay
};

export function RouteMap({ coordinates, className, mapRef: externalMapRef, theme, startLocationType, zoomToStart, hasCircularInset }: RouteMapProps) {
  // Refs for DOM element and Leaflet instances
  const mapRef = useRef<HTMLDivElement>(null);  // Reference to the div container for the map
  const leafletMapRef = useRef<L.Map | null>(null);  // Reference to the Leaflet map instance
  const startMarkerRef = useRef<L.Marker | null>(null);  // Reference to start marker for dynamic updates
  const highlightCircleRef = useRef<L.Circle | null>(null);  // Reference to yellow highlight circle (shown when hasCircularInset=true)

  // Get color overlay for map based on time period and run type
  // Returns a semi-transparent color that overlays the entire map to match the background theme
  const getMapOverlay = () => {
    switch (theme) {
      case "am-tnb":
        return "rgba(177, 165, 191, 0.5)"; // Blue/pink for AM TNB runs
      case "am-else":
        return "rgba(213, 245, 126, 0.5)"; // Yellow/lime for AM General runs
      case "pm-tnb":
        return "rgba(177, 128, 190, 0.5)"; // Purple/pink for PM TNB runs
      case "pm-else":
        return "rgba(86, 94, 134, 0.5)";   // Purple/blue for PM General runs
      default:
        return "transparent";
    }
  };

  // Interpolate between two hex colors
  // Used to create smooth color transitions in the route gradient
  // factor: 0-1 value determining how far between color1 and color2 to interpolate
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    // Parse hex colors to RGB values
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    
    // Extract R, G, B components using bit shifting
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    
    // Linear interpolation for each color channel
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    
    // Combine RGB back into hex and return
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Get color for a specific position along the route (0 to 1)
  // Creates a smooth gradient from burgundy → purple → blue → dark green
  const getColorForPosition = (position: number): string => {
    const colors = ['#651D32', '#2E1A47', '#201747', '#072B31']; // Gradient: burgundy → purple → blue → dark green
    
    // Handle edge cases
    if (position <= 0) return colors[0];
    if (position >= 1) return colors[3];
    
    // Find which color segment we're in and interpolate between the two colors
    const segment = position * (colors.length - 1);  // Scale position to color array length
    const segmentIndex = Math.floor(segment);  // Which color pair to interpolate between
    const segmentFactor = segment - segmentIndex;  // How far between the two colors (0-1)
    
    if (segmentIndex >= colors.length - 1) return colors[colors.length - 1];
    
    return interpolateColor(colors[segmentIndex], colors[segmentIndex + 1], segmentFactor);
  };

  // Generate SVG icon HTML for start marker based on location type
  const getStartIconHtml = (locationType: typeof startLocationType): string => {
    if (locationType === "central-library") {
      // Square icon for Central Library
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsSquare.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsSquare.p2f814100}" fill="#072B31" />
          <path d="${svgPathsSquare.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsSquare.p2f814100}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "macri-triangle") {
      // Triangle icon for Macri Triangle
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsTriangle.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsTriangle.p21284000}" fill="#072B31" />
          <path d="${svgPathsTriangle.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsTriangle.p21284000}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "maria-hernandez") {
      // Circle with M icon for Maria Hernandez Park
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsCircleM.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsCircleM.pe073680}" fill="#072B31" />
          <path d="${svgPathsCircleM.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsCircleM.pe073680}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "prospect-park") {
      // Circle with leaf icon for Prospect Park
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsLeaf.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsLeaf.p17ba5780}" fill="#13322B" />
          <path d="${svgPathsLeaf.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsLeaf.p17ba5780}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else {
      // Star icon for other/custom locations
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsStar.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsStar.p3a082300}" fill="#13322B" />
          <path d="${svgPathsStar.p1449b000}" stroke="#13322B" stroke-width="1.88" />
          <path d="${svgPathsStar.p3a082300}" stroke="#13322B" stroke-width="1.88" />
        </g>
      </svg>`;
    }
  };

  // Create and configure the Leaflet map
  useEffect(() => {
    if (!mapRef.current || coordinates.length === 0) return;

    // Clear any existing map instance
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Initialize Leaflet map with canvas renderer (better for PNG export)
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,
      renderer: L.canvas(),
    });

    leafletMapRef.current = map;

    // Add OpenStreetMap tile layer with CORS support for html2canvas
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      className: 'map-tiles',
      crossOrigin: 'anonymous',
    }).addTo(map);



    // Draw gradient polyline (split into segments for color transitions)
    const totalSegments = Math.min(coordinates.length - 1, 100);
    const segmentSize = Math.max(1, Math.floor((coordinates.length - 1) / totalSegments));
    
    for (let i = 0; i < coordinates.length - 1; i += segmentSize) {
      const endIndex = Math.min(i + segmentSize, coordinates.length - 1);
      const segmentCoords = coordinates.slice(i, endIndex + 1);
      const position = i / (coordinates.length - 1);
      const color = getColorForPosition(position);
      
      L.polyline(segmentCoords, {
        color: color,
        weight: 6.43,
      }).addTo(map);
    }

    // Add start marker with custom icon
    const startPoint = coordinates[0];
    const startIconHtml = getStartIconHtml(startLocationType);
    
    const startIcon = L.divIcon({
      html: startIconHtml,
      className: 'custom-start-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    
    const startMarker = L.marker(startPoint, {
      icon: startIcon,
    }).addTo(map);
    startMarkerRef.current = startMarker;

    // Add finish marker (green circle)
    const endPoint = coordinates[coordinates.length - 1];
    const finishIcon = L.icon({
      iconUrl: imgFinish,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    
    L.marker(endPoint, {
      icon: finishIcon,
    }).addTo(map);

    // Set initial view based on zoom mode
    if (zoomToStart) {
      map.setView(startPoint, 16); // Zoom to start point
    } else {
      if (hasCircularInset) {
        // When hasCircularInset is true, add padding to avoid covering the route with rectangular inset
        // Use Leaflet's built-in padding option which is more reliable
        try {
          map.fitBounds(L.polyline(coordinates).getBounds(), {
            paddingBottomLeft: [350, 350],
            paddingTopRight: [50, 50]
          });
        } catch (e) {
          // Fallback to regular bounds if padding fails
          console.warn('Padding failed, using default bounds:', e);
          map.fitBounds(L.polyline(coordinates).getBounds());
        }
      } else {
        map.fitBounds(L.polyline(coordinates).getBounds()); // Show full route
      }
    }

    // Expose map to parent component if ref provided
    if (externalMapRef) {
      externalMapRef.current = map;
    }

    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [coordinates, externalMapRef, zoomToStart, hasCircularInset]);

  // Update map zoom when zoomToStart prop changes
  useEffect(() => {
    if (!leafletMapRef.current || coordinates.length === 0) return;
    
    const startPoint = coordinates[0];
    
    if (zoomToStart) {
      leafletMapRef.current.setView(startPoint, 16);
    } else {
      if (hasCircularInset) {
        // When hasCircularInset is true, add padding to avoid covering the route with rectangular inset
        // Use Leaflet's built-in padding option which is more reliable
        try {
          leafletMapRef.current.fitBounds(L.polyline(coordinates).getBounds(), {
            paddingBottomLeft: [350, 350],
            paddingTopRight: [50, 50]
          });
        } catch (e) {
          // Fallback to regular bounds if padding fails
          console.warn('Padding failed, using default bounds:', e);
          leafletMapRef.current.fitBounds(L.polyline(coordinates).getBounds());
        }
      } else {
        leafletMapRef.current.fitBounds(L.polyline(coordinates).getBounds());
      }
    }
  }, [zoomToStart, coordinates, hasCircularInset]);

  // Update start marker icon when location type changes (without recreating entire map)
  useEffect(() => {
    if (!startMarkerRef.current || !leafletMapRef.current || coordinates.length === 0) return;
    
    const startIconHtml = getStartIconHtml(startLocationType);
    const newIcon = L.divIcon({
      html: startIconHtml,
      className: 'custom-start-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    
    startMarkerRef.current.setIcon(newIcon);
  }, [startLocationType, coordinates]);

  // Manage highlight circle for start detail indicator (single route only)
  useEffect(() => {
    if (!leafletMapRef.current || coordinates.length === 0) return;
    
    const map = leafletMapRef.current;
    const startPoint = coordinates[0];
    
    // Add circle when hasCircularInset is true (single route with start detail indicator)
    if (hasCircularInset) {
      // Remove existing circle if it exists
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
      }
      
      // Create a semi-transparent circle with yellow appearance
      // Since Leaflet doesn't support gradient fills, we use a solid yellow color
      const circle = L.circle(startPoint, {
        radius: 200, // 200 meters radius
        fillColor: '#072B31', // dark gren color matching QRB brand
        fillOpacity: 0.3,
        color: '#072B31', // Border color
        opacity: 0.4,
        weight: 2,
      }).addTo(map);
      
      highlightCircleRef.current = circle;
    } else {
      // Remove circle when hasCircularInset is false
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
        highlightCircleRef.current = null;
      }
    }
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
        highlightCircleRef.current = null;
      }
    };
  }, [hasCircularInset, coordinates]);

  if (coordinates.length === 0) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <p className="text-gray-500 text-sm">Upload a route to see the map</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}