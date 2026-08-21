"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as f3 from "family-chart";
import type { TreeDatum } from "family-chart";

import type { FamilyChartDatum } from "@/lib/family-chart-adapter";
import { Button } from "@/components/ui/button";
import { clampZoom, initials, lifespan } from "@/lib/utils";

const CARD_CLASS =
  "flex h-[132px] w-[190px] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-3.5 shadow-tree-card transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[3px] hover:border-border-hover hover:shadow-card-hover animate-pop-in-tree";
const AVATAR_CLASS =
  "avatar-placeholder flex size-[60px] shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-xs text-avatar-text";

function cardTemplate(node: TreeDatum) {
  const data = node.data.data as FamilyChartDatum["data"];
  if (!data?.firstName) return "";
  return `
    <div class="${CARD_CLASS}">
      <div class="${AVATAR_CLASS}">${initials(data.firstName, data.lastName)}</div>
      <div class="text-center leading-tight">
        <div class="text-[14.5px] font-bold text-ink">${data.firstName} ${data.lastName}</div>
        <div class="mt-[3px] text-[12.5px] tabular-nums text-muted-2">${lifespan(data.birthDate, data.deathDate)}</div>
      </div>
    </div>
  `;
}

const ZOOM_STEP = 1.2;

export function TreeClient({
  data,
  hint,
}: {
  data: FamilyChartDatum[];
  hint: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    const chart = f3.createChart(container, data);
    chartRef.current = chart;
    chart.setCardXSpacing(220);
    chart.setCardYSpacing(230);
    chart.setSingleParentEmptyCard(false);
    chart
      .setCardHtml()
      .setCardDim({ w: 190, h: 132 })
      .setCardInnerHtmlCreator(cardTemplate)
      .setOnCardClick((_event: MouseEvent, node: TreeDatum) => {
        router.push(`/person/${node.data.id}`);
      });

    chart.updateTree({ initial: true, tree_position: "fit" });

    function handleResize() {
      chartRef.current?.updateTree({
        tree_position: "fit",
        transition_time: 0,
      });
    }
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current = null;
      container.innerHTML = "";
    };
  }, [data, router]);

  function zoomBy(factor: number) {
    const chart = chartRef.current;
    if (!chart) return;
    const current = f3.handlers.getCurrentZoom(chart.svg).k;
    f3.handlers.zoomTo(chart.svg, clampZoom(current * factor));
  }

  function resetZoom() {
    chartRef.current?.updateTree({ tree_position: "fit", transition_time: 300 });
  }

  return (
    <div
      className="relative h-[calc(100vh-64px)] flex-1 overflow-hidden"
      data-testid="tree-viewport"
    >
      <div
        ref={containerRef}
        data-testid="tree-canvas"
        className="f3 absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
      <div className="absolute right-4 bottom-5 z-20 flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Збільшити"
          onClick={() => zoomBy(ZOOM_STEP)}
        >
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Зменшити"
          onClick={() => zoomBy(1 / ZOOM_STEP)}
        >
          −
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Скинути масштаб"
          className="text-xs font-semibold"
          onClick={resetZoom}
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
