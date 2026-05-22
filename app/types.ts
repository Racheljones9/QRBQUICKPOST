// Type definition for route data extracted from GPX files
export type RouteData = {
  gpxFile: File | null;        // The original GPX file
  distance: number;            // Total distance in miles
  coordinates: [number, number][]; // Array of [lat, lng] coordinates
};

// Type definition for form data collected from user inputs
export type FormData = {
  day: string;                 // Day of week in ALL CAPS (e.g., "MONDAY")
  time: string;                // Time in format "H:MM AM/PM" (e.g., "7:00 AM")
  startLocation: string;       // Starting location text (in ALL CAPS)
  startLocationType: "central-library" | "macri-triangle" | "maria-hernandez" | "prospect-park" | "other" | ""; // Location type determines icon
  endLocation: string;         // Ending location text (in ALL CAPS)
  isTnbOnly: boolean;         // Whether this is a Trans/Nonbinary only run
  route1BadgeView: "distance" | "detail"; // Badge view for route 1 (mileage or start zoom)
  route2BadgeView: "distance" | "detail"; // Badge view for route 2 (mileage or start zoom)
  hasManuallySetRoute1BadgeView: boolean; // Track if user manually changed route1 badge view
  hasManuallySetRoute2BadgeView: boolean; // Track if user manually changed route2 badge view
  differentStarts: boolean;    // Whether routes have different start times/locations
  route1Time: string;          // Time for route 1 (used when differentStarts is true)
  route2Time: string;          // Time for route 2 (used when differentStarts is true)
  route1StartLocation: string; // Start location for route 1 (used when differentStarts is true)
  route2StartLocation: string; // Start location for route 2 (used when differentStarts is true)
  route1StartLocationType: "central-library" | "macri-triangle" | "maria-hernandez" | "prospect-park" | "other" | ""; // Location type for route 1
  route2StartLocationType: "central-library" | "macri-triangle" | "maria-hernandez" | "prospect-park" | "other" | ""; // Location type for route 2
};