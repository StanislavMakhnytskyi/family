"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MARKER_CLASS =
  "size-[22px] rounded-full bg-terracotta border-[3px] border-surface shadow-fab";

function MapCanvas({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
    });
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );

    const markerEl = document.createElement("div");
    markerEl.className = MARKER_CLASS;
    new Marker({ element: markerEl }).setLngLat([longitude, latitude]).addTo(map);

    return () => map.remove();
  }, [latitude, longitude]);

  return <div ref={containerRef} className="absolute inset-0" />;
}

export function MapModal({
  open,
  onOpenChange,
  address,
  coordsLabel,
  latitude,
  longitude,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  coordsLabel: string;
  latitude: number;
  longitude: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" showCloseButton>
        <DialogHeader>
          <div>
            <DialogTitle>{address}</DialogTitle>
            <DialogDescription>{coordsLabel}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="relative h-[400px] max-h-[60vh] avatar-placeholder">
          {open && <MapCanvas latitude={latitude} longitude={longitude} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
