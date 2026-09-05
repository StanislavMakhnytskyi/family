"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import type { Person, Relationship } from "@/lib/schemas";
import { computeFamilyTreeLayout } from "@/lib/family-tree-layout";
import { Button } from "@/components/ui/button";
import { clampZoom, initials, lifespan } from "@/lib/utils";

const CARD_WIDTH = 156;
const CARD_HEIGHT = 108;
const COLUMN_WIDTH = CARD_WIDTH + 22;
const ROW_HEIGHT = CARD_HEIGHT + 64;
const ZOOM_STEP = 1.2;

const CARD_CLASS =
  "absolute flex h-[108px] w-[156px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-surface p-2.5 shadow-tree-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-border-hover hover:shadow-card-hover animate-pop-in-tree cursor-pointer select-none";
const AVATAR_CLASS =
  "avatar-placeholder flex size-[42px] shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-[11px] text-avatar-text";

type Positioned = { id: string; x: number; y: number };

type ParentGroup = { parentIds: string[]; childId: string };

function buildParentGroups(relationships: Relationship[]): ParentGroup[] {
  const childToParents = new Map<string, string[]>();
  for (const rel of relationships) {
    if (rel.type !== "parent-child") continue;
    const list = childToParents.get(rel.person2Id) ?? [];
    list.push(rel.person1Id);
    childToParents.set(rel.person2Id, list);
  }
  return [...childToParents.entries()].map(([childId, parentIds]) => ({
    childId,
    parentIds,
  }));
}

export function TreeClient({
  people,
  relationships,
  hint,
  lifespanLabels,
}: {
  people: Person[];
  relationships: Relationship[];
  hint: string;
  lifespanLabels: { born: string; died: string };
}) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    startDistance: number;
    startScale: number;
    anchorWorldX: number;
    anchorWorldY: number;
  } | null>(null);

  const layout = useMemo(
    () => computeFamilyTreeLayout(people, relationships),
    [people, relationships],
  );

  const { positioned, totalWidth, totalHeight, parentGroups } = useMemo(() => {
    const nodes = [...layout.nodes.values()];
    if (nodes.length === 0) {
      return { positioned: [] as Positioned[], totalWidth: 0, totalHeight: 0, parentGroups: [] };
    }
    const minColumn = Math.min(...nodes.map((n) => n.column));
    const minGeneration = Math.min(...nodes.map((n) => n.generation));
    const maxColumn = Math.max(...nodes.map((n) => n.column));
    const maxGeneration = Math.max(...nodes.map((n) => n.generation));

    const positioned: Positioned[] = nodes.map((n) => ({
      id: n.id,
      x: (n.column - minColumn) * COLUMN_WIDTH,
      y: (n.generation - minGeneration) * ROW_HEIGHT,
    }));

    return {
      positioned,
      totalWidth: (maxColumn - minColumn) * COLUMN_WIDTH + CARD_WIDTH,
      totalHeight: (maxGeneration - minGeneration) * ROW_HEIGHT + CARD_HEIGHT,
      parentGroups: buildParentGroups(relationships),
    };
  }, [layout, relationships]);

  const positionOf = useMemo(() => {
    const map = new Map<string, Positioned>();
    for (const p of positioned) map.set(p.id, p);
    return map;
  }, [positioned]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  function applyTransform(withTransition: boolean) {
    const el = worldRef.current;
    if (!el) return;
    const { x, y, scale } = transformRef.current;
    if (withTransition) {
      // Setting `transition` and `transform` in the same synchronous pass
      // gets coalesced into one instant style update (no animation) —
      // force a reflow in between so the browser actually animates it.
      el.style.transition = "none";
      void el.offsetHeight;
      el.style.transition = "transform 300ms ease";
    } else {
      el.style.transition = "none";
    }
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function fitToScreen(withTransition: boolean) {
    const viewport = viewportRef.current;
    if (!viewport || totalWidth === 0 || totalHeight === 0) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const scale = clampZoom(
      Math.min(vw / totalWidth, vh / totalHeight) * 0.9,
    );
    transformRef.current = {
      x: (vw - totalWidth * scale) / 2,
      y: (vh - totalHeight * scale) / 2,
      scale,
    };
    applyTransform(withTransition);
  }

  function zoomAt(factor: number, clientX: number, clientY: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x, y, scale } = transformRef.current;
    const newScale = clampZoom(scale * factor);
    const worldX = (px - x) / scale;
    const worldY = (py - y) / scale;
    transformRef.current = {
      x: px - worldX * newScale,
      y: py - worldY * newScale,
      scale: newScale,
    };
    applyTransform(false);
  }

  function zoomFromCenter(factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  useEffect(() => {
    fitToScreen(false);

    function handleResize() {
      fitToScreen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWidth, totalHeight]);

  function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function startDragFrom(point: { x: number; y: number }) {
    dragRef.current = {
      startX: point.x,
      startY: point.y,
      origX: transformRef.current.x,
      origY: transformRef.current.y,
      moved: false,
    };
  }

  function handlePointerDown(event: React.PointerEvent) {
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Capture can fail (e.g. pointer already released) — harmless, we
      // still track the pointer manually via activePointersRef.
    }

    const pointers = [...activePointersRef.current.values()];
    if (pointers.length === 2) {
      dragRef.current = null;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const mid = midpoint(pointers[0], pointers[1]);
      const { x, y, scale } = transformRef.current;
      pinchRef.current = {
        startDistance: distanceBetween(pointers[0], pointers[1]),
        startScale: scale,
        anchorWorldX: (mid.x - rect.left - x) / scale,
        anchorWorldY: (mid.y - rect.top - y) / scale,
      };
    } else if (pointers.length === 1) {
      startDragFrom(pointers[0]);
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!activePointersRef.current.has(event.pointerId)) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pointers = [...activePointersRef.current.values()];

    if (pointers.length === 2 && pinchRef.current) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const mid = midpoint(pointers[0], pointers[1]);
      const distance = distanceBetween(pointers[0], pointers[1]);
      const factor = distance / pinchRef.current.startDistance;
      const newScale = clampZoom(pinchRef.current.startScale * factor);
      transformRef.current = {
        x: mid.x - rect.left - pinchRef.current.anchorWorldX * newScale,
        y: mid.y - rect.top - pinchRef.current.anchorWorldY * newScale,
        scale: newScale,
      };
      applyTransform(false);
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    transformRef.current.x = drag.origX + dx;
    transformRef.current.y = drag.origY + dy;
    applyTransform(false);
  }

  function handlePointerUp(event: React.PointerEvent) {
    activePointersRef.current.delete(event.pointerId);
    const pointers = [...activePointersRef.current.values()];

    if (pointers.length < 2) pinchRef.current = null;
    if (pointers.length === 1) {
      // One finger lifted mid-pinch — resume panning with the remaining
      // finger from where it currently is, instead of jumping.
      startDragFrom(pointers[0]);
    } else if (pointers.length === 0) {
      dragRef.current = null;
    }
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
    zoomAt(factor, event.clientX, event.clientY);
  }

  function handleCardClick(id: string) {
    if (dragRef.current?.moved) return;
    router.push(`/person/${id}`);
  }

  return (
    <div
      className="relative h-[calc(100dvh-64px)] flex-1 overflow-hidden"
      data-testid="tree-viewport"
    >
      <div
        ref={viewportRef}
        data-testid="tree-canvas"
        className="absolute inset-0 h-full w-full cursor-grab touch-none overscroll-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          ref={worldRef}
          data-testid="tree-world"
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: totalWidth, height: totalHeight }}
        >
          <svg
            className="pointer-events-none absolute top-0 left-0"
            width={totalWidth}
            height={totalHeight}
          >
            {parentGroups.map((group) => {
              const childPos = positionOf.get(group.childId);
              const parentPositions = group.parentIds
                .map((id) => positionOf.get(id))
                .filter((p): p is Positioned => p !== undefined);
              if (!childPos || parentPositions.length === 0) return null;

              const anchorX =
                parentPositions.reduce((sum, p) => sum + p.x + CARD_WIDTH / 2, 0) /
                parentPositions.length;
              const parentBottomY = parentPositions[0].y + CARD_HEIGHT;
              const childTopY = childPos.y;
              const childCenterX = childPos.x + CARD_WIDTH / 2;
              const busY = parentBottomY + (childTopY - parentBottomY) / 2;

              return (
                <path
                  key={`${group.parentIds.join("-")}-${group.childId}`}
                  data-testid="tree-connector"
                  className="tree-connector"
                  d={`M ${anchorX} ${parentBottomY} V ${busY} H ${childCenterX} V ${childTopY}`}
                  fill="none"
                  strokeWidth={2}
                />
              );
            })}
            {relationships
              .filter((rel) => rel.type === "spouse")
              .map((rel) => {
                const a = positionOf.get(rel.person1Id);
                const b = positionOf.get(rel.person2Id);
                if (!a || !b || a.y !== b.y) return null;
                const [left, right] = a.x < b.x ? [a, b] : [b, a];
                const y = a.y + CARD_HEIGHT / 2;
                return (
                  <path
                    key={rel.id}
                    data-testid="tree-connector"
                    className="tree-connector"
                    d={`M ${left.x + CARD_WIDTH} ${y} H ${right.x}`}
                    fill="none"
                    strokeWidth={2}
                  />
                );
              })}
            {relationships
              .filter((rel) => rel.type === "sibling")
              .map((rel) => {
                const a = positionOf.get(rel.person1Id);
                const b = positionOf.get(rel.person2Id);
                if (!a || !b || a.y !== b.y) return null;
                const [left, right] = a.x < b.x ? [a, b] : [b, a];
                // A bracket over the pair -- "|---|" -- with no line
                // extending further up to a parent, since a sibling
                // relationship exists specifically for when there isn't
                // one on record. Deliberately distinct from the spouse
                // connector (a plain line through the cards' vertical
                // center) so the two read as different kinds of link.
                const busY = a.y - 16;
                const leftX = left.x + CARD_WIDTH / 2;
                const rightX = right.x + CARD_WIDTH / 2;
                return (
                  <path
                    key={rel.id}
                    data-testid="tree-connector"
                    className="tree-connector tree-connector-sibling"
                    d={`M ${leftX} ${left.y} V ${busY} H ${rightX} V ${right.y}`}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                );
              })}
          </svg>

          {positioned.map(({ id, x, y }) => {
            const person = personById.get(id);
            if (!person) return null;
            return (
              <div
                key={id}
                data-testid="tree-card"
                className={CARD_CLASS}
                style={{ left: x, top: y }}
                onClick={() => handleCardClick(id)}
              >
                {person.avatar ? (
                  <div className="relative size-[42px] shrink-0 overflow-hidden rounded-full border border-border-strong">
                    <Image
                      src={person.avatar.small}
                      alt=""
                      fill
                      unoptimized
                      sizes="42px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className={AVATAR_CLASS}>
                    {initials(person.firstName, person.lastName)}
                  </div>
                )}
                <div className="text-center leading-tight">
                  <div className="text-[12.5px] font-bold text-ink">
                    {person.firstName} {person.lastName}
                  </div>
                  <div className="mt-[2px] text-[11px] tabular-nums text-muted-2">
                    {lifespan(person.birthDate, person.deathDate, lifespanLabels)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute right-4 bottom-5 z-20 flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Збільшити"
          onClick={() => zoomFromCenter(ZOOM_STEP)}
        >
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Зменшити"
          onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
        >
          −
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Скинути масштаб до 100%"
          className="text-xs font-semibold"
          onClick={() => fitToScreen(true)}
        >
          100%
        </Button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-5 z-20 m-0 rounded-xs bg-cream/90 px-2.5 py-1.5 font-mono text-xs text-faint">
        {hint}
      </p>
    </div>
  );
}
