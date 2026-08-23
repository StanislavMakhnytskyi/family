"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { clampZoom } from "@/lib/utils";
import type { Media } from "@/lib/schemas";

type GalleryItem = Pick<Media, "id" | "url" | "caption">;

type Labels = {
  close: string;
  previous: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  counter: string; // contains __CURRENT__ and __TOTAL__
};

const ZOOM_STEP = 1.5;
const LIGHTBOX_ZOOM_MIN = 1;
const LIGHTBOX_ZOOM_MAX = 5;

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function GalleryLightbox({
  items,
  labels,
}: {
  items: GalleryItem[];
  labels: Labels;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const isOpen = openIndex !== null;

  const resetTransform = useCallback(() => setTransform({ x: 0, y: 0, scale: 1 }), []);

  const open = useCallback((index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setOpenIndex(index);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const close = useCallback(() => {
    setOpenIndex(null);
    triggerRef.current?.focus();
  }, []);

  const go = useCallback(
    (delta: number) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + delta + items.length) % items.length;
      });
      resetTransform();
    },
    [items.length, resetTransform],
  );

  const zoomBy = useCallback((factor: number) => {
    setTransform((t) => {
      const scale = clampZoom(t.scale * factor, LIGHTBOX_ZOOM_MIN, LIGHTBOX_ZOOM_MAX);
      // Zooming back down to 1x always re-centers -- otherwise a pan applied
      // while zoomed in would leave the image off-center once it no longer
      // fills more space than the viewport.
      if (scale === LIGHTBOX_ZOOM_MIN) return { x: 0, y: 0, scale };
      return { ...t, scale };
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
      else if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
      else if (event.key === "-") zoomBy(1 / ZOOM_STEP);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close, go, zoomBy]);

  function handlePointerDown(event: React.PointerEvent) {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Harmless -- we still track the pointer manually below.
    }
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length === 2) {
      dragRef.current = null;
      pinchRef.current = {
        startDistance: distanceBetween(pointers[0], pointers[1]),
        startScale: transform.scale,
      };
    } else if (pointers.length === 1 && transform.scale > 1) {
      dragRef.current = {
        startX: pointers[0].x,
        startY: pointers[0].y,
        origX: transform.x,
        origY: transform.y,
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...activePointersRef.current.values()];

    if (pointers.length === 2 && pinchRef.current) {
      const factor = distanceBetween(pointers[0], pointers[1]) / pinchRef.current.startDistance;
      const scale = clampZoom(
        pinchRef.current.startScale * factor,
        LIGHTBOX_ZOOM_MIN,
        LIGHTBOX_ZOOM_MAX,
      );
      setTransform((t) => ({ ...t, scale }));
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    setTransform((t) => ({
      ...t,
      x: drag.origX + (event.clientX - drag.startX),
      y: drag.origY + (event.clientY - drag.startY),
    }));
  }

  function handlePointerUp(event: React.PointerEvent) {
    activePointersRef.current.delete(event.pointerId);
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length < 2) pinchRef.current = null;
    if (pointers.length === 1 && transform.scale > 1) {
      dragRef.current = { startX: pointers[0].x, startY: pointers[0].y, origX: transform.x, origY: transform.y };
    } else if (pointers.length === 0) {
      dragRef.current = null;
    }
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1);
  }

  function handleDoubleClick() {
    zoomBy(transform.scale > 1 ? 1 / transform.scale : ZOOM_STEP * ZOOM_STEP);
  }

  const current = openIndex !== null ? items[openIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item, index) => (
          <figure key={item.id} className="m-0">
            <button
              type="button"
              onClick={(event) => open(index, event.currentTarget)}
              className="block w-full cursor-zoom-in overflow-hidden rounded-md border border-border-strong shadow-gallery transition-[transform,box-shadow] duration-200 hover:-translate-y-[2px] hover:shadow-card-hover"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.url}
                  alt={item.caption ?? ""}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </button>
            {item.caption && (
              <figcaption className="mt-2 text-[13px] leading-snug text-muted">
                {item.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {isOpen && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? labels.counter}
          className="fixed inset-0 z-[100] flex flex-col bg-ink/95 animate-fade-in"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="rounded-xs bg-surface/10 px-2.5 py-1 font-mono text-xs text-surface/80 tabular-nums">
              {labels.counter
                .replace("__CURRENT__", String(openIndex! + 1))
                .replace("__TOTAL__", String(items.length))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              autoFocus
              aria-label={labels.close}
              onClick={close}
            >
              <X className="size-5" />
            </Button>
          </div>

          <div
            ref={viewportRef}
            className="relative min-h-0 flex-1 touch-none overflow-hidden select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            onDoubleClick={handleDoubleClick}
          >
            <div
              className="relative size-full"
              style={{
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                cursor: transform.scale > 1 ? "grab" : "zoom-in",
              }}
            >
              <Image
                src={current.url}
                alt={current.caption ?? ""}
                fill
                unoptimized
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {items.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={labels.previous}
                  className="absolute top-1/2 left-3 -translate-y-1/2"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={labels.next}
                  className="absolute top-1/2 right-3 -translate-y-1/2"
                  onClick={() => go(1)}
                >
                  <ChevronRight className="size-5" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 p-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={labels.zoomOut}
              disabled={transform.scale <= LIGHTBOX_ZOOM_MIN}
              onClick={() => zoomBy(1 / ZOOM_STEP)}
            >
              <Minus className="size-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={labels.zoomIn}
              disabled={transform.scale >= LIGHTBOX_ZOOM_MAX}
              onClick={() => zoomBy(ZOOM_STEP)}
            >
              <Plus className="size-5" />
            </Button>
            {current.caption && (
              <p className="m-0 ml-2 max-w-[60vw] truncate text-[13px] text-surface/80">
                {current.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
