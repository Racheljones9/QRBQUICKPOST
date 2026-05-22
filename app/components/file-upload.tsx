import { Upload, X } from "lucide-react";
import type { RouteData, FormData } from "@/app/types";
import { parseGPX } from "@/app/utils/gpx-parser";

/**
 * FILE UPLOAD COMPONENT
 * 
 * Handles uploading and parsing of GPX route files (max 2 routes).
 * - Route 1 is required
 * - Route 2 is optional
 * - Displays filename and calculated distance after upload
 * - Allows removing uploaded routes
 */

type FileUploadProps = {
  route1: RouteData;
  route2: RouteData;
  setRoute1: (route: RouteData) => void;
  setRoute2: (route: RouteData) => void;
  formData: FormData;
  setFormData: (data: FormData) => void;
};

export function FileUpload({
  route1,
  route2,
  setRoute1,
  setRoute2,
  formData,
  setFormData,
}: FileUploadProps) {
  // Parse uploaded GPX file and extract route data
  const handleFileUpload = async (
    file: File,
    routeNumber: 1 | 2
  ) => {
    try {
      const text = await file.text();
      const { distance, coordinates } = await parseGPX(text);

      const routeData: RouteData = {
        gpxFile: file,
        distance,
        coordinates,
      };

      if (routeNumber === 1) {
        setRoute1(routeData);
      } else {
        setRoute2(routeData);
      }
    } catch (error) {
      console.error("Error parsing GPX:", error);
      alert("Failed to parse GPX file. Please check the file format.");
    }
  };

  // Clear a route slot
  const removeRoute = (routeNumber: 1 | 2) => {
    const emptyRoute: RouteData = {
      gpxFile: null,
      distance: 0,
      coordinates: [],
    };
    if (routeNumber === 1) {
      setRoute1(emptyRoute);
      // Reset location fields when route 1 is removed
      setFormData({
        ...formData,
        startLocation: "",
        startLocationType: "",
        route1StartLocation: "",
        route1StartLocationType: "",
        endLocation: "",
      });
    } else {
      setRoute2(emptyRoute);
      // Reset route 2 location fields when route 2 is removed
      setFormData({
        ...formData,
        route2StartLocation: "",
        route2StartLocationType: "",
      });
    }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: 'Figtree, sans-serif' }}>
      {/* Route Uploads - Side by Side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route 1 */}
        <div>
          <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
            ROUTE 1 (REQUIRED)
          </label>
          {route1.gpxFile ? (
            <div className="flex items-center justify-between p-4 rounded-lg h-20" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
              <div>
                <p className="font-medium" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 700 }}>{route1.gpxFile.name}</p>
                <p className="text-sm uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 500 }}>
                  {route1.distance.toFixed(2)} MILES
                </p>
              </div>
              <button
                onClick={() => removeRoute(1)}
                className="p-2 rounded-full transition hover:opacity-70"
                style={{ backgroundColor: '#072B31' }}
              >
                <X className="w-5 h-5" style={{ color: '#DCFF7C' }} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition hover:opacity-70" style={{ borderColor: '#DCFF7C', backgroundColor: 'rgba(220, 255, 124, 0.1)' }}>
              <Upload className="w-8 h-8 mb-2" style={{ color: '#DCFF7C', opacity: 0.7 }} />
              <span className="text-sm uppercase" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', fontWeight: 500, opacity: 0.7 }}>UPLOAD GPX FILE</span>
              <input
                type="file"
                className="hidden"
                accept=".gpx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 1);
                }}
              />
            </label>
          )}
        </div>

        {/* Route 2 */}
        <div>
          <label className="block text-sm font-medium mb-2 uppercase" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', fontWeight: 600 }}>
            ROUTE 2 (OPTIONAL)
          </label>
          {route2.gpxFile ? (
            <div className="flex items-center justify-between p-4 rounded-lg h-20" style={{ backgroundColor: '#DCFF7C', border: '2px solid #072B31' }}>
              <div>
                <p className="font-medium" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 700 }}>{route2.gpxFile.name}</p>
                <p className="text-sm uppercase" style={{ color: '#072B31', fontFamily: 'Figtree, sans-serif', fontWeight: 500 }}>
                  {route2.distance.toFixed(2)} MILES
                </p>
              </div>
              <button
                onClick={() => removeRoute(2)}
                className="p-2 rounded-full transition hover:opacity-70"
                style={{ backgroundColor: '#072B31' }}
              >
                <X className="w-5 h-5" style={{ color: '#DCFF7C' }} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer transition hover:opacity-70" style={{ borderColor: '#DCFF7C', backgroundColor: 'rgba(220, 255, 124, 0.1)' }}>
              <Upload className="w-8 h-8 mb-2" style={{ color: '#DCFF7C', opacity: 0.7 }} />
              <span className="text-sm uppercase" style={{ color: '#DCFF7C', fontFamily: 'Figtree, sans-serif', fontWeight: 500, opacity: 0.7 }}>UPLOAD GPX FILE</span>
              <input
                type="file"
                className="hidden"
                accept=".gpx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 2);
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}