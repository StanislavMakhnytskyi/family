"use client";

import { useState } from "react";

import { MapModal } from "@/components/client/MapModal";
import { Button } from "@/components/ui/button";

export function MapModalTrigger({
  label,
  address,
  coordsLabel,
  latitude,
  longitude,
}: {
  label: string;
  address: string;
  coordsLabel: string;
  latitude: number;
  longitude: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <MapModal
        open={open}
        onOpenChange={setOpen}
        address={address}
        coordsLabel={coordsLabel}
        latitude={latitude}
        longitude={longitude}
      />
    </>
  );
}
