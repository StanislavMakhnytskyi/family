"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as f3 from "family-chart";
import type { TreeDatum } from "family-chart";

import type { FamilyChartDatum } from "@/lib/family-chart-adapter";
import { initials, lifespan } from "@/lib/utils";

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

export function TreeClient({
  data,
  hint,
}: {
  data: FamilyChartDatum[];
  hint: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return;

    const chart = f3.createChart(container, data);
    chart.setCardXSpacing(220);
    chart.setCardYSpacing(230);
    chart.setSingleParentEmptyCard(false);
    const card = chart
      .setCardHtml()
      .setCardDim({ w: 190, h: 132 })
      .setCardInnerHtmlCreator(cardTemplate)
      .setOnCardClick((_event: MouseEvent, node: TreeDatum) => {
        router.push(`/person/${node.data.id}`);
      });
    void card;

    chart.updateTree({ initial: true });

    return () => {
      container.innerHTML = "";
    };
  }, [data, router]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={containerRef}
        className="h-full min-h-[calc(100vh-56px)] w-full cursor-grab touch-none active:cursor-grabbing"
      />
      <p className="pointer-events-none absolute bottom-3 left-5 z-20 m-0 rounded-xs bg-cream/90 px-2.5 py-1.5 font-mono text-xs text-faint">
        {hint}
      </p>
    </div>
  );
}
