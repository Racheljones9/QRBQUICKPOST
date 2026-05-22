import type { FormData } from "@/app/types";

/**
 * DOWNLOAD VIEW SELECTOR COMPONENT
 * 
 * Allows users to choose badge display mode for each route:
 * - "Full Route Mileage": Shows distance (e.g., "5.2 MILES") with full route view
 * - "Start Detail Indicator": Shows "+ START" label and zooms map to start point
 * 
 * This is useful when the start location needs more context (e.g., specific park entrance)
 */

type DownloadViewSelectorProps = {
  formData: FormData;
  setFormData: (data: FormData) => void;
  hasRoute2: boolean; // Whether a second route is uploaded
};

export function DownloadViewSelector({ formData, setFormData, hasRoute2 }: DownloadViewSelectorProps) {
  // Update badge view for Route 1
  const updateRoute1BadgeView = (view: "distance" | "detail") => {
    setFormData({ ...formData, route1BadgeView: view });
  };

  // Update badge view for Route 2
  const updateRoute2BadgeView = (view: "distance" | "detail") => {
    setFormData({ ...formData, route2BadgeView: view });
  };

  // Update both badge views when Different Starts is active
  const updateBothBadgeViews = (view: "distance" | "detail") => {
    setFormData({ ...formData, route1BadgeView: view, route2BadgeView: view });
  };

  return (
    <div style={{ fontFamily: 'Figtree, sans-serif' }} className="space-y-4">
      {/* Single Badge Options - When Different Starts is active OR when there are 2 routes */}
      {(formData.differentStarts && hasRoute2) || hasRoute2 ? (
        <div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateBothBadgeViews("distance")}
              className="px-3 py-2 font-medium transition rounded-lg"
              style={{
                border: '2px solid #072B31',
                backgroundColor: formData.route1BadgeView === "distance" ? "#DCFF7C" : "white",
                color: "#072B31",
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 700
              }}
            >
              Full Route Mileage
            </button>
            <button
              type="button"
              onClick={() => updateBothBadgeViews("detail")}
              className="px-3 py-2 font-medium transition rounded-lg"
              style={{
                border: '2px solid #072B31',
                backgroundColor: formData.route1BadgeView === "detail" ? "#DCFF7C" : "white",
                color: "#072B31",
                fontFamily: 'Figtree, sans-serif',
                fontWeight: 700
              }}
            >
              Start Detail
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Route 1 Badge Options - Only show when there's only 1 route */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateRoute1BadgeView("distance")}
                className="px-3 py-2 font-medium transition rounded-lg"
                style={{
                  border: '2px solid #072B31',
                  backgroundColor: formData.route1BadgeView === "distance" ? "#DCFF7C" : "white",
                  color: "#072B31",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700
                }}
              >
                Full Route Mileage
              </button>
              <button
                type="button"
                onClick={() => updateRoute1BadgeView("detail")}
                className="px-3 py-2 font-medium transition rounded-lg"
                style={{
                  border: '2px solid #072B31',
                  backgroundColor: formData.route1BadgeView === "detail" ? "#DCFF7C" : "white",
                  color: "#072B31",
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 700
                }}
              >
                Start Detail Indicator
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}