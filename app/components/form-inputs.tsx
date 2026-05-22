import { useEffect } from "react";
import type { FormData, RouteData } from "@/app/types";
import StarterCentralLibrary from "@/imports/StarterCentralLibrary-42-89";
import StarterMariaHernandez from "@/imports/StarterMariaHernandez";
import svgPathsSquare from "@/imports/svg-fbtjz40zel";
import svgPathsTriangle from "@/imports/svg-gtqgsg4li3";

/**
 * FORM INPUTS COMPONENT
 * 
 * Collects user input for run details including:
 * - Day of week
 * - Time (hour, minute, AM/PM) - either shared or per-route
 * - Start location (preset buttons or custom text) - either shared or per-route
 * - End location (custom text)
 * - Different Starts toggle (when 2 routes uploaded)
 * - Trans/Nonbinary Only checkbox (hidden when Different Starts is active)
 */

type FormInputsProps = {
  formData: FormData;
  setFormData: (data: FormData) => void;
  hasRoute2: boolean; // Whether a second route is uploaded
  route1: RouteData;
  route2: RouteData;
};

export function FormInputs({ formData, setFormData, hasRoute2, route1, route2 }: FormInputsProps) {
  /**
   * Detect if routes have different start locations
   * Compare the first coordinate of each route with a tolerance for GPS variation
   */
  const hasAutoDifferentStarts = () => {
    if (!hasRoute2) return false;
    if (!route1.coordinates || route1.coordinates.length === 0) return false;
    if (!route2.coordinates || route2.coordinates.length === 0) return false;

    const start1 = route1.coordinates[0]; // [lat, lng]
    const start2 = route2.coordinates[0]; // [lat, lng]

    // Use a tolerance of ~50 meters (approximately 0.0005 degrees)
    const tolerance = 0.0005;
    const latDiff = Math.abs(start1[0] - start2[0]);
    const lngDiff = Math.abs(start1[1] - start2[1]);

    // If either difference exceeds tolerance, they have different starts
    return latDiff > tolerance || lngDiff > tolerance;
  };

  // Use auto-detection OR manual selection
  const isDifferentStarts = formData.differentStarts || hasAutoDifferentStarts();

  /**
   * Auto-detect start location based on GPS coordinates
   * Macri Triangle: 462 Union Ave #3400, Brooklyn, NY 11211
   * Approximate coordinates: 40.7118° N, 73.9537° W
   * Maria Hernandez Park: 40°42'07.3"N 73°55'26.1"W
   * Approximate coordinates: 40.702028° N, 73.923917° W
   * Central Library: 40°40'21.8"N 73°58'08.2"W
   * Approximate coordinates: 40.672722° N, 73.968944° W
   */
  useEffect(() => {
    // Known location coordinates with tolerance (~100 meters = ~0.001 degrees)
    const MACRI_TRIANGLE_LAT = 40.7118;
    const MACRI_TRIANGLE_LNG = -73.9537;
    const MARIA_HERNANDEZ_LAT = 40.702028;
    const MARIA_HERNANDEZ_LNG = -73.923917;
    const CENTRAL_LIBRARY_LAT = 40.672722;
    const CENTRAL_LIBRARY_LNG = -73.968944;
    const TOLERANCE = 0.001; // Increased tolerance to ~100 meters

    const isNearLocation = (lat: number, lng: number, targetLat: number, targetLng: number) => {
      const latDiff = Math.abs(lat - targetLat);
      const lngDiff = Math.abs(lng - targetLng);
      return latDiff <= TOLERANCE && lngDiff <= TOLERANCE;
    };

    let shouldUpdate = false;
    const updates: Partial<FormData> = {};

    // Check route 1 if it has coordinates and location not already set
    if (route1.coordinates && route1.coordinates.length > 0) {
      const [lat, lng] = route1.coordinates[0];

      if (isDifferentStarts && hasRoute2) {
        // Different starts mode - check route 1 separately
        if (!formData.route1StartLocationType) {
          if (isNearLocation(lat, lng, MACRI_TRIANGLE_LAT, MACRI_TRIANGLE_LNG)) {
            updates.route1StartLocationType = "macri-triangle";
            updates.route1StartLocation = "MACRI TRIANGLE (WILLIAMSBURG)";
            shouldUpdate = true;
          } else if (isNearLocation(lat, lng, MARIA_HERNANDEZ_LAT, MARIA_HERNANDEZ_LNG)) {
            updates.route1StartLocationType = "maria-hernandez";
            updates.route1StartLocation = "MARIA HERNANDEZ PARK (SUYDAN & KNICKERBOCKER)";
            shouldUpdate = true;
          } else if (isNearLocation(lat, lng, CENTRAL_LIBRARY_LAT, CENTRAL_LIBRARY_LNG)) {
            updates.route1StartLocationType = "central-library";
            updates.route1StartLocation = "CENTRAL LIBRARY";
            shouldUpdate = true;
          }
        }
      } else {
        // Shared start location mode - only auto-set if empty
        if (!formData.startLocationType) {
          if (isNearLocation(lat, lng, MACRI_TRIANGLE_LAT, MACRI_TRIANGLE_LNG)) {
            updates.startLocationType = "macri-triangle";
            updates.startLocation = "MACRI TRIANGLE (WILLIAMSBURG)";
            shouldUpdate = true;
          } else if (isNearLocation(lat, lng, MARIA_HERNANDEZ_LAT, MARIA_HERNANDEZ_LNG)) {
            updates.startLocationType = "maria-hernandez";
            updates.startLocation = "MARIA HERNANDEZ PARK (SUYDAN & KNICKERBOCKER)";
            shouldUpdate = true;
          } else if (isNearLocation(lat, lng, CENTRAL_LIBRARY_LAT, CENTRAL_LIBRARY_LNG)) {
            updates.startLocationType = "central-library";
            updates.startLocation = "CENTRAL LIBRARY";
            shouldUpdate = true;
          }
        }
      }
    }

    // Check route 2 if different starts and it has coordinates
    if (isDifferentStarts && hasRoute2 && route2.coordinates && route2.coordinates.length > 0) {
      const [lat, lng] = route2.coordinates[0];

      if (!formData.route2StartLocationType) {
        if (isNearLocation(lat, lng, MACRI_TRIANGLE_LAT, MACRI_TRIANGLE_LNG)) {
          updates.route2StartLocationType = "macri-triangle";
          updates.route2StartLocation = "MACRI TRIANGLE (WILLIAMSBURG)";
          shouldUpdate = true;
        } else if (isNearLocation(lat, lng, MARIA_HERNANDEZ_LAT, MARIA_HERNANDEZ_LNG)) {
          updates.route2StartLocationType = "maria-hernandez";
          updates.route2StartLocation = "MARIA HERNANDEZ PARK (SUYDAN & KNICKERBOCKER)";
          shouldUpdate = true;
        } else if (isNearLocation(lat, lng, CENTRAL_LIBRARY_LAT, CENTRAL_LIBRARY_LNG)) {
          updates.route2StartLocationType = "central-library";
          updates.route2StartLocation = "CENTRAL LIBRARY";
          shouldUpdate = true;
        }
      }
    }

    // Only update if we detected a location - use functional update to avoid stale closure
    if (shouldUpdate) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        ...updates
      }));
    }
  }, [route1.coordinates, route2.coordinates, hasRoute2, isDifferentStarts, setFormData]); // Removed formData fields from deps to prevent loops

  // Update a single field in form data
  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData({ ...formData, [field]: value });
  };

  // Parse time string into hour, minute, and period components
  // Handles both full format "7:00 AM" and partial format "7::AM"
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: "", minute: "", period: "" };
    
    // Check for partial format (hour::minute::period) - used during dropdown selection
    const partialMatch = timeStr.match(/^([^:]*):([^:]*):(.*)$/);
    if (partialMatch) {
      return {
        hour: partialMatch[1],
        minute: partialMatch[2],
        period: partialMatch[3],
      };
    }
    
    // Check for full format (H:MM AM/PM) - final stored format
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      return {
        hour: match[1],
        minute: match[2],
        period: match[3].toUpperCase(),
      };
    }
    
    return { hour: "", minute: "", period: "" };
  };

  // Build time string from dropdown selections for shared time
  const updateTime = (hour: string, minute: string, period: string) => {
    const actualPeriod = period || "AM";
    
    if (hour && minute && actualPeriod) {
      updateField("time", `${hour}:${minute} ${actualPeriod}`);
    } else if (hour || minute || actualPeriod) {
      updateField("time", `${hour || ""}:${minute || ""}:${actualPeriod || ""}`);
    } else {
      updateField("time", "");
    }
  };

  // Build time string for route-specific time
  const updateRouteTime = (routeNumber: 1 | 2, hour: string, minute: string, period: string) => {
    const actualPeriod = period || "AM";
    const field = routeNumber === 1 ? "route1Time" : "route2Time";
    
    if (hour && minute && actualPeriod) {
      updateField(field, `${hour}:${minute} ${actualPeriod}`);
    } else if (hour || minute || actualPeriod) {
      updateField(field, `${hour || ""}:${minute || ""}:${actualPeriod || ""}`);
    } else {
      updateField(field, "");
    }
  };

  // Update the AM/PM period for both routes when using overall selector
  const updateOverallTimePeriod = (period: string) => {
    const route1Components = parseTime(formData.route1Time);
    const route2Components = parseTime(formData.route2Time);
    
    if (route1Components.hour && route1Components.minute) {
      updateField("route1Time", `${route1Components.hour}:${route1Components.minute} ${period}`);
    }
    if (route2Components.hour && route2Components.minute) {
      updateField("route2Time", `${route2Components.hour}:${route2Components.minute} ${period}`);
    }
  };

  // Render time selector (reusable)
  const renderTimeSelector = (
    timeStr: string,
    onChange: (hour: string, minute: string, period: string) => void,
    label: string = "TIME",
    hideAmPm: boolean = false
  ) => {
    const timeComponents = parseTime(timeStr);
    const displayPeriod = timeComponents.period || "AM";

    return (
      <div>
        <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
          {label}
        </label>
        <div className="flex gap-1">
          {/* Hour */}
          <select
            value={timeComponents.hour}
            onChange={(e) => onChange(e.target.value, timeComponents.minute, timeComponents.period)}
            className="px-2 py-2 rounded-lg flex-1"
            style={{
              border: '2px solid #072B31',
              backgroundColor: '#FFF8E7',
              color: '#072B31',
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <option value="">HR</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>

          {/* Minute */}
          <select
            value={timeComponents.minute}
            onChange={(e) => onChange(timeComponents.hour, e.target.value, timeComponents.period)}
            className="px-2 py-2 rounded-lg flex-1"
            style={{
              border: '2px solid #072B31',
              backgroundColor: '#FFF8E7',
              color: '#072B31',
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            <option value="">MIN</option>
            {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
              <option key={minute} value={minute.toString().padStart(2, "0")}>
                {minute.toString().padStart(2, "0")}
              </option>
            ))}
          </select>

          {/* AM/PM Toggle - Only show if not hidden */}
          {!hideAmPm && (
            <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid #072B31' }}>
              <button
                type="button"
                onClick={() => onChange(timeComponents.hour, timeComponents.minute, "AM")}
                className="px-3 py-2 font-medium transition"
                style={{
                  backgroundColor: displayPeriod === "AM" ? "#FFF8E7" : "#072B31",
                  color: displayPeriod === "AM" ? "#072B31" : "#DCFF7C",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700,
                  borderRight: '1px solid #072B31',
                  fontSize: '14px'
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => onChange(timeComponents.hour, timeComponents.minute, "PM")}
                className="px-3 py-2 font-medium transition"
                style={{
                  backgroundColor: displayPeriod === "PM" ? "#FFF8E7" : "#072B31",
                  color: displayPeriod === "PM" ? "#072B31" : "#DCFF7C",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                PM
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render location selector (reusable)
  const renderLocationSelector = (
    locationType: string,
    location: string,
    onLocationChange: (type: string, location: string) => void,
    label: string = "START LOCATION",
    useVerticalLayout: boolean = false
  ) => {
    return (
      <div>
        <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
          {label}
        </label>
        <div className={useVerticalLayout ? "grid grid-cols-1 gap-2 mb-2" : "grid grid-cols-2 gap-2 mb-2"}>
          <button
            type="button"
            onClick={() => onLocationChange("central-library", "CENTRAL LIBRARY")}
            className="px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
            style={{
              border: '2px solid #072B31',
              backgroundColor: locationType === "central-library" ? "#FFF8E7" : "#072B31",
              color: locationType === "central-library" ? "#072B31" : "#DCFF7C",
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 600
            }}
          >
            <div className="w-6 h-6 flex-shrink-0">
              <svg width="24" height="24" fill="none" viewBox="0 0 37.88 37.88">
                <g>
                  <path d={svgPathsSquare.p1449b000} fill="#DCFF7C" />
                  <path d={svgPathsSquare.p2f814100} fill="#13322B" />
                  <path d={svgPathsSquare.p1449b000} stroke="#072B31" strokeWidth="1.88" />
                  <path d={svgPathsSquare.p2f814100} stroke="#072B31" strokeWidth="1.88" />
                </g>
              </svg>
            </div>
            <span className="text-sm text-left flex-1 uppercase">CENTRAL LIBRARY</span>
          </button>

          <button
            type="button"
            onClick={() => onLocationChange("macri-triangle", "MACRI TRIANGLE (WILLIAMSBURG)")}
            className="px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
            style={{
              border: '2px solid #072B31',
              backgroundColor: locationType === "macri-triangle" ? "#FFF8E7" : "#072B31",
              color: locationType === "macri-triangle" ? "#072B31" : "#DCFF7C",
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 600
            }}
          >
            <div className="w-6 h-6 flex-shrink-0">
              <svg width="24" height="24" fill="none" viewBox="0 0 37.88 37.88">
                <g>
                  <path d={svgPathsTriangle.p1449b000} fill="#DCFF7C" />
                  <path d={svgPathsTriangle.p21284000} fill="#072B31" />
                  <path d={svgPathsTriangle.p1449b000} stroke="#072B31" strokeWidth="1.88" />
                  <path d={svgPathsTriangle.p21284000} stroke="#072B31" strokeWidth="1.88" />
                </g>
              </svg>
            </div>
            <span className="text-sm text-left flex-1 uppercase">MACRI TRIANGLE</span>
          </button>

          <button
            type="button"
            onClick={() => onLocationChange("maria-hernandez", "MARIA HERNANDEZ PARK (SUYDAN & KNICKERBOCKER)")}
            className="px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
            style={{
              border: '2px solid #072B31',
              backgroundColor: locationType === "maria-hernandez" ? "#FFF8E7" : "#072B31",
              color: locationType === "maria-hernandez" ? "#072B31" : "#DCFF7C",
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 600
            }}
          >
            <div className="w-6 h-6 flex-shrink-0">
              <StarterMariaHernandez />
            </div>
            <span className="text-sm text-left flex-1 uppercase">MARIA HERNANDEZ PARK</span>
          </button>

          <button
            type="button"
            onClick={() => onLocationChange("prospect-park", "PROSPECT PARK VIA LINCOLN & OCEAN ENTRANCE")}
            className="px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
            style={{
              border: '2px solid #072B31',
              backgroundColor: locationType === "prospect-park" ? "#FFF8E7" : "#072B31",
              color: locationType === "prospect-park" ? "#072B31" : "#DCFF7C",
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 600
            }}
          >
            <div className="w-6 h-6 flex-shrink-0">
              <StarterCentralLibrary />
            </div>
            <span className="text-sm text-left flex-1 uppercase">PROSPECT PARK</span>
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 500, opacity: 0.7 }}>
            OR ENTER CUSTOM LOCATION:
          </label>
          {useVerticalLayout ? (
            <textarea
              placeholder="TYPE CUSTOM START LOCATION HERE..."
              value={locationType === "other" ? location : ""}
              onFocus={(e) => {
                // Auto-select "other" type when user clicks in the input
                if (locationType !== "other") {
                  onLocationChange("other", "");
                }
              }}
              onChange={(e) => onLocationChange("other", e.target.value.toUpperCase())}
              rows={3}
              className="w-full px-4 py-2 rounded-lg uppercase resize-none"
              style={{
                border: `2px solid #072B31`,
                backgroundColor: locationType === "other" && location ? "#FFF8E7" : "#072B31",
                color: locationType === "other" && location ? "#072B31" : "#DCFF7C",
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 500
              }}
            />
          ) : (
            <input
              type="text"
              placeholder="TYPE CUSTOM START LOCATION HERE..."
              value={locationType === "other" ? location : ""}
              onFocus={(e) => {
                // Auto-select "other" type when user clicks in the input
                if (locationType !== "other") {
                  onLocationChange("other", "");
                }
              }}
              onChange={(e) => onLocationChange("other", e.target.value.toUpperCase())}
              className="w-full px-4 py-2 rounded-lg uppercase"
              style={{
                border: `2px solid #072B31`,
                backgroundColor: locationType === "other" && location ? "#FFF8E7" : "#072B31",
                color: locationType === "other" && location ? "#072B31" : "#DCFF7C",
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 500
              }}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'Figtree, sans-serif' }}>
      {/* Auto-Detection Indicator */}
      {!formData.differentStarts && hasAutoDifferentStarts() && hasRoute2 && (
        <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="9" stroke="#072B31" strokeWidth="2"/>
            <path d="M10 6V10.5M10 14H10.01" stroke="#072B31" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-xs font-medium uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif' }}>
            DIFFERENT START LOCATIONS DETECTED - USING "DIFFERENT STARTS" LAYOUT AUTOMATICALLY
          </p>
        </div>
      )}

      {/* Day & Time Section */}
      <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#072B31', border: '2px solid #DCFF7C' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          When
        </h3>

        {/* Time - Different rendering based on Different Starts */}
        {isDifferentStarts && hasRoute2 ? (
          <>
            {/* Day */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
              <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
                DAY
              </label>
              <select
                value={formData.day}
                onChange={(e) => updateField("day", e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{
                  border: '2px solid #072B31',
                  backgroundColor: '#FFF8E7',
                  color: '#072B31',
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 500
                }}
              >
                <option value="">SELECT A DAY</option>
                <option value="MONDAY">MONDAY</option>
                <option value="TUESDAY">TUESDAY</option>
                <option value="WEDNESDAY">WEDNESDAY</option>
                <option value="THURSDAY">THURSDAY</option>
                <option value="FRIDAY">FRIDAY</option>
                <option value="SATURDAY">SATURDAY</option>
                <option value="SUNDAY">SUNDAY</option>
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Day and Time in same row when NOT Different Starts */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Day */}
                <div>
                  <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
                    DAY
                  </label>
                  <select
                    value={formData.day}
                    onChange={(e) => updateField("day", e.target.value)}
                    className="w-full px-4 py-2 rounded-lg"
                    style={{
                      border: '2px solid #072B31',
                      backgroundColor: '#FFF8E7',
                      color: '#072B31',
                      fontFamily: 'Figtree, sans-serif',
                      fontWeight: 500
                    }}
                  >
                    <option value="">SELECT A DAY</option>
                    <option value="MONDAY">MONDAY</option>
                    <option value="TUESDAY">TUESDAY</option>
                    <option value="WEDNESDAY">WEDNESDAY</option>
                    <option value="THURSDAY">THURSDAY</option>
                    <option value="FRIDAY">FRIDAY</option>
                    <option value="SATURDAY">SATURDAY</option>
                    <option value="SUNDAY">SUNDAY</option>
                  </select>
                </div>

                {/* Time */}
                <div>
                  {renderTimeSelector(formData.time, updateTime)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Route-specific times when Different Starts */}
        {isDifferentStarts && hasRoute2 && (
          <>
            {/* Determine which route is longer */}
            {(() => {
              const route1IsLonger = route1.distance >= route2.distance;
              const route1Title = `Route 1 / ${route1IsLonger ? 'Long' : 'Short'} Run (${route1.distance.toFixed(1)} Miles)`;
              const route2Title = `Route 2 / ${route1IsLonger ? 'Short' : 'Long'} Run (${route2.distance.toFixed(1)} Miles)`;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Route 1 Time */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
                    <h3 className="text-sm font-bold mb-3 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif' }}>
                      {route1Title}
                    </h3>
                    {renderTimeSelector(formData.route1Time, (h, m, p) => updateRouteTime(1, h, m, p), "START TIME", false)}
                  </div>

                  {/* Route 2 Time */}
                  <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
                    <h3 className="text-sm font-bold mb-3 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif' }}>
                      {route2Title}
                    </h3>
                    {renderTimeSelector(formData.route2Time, (h, m, p) => updateRouteTime(2, h, m, p), "START TIME", false)}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Location Section */}
      <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#072B31', border: '2px solid #DCFF7C' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Where
        </h3>
        
        {/* Location - Different rendering based on Different Starts */}
        {isDifferentStarts && hasRoute2 ? (
          <>
            {/* Determine which route is longer */}
            {(() => {
              const route1IsLonger = route1.distance >= route2.distance;
              const route1Title = `Route 1 / ${route1IsLonger ? 'Long' : 'Short'} Run (${route1.distance.toFixed(1)} Miles)`;
              const route2Title = `Route 2 / ${route1IsLonger ? 'Short' : 'Long'} Run (${route2.distance.toFixed(1)} Miles)`;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Route 1 Start Location */}
                  <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
                    <h3 className="text-sm font-bold mb-3 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif' }}>
                      {route1Title}
                    </h3>
                    {renderLocationSelector(
                      formData.route1StartLocationType,
                      formData.route1StartLocation,
                      (type, location) => {
                        setFormData({
                          ...formData,
                          route1StartLocationType: type,
                          route1StartLocation: location
                        });
                      },
                      "START LOCATION",
                      true
                    )}
                  </div>

                  {/* Route 2 Start Location */}
                  <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
                    <h3 className="text-sm font-bold mb-3 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif' }}>
                      {route2Title}
                    </h3>
                    {renderLocationSelector(
                      formData.route2StartLocationType,
                      formData.route2StartLocation,
                      (type, location) => {
                        setFormData({
                          ...formData,
                          route2StartLocationType: type,
                          route2StartLocation: location
                        });
                      },
                      "START LOCATION",
                      true
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <>
            {/* Shared Start Location */}
            <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
              {renderLocationSelector(
                formData.startLocationType,
                formData.startLocation,
                (type, location) => {
                  const newFormData = {
                    ...formData,
                    startLocationType: type,
                    startLocation: location
                  };

                  // Auto-check "Use Start Location Visual Aid" for custom locations if not manually set
                  if (type === "other" && !formData.hasManuallySetRoute1BadgeView) {
                    newFormData.route1BadgeView = "detail";
                    newFormData.route2BadgeView = "detail";
                  }
                  // Auto-uncheck for preset locations if not manually set
                  else if (type !== "other" && type !== "" && !formData.hasManuallySetRoute1BadgeView) {
                    newFormData.route1BadgeView = "distance";
                    newFormData.route2BadgeView = "distance";
                  }

                  setFormData(newFormData);
                },
                "START LOCATION",
                false
              )}

              {/* Use Start Detail Aid Checkbox */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="useStartDetail"
                  checked={formData.route1BadgeView === "detail"}
                  onChange={(e) => setFormData({
                    ...formData,
                    route1BadgeView: e.target.checked ? "detail" : "distance",
                    route2BadgeView: e.target.checked ? "detail" : "distance",
                    hasManuallySetRoute1BadgeView: true,  // Mark as manually set
                    hasManuallySetRoute2BadgeView: true   // Mark as manually set
                  })}
                  className="w-5 h-5 rounded"
                  style={{
                    accentColor: '#072B31',
                    border: '2px solid #072B31'
                  }}
                />
                <label htmlFor="useStartDetail" className="text-sm font-medium uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
                  USE START DETAIL AID
                </label>
              </div>
            </div>
          </>
        )}

        {/* End Location */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
          <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
            END LOCATION
          </label>
          <textarea
            placeholder="E.G., BROOKLYN BRIDGE"
            value={formData.endLocation}
            onChange={(e) => updateField("endLocation", e.target.value.toUpperCase())}
            rows={2}
            className="w-full px-4 py-2 rounded-lg resize-none"
            style={{
              border: '2px solid #072B31',
              backgroundColor: formData.endLocation ? '#FFF8E7' : '#072B31',
              color: formData.endLocation ? '#072B31' : '#DCFF7C',
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 500
            }}
          />
        </div>
      </div>

      {/* Trans Nonbinary Only - Hidden when Different Starts is active */}
      {!isDifferentStarts && (
        <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: '#072B31', border: '2px solid #DCFF7C' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Who
          </h3>
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '2px solid #072B31' }}>
              <button
                type="button"
                onClick={() => updateField("isTnbOnly", false)}
                className="px-4 py-2 font-medium transition flex-1"
                style={{
                  backgroundColor: !formData.isTnbOnly ? "#FFF8E7" : "#072B31",
                  color: !formData.isTnbOnly ? "#072B31" : "#DCFF7C",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700,
                  borderRight: '1px solid #072B31',
                  fontSize: '14px'
                }}
              >
                ALL QUEERS
              </button>
              <button
                type="button"
                onClick={() => updateField("isTnbOnly", true)}
                className="px-4 py-2 font-medium transition flex-1"
                style={{
                  backgroundColor: formData.isTnbOnly ? "#FFF8E7" : "#072B31",
                  color: formData.isTnbOnly ? "#072B31" : "#DCFF7C",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                TRANS NONBINARY ONLY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}