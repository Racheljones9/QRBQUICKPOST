import { forwardRef, useRef, useEffect, useState } from "react";
import type { RouteData, FormData } from "@/app/types";
import TnbOnly from "@/imports/TnbOnly";
import Else from "@/imports/Else";
import Vector from "@/imports/Vector";
import { RouteMap } from "@/app/components/route-map";
import { CombinedRouteMap } from "@/app/components/combined-route-map";
import html2canvas from "html2canvas";
import { Download } from "lucide-react";
import L from "leaflet";
import pmTnbOnlyBg from "figma:asset/7383d600c46fe2ac180709811347a021cac0ade8.png";
import pmElseBg from "figma:asset/6bf43c5d288b0806b49d214cf5413c7e5362e70d.png";
import amTnbOnlyBg from "figma:asset/9498469224295163346b92282e51dc151ad1257d.png";
import amElseBg from "figma:asset/b483ff3a5860d36666bd9b79ddcc9a74dfb0342d.png";

/**
 * STORY CANVAS COMPONENT
 * 
 * This is the core component that renders the Instagram Story preview and handles download.
 * 
 * Key Responsibilities:
 * 1. Renders the full 1080x1900 story at 48% scale for preview
 * 2. Displays background image based on time (AM/PM) and run type (TNB/Else)
 * 3. Shows 1 or 2 route maps side-by-side (if 2 routes uploaded)
 * 4. Overlays text elements: day/time, locations, distance badges, TNB label
 * 5. Syncs zoom/pan between two maps when both routes are present
 * 6. Converts the canvas to PNG using html2canvas for download
 * 
 * Positioning Strategy:
 * - Uses absolute pixel positioning (not flexbox/transforms) for html2canvas compatibility
 * - All positions are calculated for 1080x1900, then preview is scaled to 35%
 * - Text elements use explicit top/left values to ensure consistent rendering
 * 
 * Background Selection Logic:
 * - AM + TNB Only = amTnbOnlyBg
 * - AM + General = amElseBg
 * - PM + TNB Only = pmTnbOnlyBg
 * - PM + General = pmElseBg
 */

type StoryCanvasProps = {
  route1: RouteData;
  route2: RouteData;
  formData: FormData;
};

export const StoryCanvas = forwardRef<HTMLDivElement, StoryCanvasProps>(
  ({ route1, route2, formData }, ref) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const hasRoute2 = route2.gpxFile !== null;  // Whether user uploaded 2 routes
    const map1Ref = useRef<L.Map | null>(null);  // Reference to first Leaflet map
    const map2Ref = useRef<L.Map | null>(null);  // Reference to second Leaflet map
    const runToTextRef = useRef<HTMLDivElement>(null); // Reference to measure RUN TO text height
    const previewContainerRef = useRef<HTMLDivElement>(null); // Reference to preview container for responsive scaling

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
      // More lenient to catch actual different starts
      const tolerance = 0.0005;
      const latDiff = Math.abs(start1[0] - start2[0]);
      const lngDiff = Math.abs(start1[1] - start2[1]);
      
      // If either difference exceeds tolerance, they have different starts
      const hasDifferentStarts = latDiff > tolerance || lngDiff > tolerance;
      
      // Debug logging
      console.log('Auto-detect Different Starts:', {
        start1: start1,
        start2: start2,
        latDiff: latDiff,
        lngDiff: lngDiff,
        tolerance: tolerance,
        result: hasDifferentStarts
      });
      
      return hasDifferentStarts;
    };

    // Use auto-detection OR manual selection
    const isDifferentStarts = formData.differentStarts || hasAutoDifferentStarts();

    // State to track the actual height of the RUN TO text
    const [runToTextHeight, setRunToTextHeight] = useState(164); // Default estimate
    
    // State to track the scale factor for responsive preview
    const [previewScale, setPreviewScale] = useState(0.5); // Default to 50%

    // Measure RUN TO text height whenever it changes
    useEffect(() => {
      if (isDifferentStarts && hasRoute2 && runToTextRef.current) {
        // Wait a frame for rendering
        requestAnimationFrame(() => {
          if (runToTextRef.current) {
            const height = runToTextRef.current.offsetHeight;
            setRunToTextHeight(height);
          }
        });
      }
    }, [isDifferentStarts, hasRoute2, formData.endLocation]);

    // Calculate responsive scale based on container width
    useEffect(() => {
      const updateScale = () => {
        if (previewContainerRef.current) {
          const containerWidth = previewContainerRef.current.offsetWidth;
          // Canvas is 1080px wide, calculate scale to fill container width
          const scale = containerWidth / 1080;
          setPreviewScale(scale);
        }
      };

      // Run immediately and on resize
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }, []);

    /**
     * DYNAMIC LAYOUT CALCULATIONS
     * Calculate positions backwards from target: RUN TO text ends at 1479.11px
     * Map height ranges from 398px (short text) to 798px (long text)
     */
    const TARGET_RUN_TO_END = 1479.11;
    const MIN_MAP_HEIGHT = 398;
    const MAX_MAP_HEIGHT = 798;
    const GAP_BEFORE_RUN_TO = isDifferentStarts && hasRoute2 ? 48 : 53; // 48px for Different Starts, 53px for normal
    const GAP_AFTER_RUN_TO = 10; // 10px gap below the end of RUN TO text
    const LOCATION_SECTION_HEIGHT = isDifferentStarts && hasRoute2 ? 248.11 : 283.11; // Reduced by 35px when Different Starts
    const HEADER_START_TOP = 398; // Fixed top position
    const TOTAL_COMBINED_HEIGHT = 798; // Total height of location section + map when Different Starts is selected
    
    // Layout for Different Starts - Two separate rectangles
    const DIFF_STARTS_RECT_WIDTH = 405.5; // Width of each rectangle - expanded to match combined map width
    const DIFF_STARTS_GAP = 20; // Gap between rectangles
    const DIFF_STARTS_LOCATION_HEIGHT = 270; // Height of location section in each rectangle (increased by 10px)
    const DIFF_STARTS_MAP_HEIGHT = 528; // Height of map in each rectangle (decreased by 10px to maintain total)
    const DIFF_STARTS_TOTAL_HEIGHT = DIFF_STARTS_LOCATION_HEIGHT + DIFF_STARTS_MAP_HEIGHT; // Total rectangle height
    
    // New layout for Different Starts: 3 maps
    const DIFF_STARTS_COMBINED_MAP_HEIGHT = 350; // Height of the combined map showing both routes (reduced by 10px)
    const DIFF_STARTS_DETAIL_MAP_HEIGHT = 280; // Height of each detail map
    const DIFF_STARTS_MAP_GAP = 20; // Gap between maps
    const DIFF_STARTS_COMBINED_MAP_WIDTH = 831; // Match standard map width
    const START_LOCATION_SECTION_HEIGHT = 80; // Height allocated for start location text + spacing
    
    // Calculate combined map position to maintain 53px gap from "MEET @" text
    // runToTop for Different Starts = HEADER_START_TOP + DIFF_STARTS_TOTAL_HEIGHT + 53 = 1249px
    // We want 53px gap, so: bottom of combined map = runToTop - 53 = 1196px
    // Therefore: top of combined map = 1196 - DIFF_STARTS_COMBINED_MAP_HEIGHT = 836px
    const COMBINED_MAP_TOP_DIFF_STARTS = 836;
    
    // When Different Starts: Location section at top, maps below
    // When normal: Maps at top, location section below (original behavior)
    const locationSectionTop = isDifferentStarts && hasRoute2
      ? HEADER_START_TOP // Location section at top when Different Starts
      : 912.89; // Original position
    
    const locationSectionBottom = isDifferentStarts && hasRoute2
      ? HEADER_START_TOP + LOCATION_SECTION_HEIGHT
      : 1196; // Original position
    
    const mapStartTop = isDifferentStarts && hasRoute2
      ? locationSectionBottom // Maps start after location section
      : HEADER_START_TOP; // Original position
    
    // Map height: Fixed when Different Starts, otherwise use MAX
    // When Different Starts: Total combined height (798px) - location section height (283.11px) = 514.89px
    const mapHeight = isDifferentStarts && hasRoute2
      ? TOTAL_COMBINED_HEIGHT - LOCATION_SECTION_HEIGHT // 798px - 283.11px = 514.89px
      : MAX_MAP_HEIGHT; // 798px for normal mode
    
    // Calculate runToTop: 53px gap below map container for both modes
    const runToTop = isDifferentStarts && hasRoute2 
      ? HEADER_START_TOP + DIFF_STARTS_TOTAL_HEIGHT + 53 + 48 // Fixed 53px gap below rectangles + 48px shift down
      : 1249; // Original position for normal mode
    
    const verticalDividerHeight = isDifferentStarts && hasRoute2
      ? TOTAL_COMBINED_HEIGHT // 798px total
      : MAX_MAP_HEIGHT;

    /**
     * Extract AM/PM from time string
     * Handles both full format "6:30 PM" and partial format "6:30:PM"
     */
    const getTimePeriod = (timeStr: string): "AM" | "PM" | null => {
      if (!timeStr) return null;
      // Check for full format (H:MM AM/PM)
      const match = timeStr.match(/\s*(AM|PM)$/i);
      if (match) {
        return match[1].toUpperCase() as "AM" | "PM";
      }
      // Check for partial format (hour::minute::period)
      const partialMatch = timeStr.match(/^[^:]*:[^:]*:(.*)$/);
      if (partialMatch && (partialMatch[1] === "AM" || partialMatch[1] === "PM")) {
        return partialMatch[1] as "AM" | "PM";
      }
      return null;
    };

    // When Different Starts is active, use route1Time to determine AM/PM for background
    // Otherwise use the main time field
    const timeForBackground = isDifferentStarts && hasRoute2 ? formData.route1Time : formData.time;
    const timePeriod = getTimePeriod(timeForBackground);

    /**
     * Determine map theme based on time (AM/PM) and run type (TNB/Else)
     * This controls the color overlay on the map tiles
     */
    const getMapTheme = (): "am-tnb" | "am-else" | "pm-tnb" | "pm-else" => {
      if (timePeriod === "PM") {
        return formData.isTnbOnly ? "pm-tnb" : "pm-else";
      } else {
        return formData.isTnbOnly ? "am-tnb" : "am-else";
      }
    };

    const mapTheme = getMapTheme();

    /**
     * Determine route order for Different Starts mode
     * Longer route goes on LEFT, shorter route goes on RIGHT
     */
    const getRouteOrder = () => {
      if (!isDifferentStarts || !hasRoute2) {
        return { leftRoute: null, rightRoute: null };
      }
      
      // Check if both routes have valid coordinates
      if (!route1.coordinates || route1.coordinates.length === 0 || 
          !route2.coordinates || route2.coordinates.length === 0) {
        return { leftRoute: null, rightRoute: null };
      }
      
      const route1IsLonger = route1.distance >= route2.distance;
      
      const leftRoute = route1IsLonger ? {
        coordinates: route1.coordinates,
        distance: route1.distance,
        startLocation: formData.route1StartLocation,
        startLocationType: formData.route1StartLocationType,
        time: formData.route1Time,
        badgeView: formData.route1BadgeView
      } : {
        coordinates: route2.coordinates,
        distance: route2.distance,
        startLocation: formData.route2StartLocation,
        startLocationType: formData.route2StartLocationType,
        time: formData.route2Time,
        badgeView: formData.route2BadgeView
      };
      
      const rightRoute = route1IsLonger ? {
        coordinates: route2.coordinates,
        distance: route2.distance,
        startLocation: formData.route2StartLocation,
        startLocationType: formData.route2StartLocationType,
        time: formData.route2Time,
        badgeView: formData.route2BadgeView
      } : {
        coordinates: route1.coordinates,
        distance: route1.distance,
        startLocation: formData.route1StartLocation,
        startLocationType: formData.route1StartLocationType,
        time: formData.route1Time,
        badgeView: formData.route1BadgeView
      };
      
      return { leftRoute, rightRoute };
    };

    const { leftRoute, rightRoute } = getRouteOrder();

    /**
     * Determine if maps should be synced
     * Maps only sync when both routes are set to "distance" view
     * When using Start/Finish labels, users may want independent views
     * DO NOT sync when Different Starts mode is active (uses single combined map)
     */
    const shouldSyncMaps = hasRoute2 && 
                          !isDifferentStarts && // Don't sync in Different Starts mode
                          formData.route1BadgeView === "distance" && 
                          formData.route2BadgeView === "distance";

    /**
     * Determine if distance badge colors should be flipped
     * Colors flip when there are 2 routes and one is "distance" and the other is not
     */
    const shouldFlipBadgeColors = hasRoute2 &&
      ((formData.route1BadgeView === "distance" && formData.route2BadgeView === "detail") ||
       (formData.route1BadgeView === "detail" && formData.route2BadgeView === "distance"));

    // Determine which background to use
    const renderBackground = () => {
      if (timePeriod === "PM") {
        // PM backgrounds - use images
        if (formData.isTnbOnly) {
          return (
            <img
              src={pmTnbOnlyBg}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "1080px",
                height: "1920px",
                objectFit: "cover",
              }}
            />
          );
        } else {
          return (
            <img
              src={pmElseBg}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "1080px",
                height: "1920px",
                objectFit: "cover",
              }}
            />
          );
        }
      } else {
        // AM backgrounds (default) - use existing components
        if (formData.isTnbOnly) {
          return (
            <img
              src={amTnbOnlyBg}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "1080px",
                height: "1920px",
                objectFit: "cover",
              }}
            />
          );
        } else {
          return (
            <img
              src={amElseBg}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "1080px",
                height: "1920px",
                objectFit: "cover",
              }}
            />
          );
        }
      }
    };

    const downloadImage = async () => {
      if (!canvasRef.current) return;

      try {
        // Show loading state
        const button = document.activeElement as HTMLButtonElement;
        const originalText = button?.textContent;
        if (button) button.textContent = 'Preparing download...';

        // Temporarily remove the scale transform to capture at full size
        const originalTransform = canvasRef.current.style.transform;
        canvasRef.current.style.transform = 'none';

        // Disable all map interactions during capture to prevent canvas issues
        const maps = [map1Ref.current, map2Ref.current].filter(Boolean) as L.Map[];
        maps.forEach(map => {
          if (map) {
            try {
              map.dragging?.disable();
              map.touchZoom?.disable();
              map.doubleClickZoom?.disable();
              map.scrollWheelZoom?.disable();
              map.boxZoom?.disable();
              map.keyboard?.disable();
            } catch (e) {
              // Ignore if handlers don't exist
            }
          }
        });

        // First invalidation - trigger initial resize
        if (map1Ref.current) {
          try {
            map1Ref.current.invalidateSize(true);
          } catch (e) {
            console.log('Map1 invalidate failed:', e);
          }
        }
        if (map2Ref.current) {
          try {
            map2Ref.current.invalidateSize(true);
          } catch (e) {
            console.log('Map2 invalidate failed:', e);
          }
        }

        // Wait for first resize to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Force a repaint by accessing offsetHeight
        if (canvasRef.current) {
          void canvasRef.current.offsetHeight;
        }

        // Second invalidation - ensure all layers are aligned
        if (map1Ref.current) {
          try {
            map1Ref.current.invalidateSize(true);
            // Force the map to redraw all layers
            map1Ref.current.eachLayer((layer: any) => {
              if (layer.redraw && layer._canvas && layer._ctx) {
                try {
                  layer.redraw();
                } catch (e) {
                  // Ignore redraw errors
                }
              }
            });
          } catch (e) {
            // Ignore layer redraw errors
          }
        }
        if (map2Ref.current) {
          try {
            map2Ref.current.invalidateSize(true);
            // Force the map to redraw all layers
            map2Ref.current.eachLayer((layer: any) => {
              if (layer.redraw && layer._canvas && layer._ctx) {
                try {
                  layer.redraw();
                } catch (e) {
                  // Ignore redraw errors
                }
              }
            });
          } catch (e) {
            // Ignore layer redraw errors
          }
        }

        // Wait for map tiles and canvas layers to fully render - longer delay for tiles
        if (button) button.textContent = 'Loading map tiles...';
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Final repaint trigger
        if (canvasRef.current) {
          void canvasRef.current.offsetHeight;
        }

        // Short final delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture at full 1080x1900 resolution
        if (button) button.textContent = 'Generating image...';
        const canvas = await html2canvas(canvasRef.current, {
          scale: 1,
          backgroundColor: null,
          logging: false,
          useCORS: true,
          allowTaint: false,
          width: 1080,
          height: 1900,
          foreignObjectRendering: false,
          imageTimeout: 30000,
          onclone: (clonedDoc, clonedElement) => {
            // Convert className-based layout to inline styles to avoid CSS parsing issues
            const elementsWithClass = clonedDoc.querySelectorAll('*');
            elementsWithClass.forEach((element: any) => {
              if (!element) return;

              try {
                const classList = element.classList;
                if (!classList) return;

                // Convert common layout classes to inline styles
                if (classList.contains('absolute')) {
                  element.style.position = 'absolute';
                }
                if (classList.contains('relative')) {
                  element.style.position = 'relative';
                }
                if (classList.contains('flex')) {
                  element.style.display = 'flex';
                }
                if (classList.contains('flex-col')) {
                  element.style.flexDirection = 'column';
                }
                if (classList.contains('items-center')) {
                  element.style.alignItems = 'center';
                }
                if (classList.contains('justify-center')) {
                  element.style.justifyContent = 'center';
                }
                if (classList.contains('justify-between')) {
                  element.style.justifyContent = 'space-between';
                }
                if (classList.contains('w-full')) {
                  element.style.width = '100%';
                }
                if (classList.contains('h-full')) {
                  element.style.height = '100%';
                }
                if (classList.contains('overflow-hidden')) {
                  element.style.overflow = 'hidden';
                }
                if (classList.contains('whitespace-nowrap')) {
                  element.style.whiteSpace = 'nowrap';
                }
                if (classList.contains('gap-2')) {
                  element.style.gap = '0.5rem';
                }
                if (classList.contains('flex-shrink-0')) {
                  element.style.flexShrink = '0';
                }
                if (classList.contains('flex-1')) {
                  element.style.flex = '1';
                }
                if (classList.contains('uppercase')) {
                  element.style.textTransform = 'uppercase';
                }
              } catch (e) {
                // Silently ignore
              }
            });

            // Remove style elements that contain oklch colors to prevent parsing errors
            try {
              const styleElements = clonedDoc.querySelectorAll('style');
              styleElements.forEach((styleEl: any) => {
                if (styleEl && styleEl.textContent) {
                  // Check if style contains oklch
                  if (styleEl.textContent.includes('oklch')) {
                    // Remove the entire style element to prevent parsing
                    styleEl.remove();
                  }
                }
              });

              // Also remove link elements that might load external stylesheets with oklch
              const linkElements = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
              linkElements.forEach((link: any) => {
                if (link) {
                  link.remove();
                }
              });
            } catch (e) {
              // Silently ignore
            }

            // Force all SVG elements to be visible
            const svgs = clonedDoc.querySelectorAll('svg');
            svgs.forEach((svg: any) => {
              if (svg && svg.style) {
                svg.style.display = 'block';
                svg.style.visibility = 'visible';
              }
            });

            // Force all path elements (polylines) to be visible
            const paths = clonedDoc.querySelectorAll('path');
            paths.forEach((path: any) => {
              if (path && path.style) {
                path.style.display = 'block';
                path.style.visibility = 'visible';
              }
            });

            // Force all canvas elements to be visible and positioned correctly
            const canvases = clonedDoc.querySelectorAll('canvas');
            canvases.forEach((canvas: any) => {
              if (canvas && canvas.style) {
                canvas.style.display = 'block';
                canvas.style.visibility = 'visible';
              }
            });

            // Force all img elements (tiles) to be visible and set crossOrigin
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach((img: any) => {
              if (img && img.style) {
                img.style.display = 'block';
                img.style.visibility = 'visible';
                // Set crossOrigin for CORS support
                if (!img.crossOrigin) {
                  img.crossOrigin = 'anonymous';
                }
              }
            });

            // Clean up Leaflet internal properties - safe approach
            try {
              const allElementsAgain = clonedDoc.querySelectorAll('*');
              allElementsAgain.forEach((element: any) => {
                if (!element) return;

                try {
                  // Only clean properties, don't try to access methods
                  const allKeys = Object.keys(element);
                  allKeys.forEach(key => {
                    if (key.startsWith('_leaflet')) {
                      try {
                        element[key] = null;
                      } catch (e) {
                        // Silently ignore
                      }
                    }
                  });
                } catch (e) {
                  // Silently ignore
                }
              });
            } catch (e) {
              // Silently ignore
            }
          },
        });

        // Re-enable map interactions
        maps.forEach(map => {
          if (map) {
            try {
              map.dragging?.enable();
              map.touchZoom?.enable();
              map.doubleClickZoom?.enable();
              map.scrollWheelZoom?.enable();
              map.boxZoom?.enable();
              map.keyboard?.enable();
            } catch (e) {
              // Ignore if handlers don't exist
            }
          }
        });

        // Restore the scale transform
        canvasRef.current.style.transform = originalTransform;

        // Download the image
        const link = document.createElement("a");
        link.download = `run-story-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        
        if (button) button.textContent = originalText || 'Download Story PNG';
      } catch (error) {
        console.error("Error generating image:", error);
        alert("Failed to generate image. Please try again.");
        
        // Re-enable map interactions even on error
        const maps = [map1Ref.current, map2Ref.current].filter(Boolean) as L.Map[];
        maps.forEach(map => {
          if (map) {
            try {
              map.dragging?.enable();
              map.touchZoom?.enable();
              map.doubleClickZoom?.enable();
              map.scrollWheelZoom?.enable();
              map.boxZoom?.enable();
              map.keyboard?.enable();
            } catch (e) {
              // Ignore if handlers don't exist
            }
          }
        });
        
        // Restore transform even on error
        if (canvasRef.current) {
          canvasRef.current.style.transform = `scale(${previewScale})`;
        }
        
        const button = document.activeElement as HTMLButtonElement;
        if (button) button.textContent = 'Download Story PNG';
      }
    };

    // Sync zoom and pan between two maps
    useEffect(() => {
      if (!shouldSyncMaps) return;

      let cleanupFunctions: (() => void)[] = [];
      let isCleanedUp = false;

      // Wait for both maps to be initialized
      const initSync = () => {
        if (isCleanedUp) return;
        
        if (!map1Ref.current || !map2Ref.current) {
          const timeoutId = setTimeout(initSync, 100);
          cleanupFunctions.push(() => clearTimeout(timeoutId));
          return;
        }

        const map1 = map1Ref.current;
        const map2 = map2Ref.current;

        let isSyncing = false;

        const syncMap2ToMap1 = () => {
          if (isSyncing || isCleanedUp) return;
          isSyncing = true;
          try {
            // Check if maps are still valid and have required internal state
            if (!map1 || !map2 ||
                !map1._loaded || !map2._loaded ||
                !map1._container || !map2._container ||
                !map1._mapPane || !map2._mapPane) {
              isSyncing = false;
              return;
            }

            // Check if canvas layers have valid contexts before syncing
            let hasValidCanvas = true;
            map1.eachLayer((layer: any) => {
              if (layer._canvas && !layer._ctx) {
                hasValidCanvas = false;
              }
            });
            map2.eachLayer((layer: any) => {
              if (layer._canvas && !layer._ctx) {
                hasValidCanvas = false;
              }
            });

            if (!hasValidCanvas) {
              isSyncing = false;
              return;
            }

            const center = map1.getCenter();
            const zoom = map1.getZoom();
            map2.setView(center, zoom, { animate: false });
          } catch (e) {
            // Silently ignore sync errors - maps might be in transition
          }
          setTimeout(() => { isSyncing = false; }, 50);
        };

        const syncMap1ToMap2 = () => {
          if (isSyncing || isCleanedUp) return;
          isSyncing = true;
          try {
            // Check if maps are still valid and have required internal state
            if (!map1 || !map2 ||
                !map1._loaded || !map2._loaded ||
                !map1._container || !map2._container ||
                !map1._mapPane || !map2._mapPane) {
              isSyncing = false;
              return;
            }

            // Check if canvas layers have valid contexts before syncing
            let hasValidCanvas = true;
            map1.eachLayer((layer: any) => {
              if (layer._canvas && !layer._ctx) {
                hasValidCanvas = false;
              }
            });
            map2.eachLayer((layer: any) => {
              if (layer._canvas && !layer._ctx) {
                hasValidCanvas = false;
              }
            });

            if (!hasValidCanvas) {
              isSyncing = false;
              return;
            }

            const center = map2.getCenter();
            const zoom = map2.getZoom();
            map1.setView(center, zoom, { animate: false });
          } catch (e) {
            // Silently ignore sync errors - maps might be in transition
          }
          setTimeout(() => { isSyncing = false; }, 50);
        };

        // Do initial sync from map1 to map2 - with multiple attempts to ensure it sticks
        const doInitialSync = (attempts = 0) => {
          if (attempts > 5 || isCleanedUp) return;
          
          try {
            // Check if both maps are fully loaded
            if (!map1 || !map2 || 
                !map1._loaded || !map2._loaded || 
                !map1._container || !map2._container ||
                !map1._mapPane || !map2._mapPane) {
              setTimeout(() => doInitialSync(attempts + 1), 200);
              return;
            }
            
            syncMap2ToMap1();
            // Verify sync worked (both zoom AND center), if not try again
            setTimeout(() => {
              if (isCleanedUp) return;
              
              try {
                if (!map1 || !map2 || 
                    !map1._container || !map2._container ||
                    !map1._mapPane || !map2._mapPane) return;
                
                const zoom1 = map1.getZoom();
                const zoom2 = map2.getZoom();
                const center1 = map1.getCenter();
                const center2 = map2.getCenter();
                
                const zoomMatch = zoom1 === zoom2;
                const centerMatch = Math.abs(center1.lat - center2.lat) < 0.0001 && 
                                    Math.abs(center1.lng - center2.lng) < 0.0001;
                
                if (!zoomMatch || !centerMatch) {
                  doInitialSync(attempts + 1);
                }
              } catch (e) {
                // Ignore verification errors
              }
            }, 100);
          } catch (e) {
            if (!isCleanedUp) {
              setTimeout(() => doInitialSync(attempts + 1), 200);
            }
          }
        };

        // Start initial sync after maps have settled
        setTimeout(() => {
          if (!isCleanedUp) doInitialSync();
        }, 400);

        map1.on("move", syncMap2ToMap1);
        map1.on("zoom", syncMap2ToMap1);
        map1.on("zoomend", syncMap2ToMap1);
        map1.on("moveend", syncMap2ToMap1);
        map1.on("zoomstart", syncMap2ToMap1);
        
        map2.on("move", syncMap1ToMap2);
        map2.on("zoom", syncMap1ToMap2);
        map2.on("zoomend", syncMap1ToMap2);
        map2.on("moveend", syncMap1ToMap2);
        map2.on("zoomstart", syncMap1ToMap2);

        cleanupFunctions.push(() => {
          map1.off("move", syncMap2ToMap1);
          map1.off("zoom", syncMap2ToMap1);
          map1.off("zoomend", syncMap2ToMap1);
          map1.off("moveend", syncMap2ToMap1);
          map1.off("zoomstart", syncMap2ToMap1);
          
          map2.off("move", syncMap1ToMap2);
          map2.off("zoom", syncMap1ToMap2);
          map2.off("zoomend", syncMap1ToMap2);
          map2.off("moveend", syncMap1ToMap2);
          map2.off("zoomstart", syncMap1ToMap2);
        });
      };

      initSync();

      return () => {
        isCleanedUp = true;
        cleanupFunctions.forEach(fn => fn());
      };
    }, [shouldSyncMaps, route1.coordinates, route2.coordinates]);

    return (
      <div className="flex flex-col">
        {/* Preview Canvas */}
        <div
          ref={previewContainerRef}
          className="relative w-full"
          style={{
            height: `${1900 * previewScale}px`,
            overflow: "visible",
            marginBottom: "8px"
          }}
        >
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width: "1080px",
              height: "1900px",
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
              overflow: "hidden"
            }}
          >
            {/* Background */}
            <div className="absolute left-0 right-0 bottom-0" style={{ top: '-20px', zIndex: 1 }}>
              {renderBackground()}
            </div>

            {/* TNB Label - Hidden when Different Starts is active */}
            {formData.isTnbOnly && !isDifferentStarts && (
              <div className="absolute" style={{ left: '434px', top: '1165px', zIndex: 5, width: '512px', height: '73px' }}>
                <Vector />
                <p style={{
                  position: 'absolute',
                  left: '20px',
                  right: '20px',
                  top: '4px',
                  fontFamily: 'Figtree, sans-serif',
                  fontWeight: 900,
                  fontSize: '35px',
                  lineHeight: '35px',
                  color: '#072b31',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                  margin: 0,
                  padding: 0
                }}>
                  TRANS/NONBINARY ONLY
                </p>
              </div>
            )}

            {/* Header with Times - Only for Different Starts mode */}
            {false && isDifferentStarts && hasRoute2 && (
              <div
                className="absolute"
                style={{
                  width: "831px",
                  height: "61px",
                  left: "125px",
                  top: "398px",
                  backgroundColor: "#072B31",
                  zIndex: 2,
                  borderTopLeftRadius: "31.176px",
                  borderTopRightRadius: "31.176px",
                  borderTop: "10px solid #072B31",
                  borderLeft: "10px solid #072B31",
                  borderRight: "10px solid #072B31",
                }}
              >
                {/* Route 1 Time - Right Justified with equal spacing */}
                <div
                  style={{
                    position: "absolute",
                    left: "30px",
                    width: "351px",
                    top: "50%",
                    transform: "translateY(calc(-50% - 5px))",
                    fontFamily: "Figtree, sans-serif",
                    fontSize: "35px",
                    lineHeight: "35px",
                    fontWeight: 700,
                    color: "#DCFF7C",
                    textTransform: "uppercase",
                    textAlign: "right",
                    paddingRight: "0px",
                  }}
                >
                  {formData.route1Time}
                </div>
                {/* Route 2 Time - Right Justified with equal spacing */}
                <div
                  style={{
                    position: "absolute",
                    left: "450px",
                    width: "351px",
                    top: "50%",
                    transform: "translateY(calc(-50% - 5px))",
                    fontFamily: "Figtree, sans-serif",
                    fontSize: "35px",
                    lineHeight: "35px",
                    fontWeight: 700,
                    color: "#DCFF7C",
                    textTransform: "uppercase",
                    textAlign: "right",
                    paddingRight: "0px",
                  }}
                >
                  {formData.route2Time}
                </div>
              </div>
            )}

            {/* Locations Section - Between header and map for Different Starts mode */}
            {/* DYNAMIC CALCULATION: Uses calculated locationSectionTop value */}
            {isDifferentStarts && hasRoute2 && leftRoute && rightRoute ? (
              <>
                {/* SINGLE COMBINED MAP - AT TOP */}
                <div
                  className="absolute overflow-hidden"
                  style={{
                    width: `${DIFF_STARTS_COMBINED_MAP_WIDTH}px`,
                    height: `${DIFF_STARTS_COMBINED_MAP_HEIGHT}px`,
                    left: "125px",
                    top: `${HEADER_START_TOP}px`, // No gap - starts at 398px
                    zIndex: 3,
                    borderRadius: "31.176px",
                  }}
                >
                  <CombinedRouteMap
                    coordinates1={leftRoute.coordinates}
                    coordinates2={rightRoute.coordinates}
                    className="w-full h-full"
                    theme={mapTheme}
                    startLocationType={leftRoute.startLocationType}
                    zoomToStart={false}
                  />
                </div>

                {/* GREEN FRAME FOR LEFT ROUTE (LONGER) */}
                <div
                  className="absolute"
                  style={{
                    width: `${DIFF_STARTS_RECT_WIDTH}px`,
                    height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`, // From detail map top to 53px above RUN TO
                    left: "125px",
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP}px`, // Starts where detail map starts
                    backgroundColor: "#072B31",
                    borderRadius: "31.176px",
                    border: "10px solid #072B31",
                    zIndex: 2,
                  }}
                />

                {/* GREEN FRAME FOR RIGHT ROUTE (SHORTER) */}
                <div
                  className="absolute"
                  style={{
                    width: `${DIFF_STARTS_RECT_WIDTH}px`,
                    height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`, // From detail map top to 53px above RUN TO
                    left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP}px`,
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP}px`, // Starts where detail map starts
                    backgroundColor: "#072B31",
                    borderRadius: "31.176px",
                    border: "10px solid #072B31",
                    zIndex: 2,
                  }}
                />

                {/* LEFT ROUTE DETAIL MAP (LONGER) - Zoomed to start - BELOW COMBINED */}
                <div
                  className="absolute overflow-hidden"
                  style={{
                    width: `${DIFF_STARTS_RECT_WIDTH}px`,
                    height: `${DIFF_STARTS_DETAIL_MAP_HEIGHT}px`,
                    left: "125px",
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP}px`,
                    zIndex: 3,
                    borderTopLeftRadius: "31.176px",
                    borderTopRightRadius: "31.176px",
                    border: "6px solid #072B31",
                  }}
                >
                  <RouteMap
                    coordinates={leftRoute.coordinates}
                    className="w-full h-full"
                    theme={mapTheme}
                    startLocationType={leftRoute.startLocationType}
                    zoomToStart={true}
                  />
                </div>

                {/* RIGHT ROUTE DETAIL MAP (SHORTER) - Zoomed to start - BELOW COMBINED */}
                <div
                  className="absolute overflow-hidden"
                  style={{
                    width: `${DIFF_STARTS_RECT_WIDTH}px`,
                    height: `${DIFF_STARTS_DETAIL_MAP_HEIGHT}px`,
                    left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP}px`,
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP}px`,
                    zIndex: 3,
                    borderTopLeftRadius: "31.176px",
                    borderTopRightRadius: "31.176px",
                    border: "6px solid #072B31",
                  }}
                >
                  <RouteMap
                    coordinates={rightRoute.coordinates}
                    className="w-full h-full"
                    theme={mapTheme}
                    startLocationType={rightRoute.startLocationType}
                    zoomToStart={true}
                  />
                </div>
              </>
            ) : null}

            {/* Map Container - Two routes, normal mode (no Different Starts) */}
            {hasRoute2 && !isDifferentStarts && (
              <>
                {(formData.route1BadgeView === "detail" || formData.route2BadgeView === "detail") ? (
                  /* 3-map layout when start detail is selected - Route 1 & 2 at top, Combined at bottom */
                  <>
                    {/* GREEN FRAME FOR ROUTE 1 - At top */}
                    <div
                      className="absolute"
                      style={{
                        width: `${DIFF_STARTS_RECT_WIDTH}px`,
                        height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`,
                        left: "125px",
                        top: `${HEADER_START_TOP}px`,
                        backgroundColor: "#072B31",
                        borderRadius: "31.176px",
                        border: "10px solid #072B31",
                        zIndex: 2,
                      }}
                    />

                    {/* GREEN FRAME FOR ROUTE 2 - At top */}
                    <div
                      className="absolute"
                      style={{
                        width: `${DIFF_STARTS_RECT_WIDTH}px`,
                        height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`,
                        left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP}px`,
                        top: `${HEADER_START_TOP}px`,
                        backgroundColor: "#072B31",
                        borderRadius: "31.176px",
                        border: "10px solid #072B31",
                        zIndex: 2,
                      }}
                    />

                    {/* ROUTE 1 FULL MAP - At top - No border */}
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        width: `${DIFF_STARTS_RECT_WIDTH}px`,
                        height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`,
                        left: "125px",
                        top: `${HEADER_START_TOP}px`,
                        zIndex: 3,
                        borderRadius: "31.176px",
                      }}
                    >
                      <RouteMap
                        coordinates={route1.coordinates}
                        className="w-full h-full"
                        theme={mapTheme}
                        startLocationType={formData.startLocationType}
                        zoomToStart={false}
                      />
                    </div>

                    {/* ROUTE 2 FULL MAP - At top - No border */}
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        width: `${DIFF_STARTS_RECT_WIDTH}px`,
                        height: `${runToTop - 53 - (HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP)}px`,
                        left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP}px`,
                        top: `${HEADER_START_TOP}px`,
                        zIndex: 3,
                        borderRadius: "31.176px",
                      }}
                    >
                      <RouteMap
                        coordinates={route2.coordinates}
                        className="w-full h-full"
                        theme={mapTheme}
                        startLocationType={formData.startLocationType}
                        zoomToStart={false}
                      />
                    </div>

                    {/* ROUTE 1 DISTANCE BADGE - Top Left of Route 1 Map */}
                    <div style={{
                      position: 'absolute',
                      left: `${125 + 15}px`,
                      top: `${HEADER_START_TOP + 15}px`,
                      zIndex: 5
                    }}>
                      <div style={{
                        position: 'relative',
                        width: '190px',
                        height: '61px',
                        backgroundColor: 'rgba(220, 255, 124, 0.9)',
                        borderRadius: '30.5px',
                        display: 'block'
                      }}>
                        <span style={{
                          position: 'absolute',
                          left: '0',
                          right: '0',
                          top: '-8px',
                          fontFamily: 'Figtree, sans-serif',
                          fontSize: '35px',
                          lineHeight: '35px',
                          fontWeight: 700,
                          color: '#072B31',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                          margin: 0,
                          padding: 0
                        }}>
                          {`${(route1.distance || 0).toFixed(1)} MILES`}
                        </span>
                      </div>
                    </div>

                    {/* ROUTE 2 DISTANCE BADGE - Top Left of Route 2 Map */}
                    <div style={{
                      position: 'absolute',
                      left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP + 15}px`,
                      top: `${HEADER_START_TOP + 15}px`,
                      zIndex: 5
                    }}>
                      <div style={{
                        position: 'relative',
                        width: '190px',
                        height: '61px',
                        backgroundColor: 'rgba(220, 255, 124, 0.9)',
                        borderRadius: '30.5px',
                        display: 'block'
                      }}>
                        <span style={{
                          position: 'absolute',
                          left: '0',
                          right: '0',
                          top: '-8px',
                          fontFamily: 'Figtree, sans-serif',
                          fontSize: '35px',
                          lineHeight: '35px',
                          fontWeight: 700,
                          color: '#072B31',
                          whiteSpace: 'nowrap',
                          textAlign: 'center',
                          margin: 0,
                          padding: 0
                        }}>
                          {`${(route2.distance || 0).toFixed(1)} MILES`}
                        </span>
                      </div>
                    </div>

                    {/* COMBINED MAP at bottom showing both routes - 10px border */}
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        width: `${DIFF_STARTS_COMBINED_MAP_WIDTH}px`,
                        height: `${DIFF_STARTS_COMBINED_MAP_HEIGHT}px`,
                        left: "125px",
                        top: `${runToTop - 53 - DIFF_STARTS_COMBINED_MAP_HEIGHT}px`,
                        zIndex: 3,
                        borderRadius: "31.176px",
                        border: "10px solid #072B31",
                      }}
                    >
                      <CombinedRouteMap
                        coordinates1={route1.coordinates}
                        coordinates2={route2.coordinates}
                        className="w-full h-full"
                        theme={mapTheme}
                        startLocationType={formData.startLocationType}
                        zoomToStart={true}
                        distance1={route1.distance}
                        distance2={route2.distance}
                        reduceOpacityOfLonger={false}
                      />
                    </div>

                  </>
                ) : (
                  /* Original side-by-side view when start detail is NOT selected */
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      width: "831px",
                      height: mapHeight,
                      left: "125px",
                      top: mapStartTop,
                      zIndex: 1,
                      borderTop: "10px solid #072B31",
                      borderLeft: "10px solid #072B31",
                      borderRight: "10px solid #072B31",
                      borderBottom: "10px solid #072B31",
                      borderTopLeftRadius: "31.176px",
                      borderTopRightRadius: "31.176px",
                      borderBottomLeftRadius: "31.176px",
                      borderBottomRightRadius: "31.176px",
                    }}
                  >
                    <div className="relative w-full h-full">
                      <div className="flex h-full relative">
                        <RouteMap
                          coordinates={route1.coordinates}
                          className="w-1/2 h-full"
                          mapRef={map1Ref}
                          theme={mapTheme}
                          startLocationType={formData.startLocationType}
                          zoomToStart={false}
                        />
                        <RouteMap
                          coordinates={route2.coordinates}
                          className="w-1/2 h-full"
                          mapRef={map2Ref}
                          theme={mapTheme}
                          startLocationType={formData.startLocationType}
                          zoomToStart={false}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Map Container - Single route only */}
            {!hasRoute2 && (
              <div
                className="absolute"
                style={{
                  width: "831px",
                  height: mapHeight,
                  left: "125px",
                  top: mapStartTop,
                  zIndex: 1,
                  borderTop: "10px solid #072B31",
                  borderLeft: "10px solid #072B31",
                  borderRight: "10px solid #072B31",
                  borderBottom: "10px solid #072B31",
                  borderTopLeftRadius: "31.176px",
                  borderTopRightRadius: "31.176px",
                  borderBottomLeftRadius: "31.176px",
                  borderBottomRightRadius: "31.176px",
                  overflow: "visible",
                }}
              >
                <div style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: "21.176px" }}>
                  <RouteMap 
                    coordinates={route1.coordinates} 
                    className="w-full h-full"
                    theme={mapTheme}
                    startLocationType={formData.startLocationType}
                    zoomToStart={false}
                    hasCircularInset={formData.route1BadgeView === "detail"}
                  />
                </div>
                
                {/* Rectangular inset map showing zoomed start location */}
                {/* Rectangular inset map showing zoomed start location */}
                {formData.route1BadgeView === "detail" && (
                  <>
                    {/* Rectangular inset with 6px green outline */}
                    <div
                      style={{
                        position: "absolute",
                        width: "317.414px",
                        height: "304.809px",
                        left: "15px",
                        bottom: "380px",
                        borderRadius: "0",
                        zIndex: 1000,
                        overflow: "visible",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "15px",
                          border: "6px solid #072B31",
                          padding: "0",
                          boxSizing: "border-box",
                          overflow: "hidden",
                          backgroundColor: "#072B31",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "9px",
                            overflow: "hidden",
                            backgroundColor: "#072B31",
                          }}
                        >
                          <RouteMap 
                            coordinates={route1.coordinates} 
                            className="w-full h-full"
                            theme={mapTheme}
                            startLocationType={formData.startLocationType}
                            zoomToStart={true}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Vertical divider stroke - OUTSIDE map container to avoid Leaflet z-index conflicts */}
            {/* Only show divider when NOT using start detail view (side-by-side maps only) */}
            {hasRoute2 && !isDifferentStarts && !(formData.route1BadgeView === "detail" || formData.route2BadgeView === "detail") && (
              <div
                className="absolute"
                style={{
                  width: "10px",
                  height: verticalDividerHeight,
                  left: "540px",
                  top: mapStartTop,
                  backgroundColor: "#072B31",
                  zIndex: 4,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Text Overlays */}
            {/* Day & Time - Show only day when Different Starts is active */}
            {(formData.day || formData.time) && (
              <div
                className="absolute text-center uppercase"
                style={{
                  left: "50%",
                  top: "267px",
                  transform: "translateX(-50%)",
                  fontSize: "78.54px",
                  fontFamily: "Figtree, sans-serif",
                  fontWeight: 800,
                  color: "#072B31",
                  lineHeight: 1,
                  zIndex: 1,
                  whiteSpace: "nowrap",
                  maxWidth: "831px",
                }}
              >
                {isDifferentStarts && hasRoute2
                  ? formData.day
                  : [formData.day, formData.time].filter(Boolean).join(" ")}
              </div>
            )}

            {/* Locations - Show "MEET @" for single route or two routes without Different Starts */}
            {route1.gpxFile && (
              <div
                ref={runToTextRef}
                className="absolute uppercase"
                style={{
                  left: "125px",
                  top: `${runToTop}px`,
                  fontSize: "48.54px",
                  fontFamily: "Figtree, sans-serif",
                  color: "#072B31",
                  lineHeight: "50.3px",
                  zIndex: isDifferentStarts && hasRoute2 ? 10 : 1,
                  maxWidth: "831px",
                }}
              >
                {/* MEET @ line - Show for single route OR when NOT Different Starts mode */}
                {formData.startLocation && !(isDifferentStarts && hasRoute2) && (
                  <div style={{ fontWeight: 800 }}>
                    MEET @ {formData.startLocation}
                  </div>
                )}
                {/* RUN TO line - Always visible when formData.endLocation exists */}
                {formData.endLocation && (
                  <div style={{ fontWeight: isDifferentStarts && hasRoute2 ? 700 : 500, marginTop: formData.startLocation && !(isDifferentStarts && hasRoute2) ? "8px" : "0" }}>
                    RUN TO {formData.endLocation}
                  </div>
                )}
              </div>
            )}

            {/* Distance Badges - Show for single route OR when NOT Different Starts mode AND NOT start detail view */}
            {!(isDifferentStarts && hasRoute2) && route1.gpxFile && !(hasRoute2 && (formData.route1BadgeView === "detail" || formData.route2BadgeView === "detail")) && (
              <div style={{
                position: 'absolute',
                left: hasRoute2 ? '145px' : '145px',
                top: '432px',
                zIndex: 5
              }}>
                <div style={{
                  position: 'relative',
                  width: '190px',
                  height: '61px',
                  backgroundColor: '#DCFF7C',
                  borderRadius: '30.5px',
                  display: 'block'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    top: '50%',
                    transform: 'translateY(calc(-50% - 15px))',
                    fontFamily: 'Figtree, sans-serif',
                    fontSize: '35px',
                    lineHeight: '35px',
                    fontWeight: 700,
                    color: '#072B31',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    margin: 0,
                    padding: 0
                  }}>
                    {`${(route1.distance || 0).toFixed(1)} MILES`}
                  </span>
                </div>
              </div>
            )}
            {!isDifferentStarts && hasRoute2 && route2.gpxFile && route2.coordinates.length > 0 && !(formData.route1BadgeView === "detail" || formData.route2BadgeView === "detail") && (
              <div style={{ 
                position: 'absolute', 
                left: '560px',
                top: '432px',
                zIndex: 5
              }}>
                <div style={{
                  position: 'relative',
                  width: '190px',
                  height: '61px',
                  backgroundColor: 'rgba(220, 255, 124, 0.9)',
                  borderRadius: '30.5px',
                  display: 'block',
                  // Add border only when route2 is "distance" and route1 is "detail"
                  border: formData.route2BadgeView === "distance" && formData.route1BadgeView === "detail" ? '3px solid #072B31' : 'none'
                }}>
                  <span style={{
                    position: 'absolute',
                    left: '0',
                    right: '0',
                    top: '50%',
                    transform: 'translateY(calc(-50% - 15px))',
                    fontFamily: 'Figtree, sans-serif',
                    fontSize: '35px',
                    lineHeight: '35px',
                    fontWeight: 700,
                    color: '#072B31',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    margin: 0,
                    padding: 0
                  }}>
                    {formData.route2BadgeView === "detail" 
                      ? "START"
                      : `${(route2.distance || 0).toFixed(1)} MILES`}
                  </span>
                </div>
              </div>
            )}

            {/* Distance Badges - Show at bottom right corner of detail maps when Different Starts is active */}
            {isDifferentStarts && hasRoute2 && leftRoute && rightRoute && (
              <>
                {/* Left Route (Longer) Distance Badge - Top Left of Detail Map */}
                <div style={{ 
                  position: 'absolute', 
                  left: `${125 + 15}px`, // 15px from left edge of detail map
                  top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + 15}px`,
                  zIndex: 5
                }}>
                  <div style={{
                    position: 'relative',
                    width: '190px',
                    height: '61px',
                    backgroundColor: 'rgba(220, 255, 124, 0.9)', // Yellow background
                    borderRadius: '30.5px',
                    display: 'block'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: '-8px',
                      fontFamily: 'Figtree, sans-serif',
                      fontSize: '35px',
                      lineHeight: '35px',
                      fontWeight: 700,
                      color: '#072B31', // Dark green text
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      margin: 0,
                      padding: 0
                    }}>
                      {`${(leftRoute.distance || 0).toFixed(1)} MILES`}
                    </span>
                  </div>
                </div>

                {/* Right Route (Shorter) Distance Badge - Top Left of Detail Map */}
                <div style={{ 
                  position: 'absolute', 
                  left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP + 15}px`, // 15px from left edge of detail map
                  top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + 15}px`,
                  zIndex: 5
                }}>
                  <div style={{
                    position: 'relative',
                    width: '190px',
                    height: '61px',
                    backgroundColor: 'rgba(220, 255, 124, 0.9)', // Yellow background
                    borderRadius: '30.5px',
                    display: 'block'
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: '-8px',
                      fontFamily: 'Figtree, sans-serif',
                      fontSize: '35px',
                      lineHeight: '35px',
                      fontWeight: 700,
                      color: '#072B31', // Dark green text
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      margin: 0,
                      padding: 0
                    }}>
                      {`${(rightRoute.distance || 0).toFixed(1)} MILES`}
                    </span>
                  </div>
                </div>

                {/* Left Route (Longer) Time Badge - Bottom Right of Detail Map */}
                <div style={{ 
                  position: 'absolute', 
                  left: `${125 + DIFF_STARTS_RECT_WIDTH - 190 - 15}px`, // 15px from right edge of detail map
                  top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + DIFF_STARTS_DETAIL_MAP_HEIGHT - 61 - 15}px`,
                  zIndex: 5
                }}>
                  <div style={{
                    position: 'relative',
                    width: '190px',
                    height: '61px',
                    backgroundColor: 'rgba(220, 255, 124, 0.9)', // Yellow background
                    borderRadius: '30.5px',
                    display: 'block',
                    border: '3px solid #072B31' // 3px dark green outline
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: '-8px',
                      fontFamily: 'Figtree, sans-serif',
                      fontSize: '35px',
                      lineHeight: '35px',
                      fontWeight: 700,
                      color: '#072B31', // Dark green text
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      margin: 0,
                      padding: 0
                    }}>
                      {leftRoute.time}
                    </span>
                  </div>
                </div>

                {/* Right Route (Shorter) Time Badge - Bottom Right of Detail Map */}
                <div style={{ 
                  position: 'absolute', 
                  left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP + DIFF_STARTS_RECT_WIDTH - 190 - 15}px`, // 15px from right edge of detail map
                  top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + DIFF_STARTS_DETAIL_MAP_HEIGHT - 61 - 15}px`,
                  zIndex: 5
                }}>
                  <div style={{
                    position: 'relative',
                    width: '190px',
                    height: '61px',
                    backgroundColor: 'rgba(220, 255, 124, 0.9)', // Yellow background
                    borderRadius: '30.5px',
                    display: 'block',
                    border: '3px solid #072B31' // 3px dark green outline
                  }}>
                    <span style={{
                      position: 'absolute',
                      left: '0',
                      right: '0',
                      top: '-8px',
                      fontFamily: 'Figtree, sans-serif',
                      fontSize: '35px',
                      lineHeight: '35px',
                      fontWeight: 700,
                      color: '#072B31', // Dark green text
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      margin: 0,
                      padding: 0
                    }}>
                      {rightRoute.time}
                    </span>
                  </div>
                </div>

                {/* Left Route (Longer) Start Location Text - Below Detail Map */}
                <div
                  style={{
                    position: "absolute",
                    left: `${125 + 10}px`, // 10px padding from left edge of frame
                    width: `${DIFF_STARTS_RECT_WIDTH - 20}px`, // Reduced width to account for 10px padding on each side
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + DIFF_STARTS_DETAIL_MAP_HEIGHT + 15}px`,
                    fontFamily: "Figtree, sans-serif",
                    fontSize: "35px",
                    lineHeight: "40px",
                    fontWeight: 500,
                    color: "#DCFF7C", // Yellow color
                    textTransform: "uppercase",
                    textAlign: "left",
                    zIndex: 4,
                  }}
                >
                  {leftRoute.startLocation}
                </div>

                {/* Right Route (Shorter) Start Location Text - Below Detail Map */}
                <div
                  style={{
                    position: "absolute",
                    left: `${125 + DIFF_STARTS_RECT_WIDTH + DIFF_STARTS_GAP + 10}px`, // 10px padding from left edge of frame
                    width: `${DIFF_STARTS_RECT_WIDTH - 20}px`, // Reduced width to account for 10px padding on each side
                    top: `${HEADER_START_TOP + DIFF_STARTS_COMBINED_MAP_HEIGHT + DIFF_STARTS_MAP_GAP + DIFF_STARTS_DETAIL_MAP_HEIGHT + 15}px`,
                    fontFamily: "Figtree, sans-serif",
                    fontSize: "35px",
                    lineHeight: "40px",
                    fontWeight: 500,
                    color: "#DCFF7C", // Yellow color
                    textTransform: "uppercase",
                    textAlign: "left",
                    zIndex: 4,
                  }}
                >
                  {rightRoute.startLocation}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section Header - Only show when route is uploaded */}
        {route1.gpxFile && (
          <>
            <div style={{
              paddingLeft: '8px',
              paddingRight: '8px',
              paddingTop: '8px',
              paddingBottom: '4px'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#DCFF7C',
                fontFamily: 'Figtree, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                textAlign: 'left'
              }}>
                ZOOM TO ADJUST MAPS
              </h3>
            </div>

            {/* Note above download button */}
            <p style={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: '#DCFF7C',
              opacity: 0.7,
              fontFamily: 'Figtree, sans-serif',
              marginTop: '0px',
              marginBottom: '8px',
              textAlign: 'left',
              maxWidth: '100%',
              paddingLeft: '8px',
              paddingRight: '8px'
            }}>
              *Text appears shifted upwards on screen, but will download correctly
            </p>
          </>
        )}

        {/* Download Button - Full width */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingBottom: '12px'
        }}>
          <button
            onClick={downloadImage}
            className="py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 font-semibold whitespace-nowrap"
            style={{
              backgroundColor: '#FFF8E7',
              color: '#072B31',
              border: '2px solid #FFF8E7',
              fontFamily: 'Figtree, sans-serif',
              fontWeight: 800,
              width: '100%',
              minHeight: '48px',
              fontSize: '14px'
            }}
          >
            <Download className="w-5 h-5 flex-shrink-0" />
            <span>DOWNLOAD STORY PNG</span>
          </button>
        </div>
      </div>
    );
  }
);

StoryCanvas.displayName = "StoryCanvas";