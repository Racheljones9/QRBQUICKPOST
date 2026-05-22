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
 * COMBINED ROUTE MAP COMPONENT
 * 
 * Renders two running routes on a single OpenStreetMap using Leaflet.
 * Similar to RouteMap but displays both route1 and route2 simultaneously.
 */

type CombinedRouteMapProps = {
  coordinates1: [number, number][];  // Array of [lat, lng] points for route 1
  coordinates2: [number, number][];  // Array of [lat, lng] points for route 2
  className?: string;                // CSS classes for container
  theme?: "am-tnb" | "am-else" | "pm-tnb" | "pm-else";  // Determines overlay color
  startLocationType?: "central-library" | "macri-triangle" | "maria-hernandez" | "prospect-park" | "other" | "";  // Determines start icon
  zoomToStart?: boolean;  // If true, zoom to start point of route1; if false, fit entire routes
  hasCircularInset?: boolean;  // If true, add extra padding to avoid circular inset overlay
  distance1?: number;  // Distance of route 1 in miles
  distance2?: number;  // Distance of route 2 in miles
  reduceOpacityOfLonger?: boolean;  // If true, shorter route uses burgundy→purple gradient, longer route uses blue→teal gradient
};

export function CombinedRouteMap({ coordinates1, coordinates2, className, theme, startLocationType, zoomToStart, hasCircularInset, distance1, distance2, reduceOpacityOfLonger }: CombinedRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const highlightCircleRef = useRef<L.Circle | null>(null);

  // Determine which route is longer
  const route1IsLonger = distance1 && distance2 && distance1 > distance2;
  const route2IsLonger = distance1 && distance2 && distance2 > distance1;

  // Get color overlay for map based on time period and run type
  const getMapOverlay = () => {
    switch (theme) {
      case "am-tnb":
        return "rgba(177, 165, 191, 0.5)";
      case "am-else":
        return "rgba(213, 245, 126, 0.5)";
      case "pm-tnb":
        return "rgba(177, 128, 190, 0.5)";
      case "pm-else":
        return "rgba(86, 94, 134, 0.5)";
      default:
        return "transparent";
    }
  };

  // Interpolate between two hex colors
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);
    
    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;
    
    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;
    
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };

  // Get color for shorter route gradient (burgundy to purple)
  const getShorterRouteColor = (position: number): string => {
    const colors = ['#651D32', '#2E1A47']; // Burgundy to purple
    
    if (position <= 0) return colors[0];
    if (position >= 1) return colors[1];
    
    return interpolateColor(colors[0], colors[1], position);
  };

  // Get color for longer route gradient (blue to dark green)
  const getLongerRouteColor = (position: number): string => {
    const colors = ['#201747', '#072B31']; // Blue to dark green
    
    if (position <= 0) return colors[0];
    if (position >= 1) return colors[1];
    
    return interpolateColor(colors[0], colors[1], position);
  };

  // Get color for default gradient (full 4-color gradient)
  const getColorForPosition = (position: number): string => {
    const colors = ['#651D32', '#2E1A47', '#201747', '#072B31'];
    
    if (position <= 0) return colors[0];
    if (position >= 1) return colors[3];
    
    const segment = position * (colors.length - 1);
    const segmentIndex = Math.floor(segment);
    const segmentFactor = segment - segmentIndex;
    
    if (segmentIndex >= colors.length - 1) return colors[colors.length - 1];
    
    return interpolateColor(colors[segmentIndex], colors[segmentIndex + 1], segmentFactor);
  };

  // Offset coordinates perpendicular to the line direction
  const offsetCoordinates = (coords: [number, number][], offsetMeters: number): [number, number][] => {
    if (coords.length < 2) return coords;
    
    const offsetCoords: [number, number][] = [];
    
    for (let i = 0; i < coords.length; i++) {
      const curr = coords[i];
      let prev = i > 0 ? coords[i - 1] : coords[i];
      let next = i < coords.length - 1 ? coords[i + 1] : coords[i];
      
      // Calculate direction vectors
      const dx1 = curr[1] - prev[1]; // lng difference
      const dy1 = curr[0] - prev[0]; // lat difference
      const dx2 = next[1] - curr[1];
      const dy2 = next[0] - curr[0];
      
      // Average direction for smooth corners
      const dx = (dx1 + dx2) / 2;
      const dy = (dy1 + dy2) / 2;
      
      // Calculate perpendicular vector (rotate 90 degrees)
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) {
        offsetCoords.push(curr);
        continue;
      }
      
      // Normalize and rotate 90 degrees (perpendicular)
      const perpX = -dy / length;
      const perpY = dx / length;
      
      // Convert meters to degrees (approximate)
      // At equator: 1 degree lat ≈ 111,320 meters
      // 1 degree lng ≈ 111,320 * cos(lat) meters
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = 111320 * Math.cos(curr[0] * Math.PI / 180);
      
      const offsetLat = (perpX * offsetMeters) / metersPerDegreeLat;
      const offsetLng = (perpY * offsetMeters) / metersPerDegreeLng;
      
      offsetCoords.push([curr[0] + offsetLat, curr[1] + offsetLng]);
    }
    
    return offsetCoords;
  };

  // Generate SVG icon HTML for start marker
  const getStartIconHtml = (locationType: typeof startLocationType): string => {
    if (locationType === "central-library") {
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsSquare.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsSquare.p2f814100}" fill="#13322B" />
          <path d="${svgPathsSquare.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsSquare.p2f814100}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "macri-triangle") {
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsTriangle.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsTriangle.p21284000}" fill="#072B31" />
          <path d="${svgPathsTriangle.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsTriangle.p21284000}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "maria-hernandez") {
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsCircleM.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsCircleM.pe073680}" fill="#072B31" />
          <path d="${svgPathsCircleM.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsCircleM.pe073680}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else if (locationType === "prospect-park") {
      return `<svg width="38" height="38" fill="none" viewBox="0 0 37.88 37.88">
        <g>
          <path d="${svgPathsLeaf.p1449b000}" fill="#DCFF7C" />
          <path d="${svgPathsLeaf.p17ba5780}" fill="#13322B" />
          <path d="${svgPathsLeaf.p1449b000}" stroke="#072B31" stroke-width="1.88" />
          <path d="${svgPathsLeaf.p17ba5780}" stroke="#072B31" stroke-width="1.88" />
        </g>
      </svg>`;
    } else {
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

  // Create and configure the Leaflet map with both routes
  useEffect(() => {
    if (!mapRef.current || !coordinates1 || !coordinates2 || coordinates1.length === 0 || coordinates2.length === 0) return;

    // Clear any existing map instance
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Initialize Leaflet map
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

    // Apply color overlay
    setTimeout(() => {
      const overlayPaneName = 'colorOverlayPane';
      if (!map.getPane(overlayPaneName)) {
        const overlayPane = map.createPane(overlayPaneName);
        overlayPane.style.zIndex = '450';
        overlayPane.style.pointerEvents = 'none';
      }
      
      const customPane = map.getPane(overlayPaneName);
      if (customPane) {
        const overlay = document.createElement('div');
        overlay.className = 'map-overlay-gradient';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = getMapOverlay();
        overlay.style.pointerEvents = 'none';
        customPane.appendChild(overlay);
      }
    }, 100);

    // Draw route 1 gradient polyline
    const totalSegments1 = Math.min(coordinates1.length - 1, 100);
    const segmentSize1 = Math.max(1, Math.floor((coordinates1.length - 1) / totalSegments1));
    
    // Apply offset if we're showing distinct routes
    const offsetAmount = 3; // meters offset from center line
    const coords1ToUse = reduceOpacityOfLonger && (route1IsLonger || route2IsLonger)
      ? offsetCoordinates(coordinates1, route1IsLonger ? offsetAmount : -offsetAmount) // longer on right, shorter on left
      : coordinates1;
    
    for (let i = 0; i < coords1ToUse.length - 1; i += segmentSize1) {
      const endIndex = Math.min(i + segmentSize1, coords1ToUse.length - 1);
      const segmentCoords = coords1ToUse.slice(i, endIndex + 1);
      const position = i / (coords1ToUse.length - 1);
      // When reduceOpacityOfLonger is true: longer route gets blue→teal, shorter route gets burgundy→purple
      let color;
      if (reduceOpacityOfLonger && (route1IsLonger || route2IsLonger)) {
        color = route1IsLonger ? getLongerRouteColor(position) : getShorterRouteColor(position);
      } else {
        color = getColorForPosition(position);
      }
      
      L.polyline(segmentCoords, {
        color: color,
        weight: 6.43,
        opacity: 1,
      }).addTo(map);
    }

    // Draw route 2 gradient polyline
    const totalSegments2 = Math.min(coordinates2.length - 1, 100);
    const segmentSize2 = Math.max(1, Math.floor((coordinates2.length - 1) / totalSegments2));
    
    // Apply offset if we're showing distinct routes
    const coords2ToUse = reduceOpacityOfLonger && (route1IsLonger || route2IsLonger)
      ? offsetCoordinates(coordinates2, route2IsLonger ? offsetAmount : -offsetAmount) // longer on right, shorter on left
      : coordinates2;
    
    for (let i = 0; i < coords2ToUse.length - 1; i += segmentSize2) {
      const endIndex = Math.min(i + segmentSize2, coords2ToUse.length - 1);
      const segmentCoords = coords2ToUse.slice(i, endIndex + 1);
      const position = i / (coords2ToUse.length - 1);
      // When reduceOpacityOfLonger is true: longer route gets blue→teal, shorter route gets burgundy→purple
      let color;
      if (reduceOpacityOfLonger && (route1IsLonger || route2IsLonger)) {
        color = route2IsLonger ? getLongerRouteColor(position) : getShorterRouteColor(position);
      } else {
        color = getColorForPosition(position);
      }
      
      L.polyline(segmentCoords, {
        color: color,
        weight: 6.43,
        opacity: 1,
      }).addTo(map);
    }

    // Add start marker for route 1
    const startPoint = coordinates1[0];
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

    // Add finish markers for both routes
    const endPoint1 = coordinates1[coordinates1.length - 1];
    const endPoint2 = coordinates2[coordinates2.length - 1];
    const finishIcon = L.icon({
      iconUrl: imgFinish,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    
    L.marker(endPoint1, {
      icon: finishIcon,
    }).addTo(map);
    
    L.marker(endPoint2, {
      icon: finishIcon,
    }).addTo(map);

    // Set initial view based on zoom mode
    if (zoomToStart) {
      map.setView(startPoint, 16);
    } else {
      // Combine both routes to calculate bounds
      const allCoordinates = [...coordinates1, ...coordinates2];
      if (hasCircularInset) {
        try {
          map.fitBounds(L.polyline(allCoordinates).getBounds(), {
            paddingBottomLeft: [350, 350],
            paddingTopRight: [50, 50]
          });
        } catch (e) {
          console.warn('Padding failed, using default bounds:', e);
          map.fitBounds(L.polyline(allCoordinates).getBounds());
        }
      } else {
        map.fitBounds(L.polyline(allCoordinates).getBounds());
      }
    }

    // Cleanup on unmount
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [coordinates1, coordinates2, zoomToStart, hasCircularInset, distance1, distance2, reduceOpacityOfLonger]);

  // Update start marker icon when location type changes
  useEffect(() => {
    if (!startMarkerRef.current || !leafletMapRef.current || !coordinates1 || coordinates1.length === 0) return;
    
    const startIconHtml = getStartIconHtml(startLocationType);
    const newIcon = L.divIcon({
      html: startIconHtml,
      className: 'custom-start-icon',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });
    
    startMarkerRef.current.setIcon(newIcon);
  }, [startLocationType, coordinates1]);

  // Manage highlight circle for start detail indicator
  useEffect(() => {
    if (!leafletMapRef.current || !coordinates1 || coordinates1.length === 0) return;
    
    const map = leafletMapRef.current;
    const startPoint = coordinates1[0];
    
    if (hasCircularInset) {
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
      }
      
      // Use dark green when showing 2 routes, yellow otherwise
      const circleColor = reduceOpacityOfLonger && (route1IsLonger || route2IsLonger) ? '#072B31' : '#DCFF7C';
      
      const circle = L.circle(startPoint, {
        radius: 200,
        fillColor: circleColor,
        fillOpacity: 0.3,
        color: circleColor,
        opacity: 0.4,
        weight: 2,
      }).addTo(map);
      
      highlightCircleRef.current = circle;
    } else {
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
        highlightCircleRef.current = null;
      }
    }
    
    return () => {
      if (highlightCircleRef.current) {
        highlightCircleRef.current.remove();
        highlightCircleRef.current = null;
      }
    };
  }, [hasCircularInset, coordinates1, reduceOpacityOfLonger, route1IsLonger, route2IsLonger]);

  if (!coordinates1 || !coordinates2 || coordinates1.length === 0 || coordinates2.length === 0) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <p className="text-gray-500 text-sm">Upload routes to see the map</p>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}