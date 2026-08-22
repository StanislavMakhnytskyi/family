"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import type { Person, Relationship } from "@/lib/schemas";
import { computeFamilyTreeLayout } from "@/lib/family-tree-layout";
import { Button } from "@/components/ui/button";
import { clampZoom, initials, lifespan } from "@/lib/utils";

const CARD_WIDTH = 190;
const CARD_HEIGHT = 132;
const COLUMN_WIDTH = CARD_WIDTH + 40;
const ROW_HEIGHT = CARD_HEIGHT + 90;
const ZOOM_STEP = 1.2;

const CARD_CLASS =
  "absolute flex h-[132px] w-[190px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3.5 shadow-tree-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-border-hover hover:shadow-card-hover animate-pop-in-tree cursor-pointer select-none";
const AVATAR_CLASS =
  "avatar-placeholder flex size-[60px] shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-xs text-avatar-text";

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
}: {
  people: Person[];
  relationships: Relationship[];
  hint: string;
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

  function handlePointerDown(event: React.PointerEvent) {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      origX: transformRef.current.x,
      origY: transformRef.current.y,
      moved: false,
    };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
    transformRef.current.x = drag.origX + dx;
    transformRef.current.y = drag.origY + dy;
    applyTransform(false);
  }

  function handlePointerUp() {
    dragRef.current = null;
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
                <div className={AVATAR_CLASS}>
                  {initials(person.firstName, person.lastName)}
                </div>
                <div className="text-center leading-tight">
                  <div className="text-[14.5px] font-bold text-ink">
                    {person.firstName} {person.lastName}
                  </div>
                  <div className="mt-[3px] text-[12.5px] tabular-nums text-muted-2">
                    {lifespan(person.birthDate, person.deathDate)}
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
          aria-label="Скинути масштаб"
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
