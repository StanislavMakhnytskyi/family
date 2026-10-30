"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, X } from "lucide-react";

import type { Person, Relationship } from "@/lib/schemas";
import { computeFamilyTreeLayout } from "@/lib/family-tree-layout";
import { Button } from "@/components/ui/button";
import { clampZoom, initials, lifespan } from "@/lib/utils";

const CARD_WIDTH = 156;
const CARD_HEIGHT = 108;
const COLUMN_WIDTH = CARD_WIDTH + 22;
const ROW_HEIGHT = CARD_HEIGHT + 64;
const ZOOM_STEP = 1.2;
// Fitting a big tree onto a phone would shrink cards to unreadable sizes, so
// the initial view never goes below this and starts at the top generation
// instead. The "fit" button still shows the whole tree.
const MIN_READABLE_SCALE = 0.5;
const SEARCH_FOCUS_SCALE = 0.9;
const HINT_DISMISSED_KEY = "tree-hint-dismissed";

const hintListeners = new Set<() => void>();

function subscribeHint(listener: () => void) {
  hintListeners.add(listener);
  return () => {
    hintListeners.delete(listener);
  };
}

function readHintDismissed() {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

type TreeLabels = {
  search: string;
  searchPlaceholder: string;
  noResults: string;
  dismiss: string;
  empty: string;
  legendParent: string;
  legendSpouse: string;
  legendSibling: string;
};

const DEFAULT_LABELS: TreeLabels = {
  search: "Знайти людину",
  searchPlaceholder: "Знайти людину…",
  noResults: "Нікого не знайдено",
  dismiss: "Сховати підказку",
  empty: "Дерево поки порожнє",
  legendParent: "батьки та діти",
  legendSpouse: "подружжя",
  legendSibling: "брати/сестри",
};

const CARD_CLASS =
  "absolute flex h-[108px] w-[156px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-surface p-2.5 shadow-tree-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-border-hover hover:shadow-card-hover animate-pop-in-tree cursor-pointer select-none no-underline";
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
  zoomLabels = { zoomIn: "Збільшити", zoomOut: "Зменшити", fit: "Вмістити все дерево" },
  labels: labelsProp,
  initialFocusId,
}: {
  people: Person[];
  relationships: Relationship[];
  hint: string;
  lifespanLabels: { born: string; died: string };
  zoomLabels?: { zoomIn: string; zoomOut: string; fit: string };
  labels?: Partial<TreeLabels>;
  initialFocusId?: string;
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [query, setQuery] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(
    initialFocusId && people.some((p) => p.id === initialFocusId) ? initialFocusId : null,
  );
  const [hintDismissedLocal, setHintDismissedLocal] = useState(false);
  const hintDismissed =
    useSyncExternalStore(subscribeHint, readHintDismissed, () => false) || hintDismissedLocal;
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

  function fitToScreen(withTransition: boolean, readable = false) {
    const viewport = viewportRef.current;
    if (!viewport || totalWidth === 0 || totalHeight === 0) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const fitScale = clampZoom(Math.min(vw / totalWidth, vh / totalHeight) * 0.9);
    const scale = readable ? Math.max(fitScale, MIN_READABLE_SCALE) : fitScale;
    // Where the fit is too small to read, show the top generation, centred.
    const overflowsY = totalHeight * scale > vh;
    transformRef.current = {
      x: (vw - totalWidth * scale) / 2,
      y: overflowsY ? 16 : (vh - totalHeight * scale) / 2,
      scale,
    };
    applyTransform(withTransition);
  }

  function centerOn(id: string, withTransition: boolean) {
    const viewport = viewportRef.current;
    const pos = positionOf.get(id);
    if (!viewport || !pos) return;
    const scale = clampZoom(Math.max(transformRef.current.scale, SEARCH_FOCUS_SCALE));
    transformRef.current = {
      x: viewport.clientWidth / 2 - (pos.x + CARD_WIDTH / 2) * scale,
      y: viewport.clientHeight / 2 - (pos.y + CARD_HEIGHT / 2) * scale,
      scale,
    };
    applyTransform(withTransition);
  }

  function focusPerson(id: string) {
    centerOn(id, true);
    setHighlightId(id);
    setQuery("");
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
    fitToScreen(false, true);
    // Arriving from a person page ("show on the tree") starts on that person.
    if (initialFocusId) centerOn(initialFocusId, false);

    function handleResize() {
      fitToScreen(false, true);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWidth, totalHeight]);

  function dismissHint() {
    try {
      localStorage.setItem(HINT_DISMISSED_KEY, "1");
    } catch {
      // Non-fatal: the hint just returns next visit.
    }
    hintListeners.forEach((listener) => listener());
    setHintDismissedLocal(true);
  }

  const trimmedQuery = query.trim().toLocaleLowerCase();
  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];
    return people
      .filter((p) =>
        [p.firstName, p.middleName, p.lastName]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(trimmedQuery),
      )
      .filter((p) => positionOf.has(p.id))
      .slice(0, 6);
  }, [people, trimmedQuery, positionOf]);

  const hasSiblingLinks = relationships.some((r) => r.type === "sibling");
  const hasSpouseLinks = relationships.some((r) => r.type === "spouse");

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

  function handleCardClick(event: React.MouseEvent) {
    if (dragRef.current?.moved) event.preventDefault();
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
              <Link
                key={id}
                href={`/person/${id}`}
                draggable={false}
                data-testid="tree-card"
                className={`${CARD_CLASS}${id === highlightId ? " border-terracotta ring-2 ring-terracotta" : ""}`}
                aria-current={id === highlightId ? "true" : undefined}
                style={{ left: x, top: y }}
                onClick={handleCardClick}
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
              </Link>
            );
          })}
        </div>
      </div>

      {people.length === 0 && (
        <p className="absolute inset-0 z-10 m-0 flex items-center justify-center text-muted">
          {labels.empty}
        </p>
      )}

      {people.length > 0 && (
        <div
          role="search"
          className="absolute top-3 left-3 z-20 w-[min(20rem,calc(100%-1.5rem))]"
        >
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && searchResults[0]) focusPerson(searchResults[0].id);
                else if (event.key === "Escape") {
                  setQuery("");
                  setHighlightId(null);
                }
              }}
              aria-label={labels.search}
              placeholder={labels.searchPlaceholder}
              autoComplete="off"
              className="w-full rounded-sm border border-border-strong bg-surface py-2.5 pr-3 pl-10 font-sans text-base text-ink shadow-fab placeholder:text-faint"
            />
          </div>
          {trimmedQuery && (
            <ul
              className="m-0 mt-1.5 list-none overflow-hidden rounded-sm border border-border-strong bg-surface p-1 shadow-modal"
              data-testid="tree-search-results"
            >
              {searchResults.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted">{labels.noResults}</li>
              ) : (
                searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => focusPerson(p.id)}
                      className="block min-h-11 w-full cursor-pointer rounded-xs px-3 py-2 text-left text-[14.5px] text-ink hover:bg-surface-hover"
                    >
                      {[p.firstName, p.lastName].filter(Boolean).join(" ")}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      <div className="absolute right-4 bottom-5 z-20 flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={zoomLabels.zoomIn}
          onClick={() => zoomFromCenter(ZOOM_STEP)}
        >
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={zoomLabels.zoomOut}
          onClick={() => zoomFromCenter(1 / ZOOM_STEP)}
        >
          −
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={zoomLabels.fit}
          className="text-xs font-semibold"
          onClick={() => fitToScreen(true)}
        >
          ⤢
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[calc(100%-5.5rem)] flex-col items-start gap-1.5">
        {!hintDismissed && (
          <p className="pointer-events-auto m-0 flex items-start gap-1.5 rounded-xs bg-cream/90 py-1 pr-1 pl-2.5 text-xs text-muted">
            <span className="py-0.5">{hint}</span>
            <button
              type="button"
              onClick={dismissHint}
              aria-label={labels.dismiss}
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-xs text-muted hover:bg-surface-hover"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </p>
        )}
        {(hasSpouseLinks || hasSiblingLinks) && (
          <ul
            data-testid="tree-legend"
            className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 rounded-xs bg-cream/90 px-2.5 py-1.5 text-xs text-muted"
          >
            {hasSpouseLinks && (
              <li className="flex items-center gap-1.5">
                <svg width="18" height="8" aria-hidden="true">
                  <path d="M0 4 H18" className="tree-connector" strokeWidth={2} />
                </svg>
                {labels.legendSpouse}
              </li>
            )}
            {hasSiblingLinks && (
              <li className="flex items-center gap-1.5">
                <svg width="18" height="8" aria-hidden="true">
                  <path
                    d="M0 4 H18"
                    className="tree-connector"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                  />
                </svg>
                {labels.legendSibling}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
