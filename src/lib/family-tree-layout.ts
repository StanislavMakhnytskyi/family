import type { Person, Relationship } from "@/lib/schemas";

export type FamilyTreeNode = {
  id: string;
  /** Row index — ancestors are negative, descendants positive, relative to whichever person layout starts from. */
  generation: number;
  /** Left-to-right column index. Not necessarily contiguous within a row, but consistent ordering across the whole layout. */
  column: number;
};

export type FamilyTreeLayout = {
  nodes: Map<string, FamilyTreeNode>;
};

type Graph = {
  parentsOf: Map<string, string[]>;
  childrenOf: Map<string, string[]>;
  spousesOf: Map<string, string[]>;
  /**
   * Layout-only pairing: real spouses plus *implicit* co-parents (two people
   * who are parents of the same child with no spouse record between them,
   * e.g. one died). Never used for drawing marriage lines.
   */
  partnersOf: Map<string, string[]>;
  siblingsOf: Map<string, string[]>;
};

/**
 * Canonical identity order: birth date (a missing date sorts first), then id.
 * Everything that has to pick an order goes through this, so the layout never
 * depends on the order of the people/relationships arrays.
 */
function comparePeople(a: Person, b: Person): number {
  const dateA = a.birthDate ?? "";
  const dateB = b.birthDate ?? "";
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

function buildGraph(
  people: Person[],
  relationships: Relationship[],
  byRank: (a: string, b: string) => number,
): Graph {
  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();
  const siblingsOf = new Map<string, string[]>();
  for (const person of people) {
    parentsOf.set(person.id, []);
    childrenOf.set(person.id, []);
    spousesOf.set(person.id, []);
    siblingsOf.set(person.id, []);
  }

  function push(map: Map<string, string[]>, key: string, value: string) {
    const list = map.get(key);
    if (list && !list.includes(value)) list.push(value);
  }

  for (const rel of relationships) {
    // A record naming someone who isn't in `people` can't be laid out; keeping
    // it would put a phantom id into the graph and break every rank lookup.
    if (!parentsOf.has(rel.person1Id) || !parentsOf.has(rel.person2Id)) continue;
    if (rel.type === "parent-child") {
      push(childrenOf, rel.person1Id, rel.person2Id);
      push(parentsOf, rel.person2Id, rel.person1Id);
    } else if (rel.type === "spouse") {
      push(spousesOf, rel.person1Id, rel.person2Id);
      push(spousesOf, rel.person2Id, rel.person1Id);
    } else if (rel.type === "sibling") {
      push(siblingsOf, rel.person1Id, rel.person2Id);
      push(siblingsOf, rel.person2Id, rel.person1Id);
    }
  }

  const partnersOf = new Map<string, string[]>();
  for (const [id, list] of spousesOf) partnersOf.set(id, [...list]);
  for (const parents of parentsOf.values()) {
    for (let i = 0; i < parents.length; i++) {
      for (let j = i + 1; j < parents.length; j++) {
        push(partnersOf, parents[i], parents[j]);
        push(partnersOf, parents[j], parents[i]);
      }
    }
  }

  // Relationship-array order must not leak into anything downstream.
  for (const map of [parentsOf, childrenOf, spousesOf, partnersOf, siblingsOf]) {
    for (const list of map.values()) list.sort(byRank);
  }

  return { parentsOf, childrenOf, spousesOf, partnersOf, siblingsOf };
}

/**
 * For each person with no recorded parents ("parentless") who has a
 * "sibling" relationship to someone else, decides who's the "anchor" (kept
 * as a normal tree root/member) and who's the "satellite" (positioned as
 * an extra member right next to the anchor instead — see layoutComponent).
 * This is specifically for the case the sibling relationship type exists
 * for: a relative known to be someone's sibling without knowing (or
 * without it being recorded) their shared parents, e.g. a
 * cousin-grandparent added as a sibling of an actual grandparent.
 *
 * Preference order: attach to a sibling who already has a real tree context
 * (parents, children, or a partner) over one who's otherwise isolated; if
 * both are isolated, break the tie by id so a mutually-isolated pair still
 * ends up clustered together instead of neither being chosen. Only direct
 * sibling edges are resolved -- a chain of satellites-of-satellites (no
 * one in the chain otherwise anchored) isn't something the described use
 * case produces, so it isn't specially handled here.
 */
function computeSiblingAnchors(people: Person[], graph: Graph): Map<string, string> {
  const isParentless = (id: string) => (graph.parentsOf.get(id) ?? []).length === 0;
  const hasTreeContext = (id: string) =>
    !isParentless(id) ||
    (graph.childrenOf.get(id) ?? []).length > 0 ||
    (graph.partnersOf.get(id) ?? []).length > 0;
  const anchorOf = new Map<string, string>();

  for (const person of people) {
    // Someone already connected through family or marriage is the natural
    // anchor. Treating them as a satellite can put their siblings on both
    // sides of their spouse instead of keeping the couple intact.
    if (anchorOf.has(person.id) || hasTreeContext(person.id)) continue;
    for (const siblingId of graph.siblingsOf.get(person.id) ?? []) {
      // Don't attach to someone who is themselves already our satellite --
      // that would just swap which end of the pair is "the anchor" for no
      // reason, or (in a 3+-way case) create a cycle.
      if (anchorOf.get(siblingId) === person.id) continue;
      if (hasTreeContext(siblingId) || siblingId < person.id) {
        anchorOf.set(person.id, siblingId);
        break;
      }
    }
  }

  return anchorOf;
}

/**
 * Assigns every person a generation (row), propagating outward from an
 * arbitrary start: children are one row below their parents, spouses share
 * a row. Handles a family made of multiple blood lines joined only by
 * marriage (in-laws) by re-seeding a BFS from any still-unreached person
 * once the current one runs out — every person ends up with a generation,
 * regardless of how many marriage-only "bridges" separate them.
 *
 * A sibling satellite (see computeSiblingAnchors) shares its anchor's
 * generation too, but never starts its own BFS -- it must only ever be
 * reached *through* its anchor, or it could seed its own independent
 * generation-0 component first (if it happens to come first in `people`)
 * and end up on the wrong row relative to the anchor it's meant to sit
 * beside.
 */
function assignGenerations(
  people: Person[],
  graph: Graph,
  siblingAnchorOf: Map<string, string>,
): Map<string, number> {
  const generation = new Map<string, number>();

  for (const start of people) {
    if (generation.has(start.id) || siblingAnchorOf.has(start.id)) continue;
    generation.set(start.id, 0);
    const queue = [start.id];
    for (let head = 0; head < queue.length; head++) {
      const id = queue[head];
      const g = generation.get(id)!;
      for (const parentId of graph.parentsOf.get(id) ?? []) {
        if (!generation.has(parentId)) {
          generation.set(parentId, g - 1);
          queue.push(parentId);
        }
      }
      for (const childId of graph.childrenOf.get(id) ?? []) {
        if (!generation.has(childId)) {
          generation.set(childId, g + 1);
          queue.push(childId);
        }
      }
      for (const spouseId of graph.spousesOf.get(id) ?? []) {
        if (!generation.has(spouseId)) {
          generation.set(spouseId, g);
          queue.push(spouseId);
        }
      }
      for (const siblingId of graph.siblingsOf.get(id) ?? []) {
        if (!generation.has(siblingId)) {
          generation.set(siblingId, g);
          queue.push(siblingId);
        }
      }
    }
  }

  return generation;
}

type Ctx = {
  graph: Graph;
  rank: Map<string, number>;
  byRank: (a: string, b: string) => number;
  generation: Map<string, number>;
  anchorOf: Map<string, string>;
  satellitesOf: Map<string, string[]>;
};

/** A rigid run of cards, exactly one column apart in `members` order. */
type Block = {
  members: string[];
  /** The member order a freshly built block starts in (blood relative first); preferred whenever a flip changes nothing. */
  preferred: string[];
  gen: number;
  /** Canonical rank of the best-ranked member: the deterministic tie-break. */
  rank: number;
  parents: string[];
  children: string[];
  /** Cached numeric card ids for `members` (valid while `idsFor === members`). */
  ids?: number[];
  idsFor?: string[];
};

const SWEEPS = 4;
const POLISH_PASSES = 4;
const MAX_STARTS = 4;
const CROSSING = 1e6;
const EPSILON = 1e-9;
const COORDINATE_ROUNDS = 10;
/** Columns are snapped to this grid so rigid blocks keep their gaps bit-exact. */
const GRID = 1024;
/**
 * Deterministic cap on the order-search effort per family, counted in cards
 * visited by `cost()` (never wall-clock time, so the result does not depend on
 * machine speed). Ordinary families use a tiny fraction of it; only very wide
 * rows run out, after which the remaining search (block moves and extra
 * starting roots) is skipped and the order found so far is kept.
 */
export const LAYOUT_WORK_BUDGET = 1_500_000;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Families: people connected by any relationship, each in canonical order. */
function connectedComponents(people: Person[], graph: Graph, ctx: Ctx): string[][] {
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const person of people) {
    if (seen.has(person.id)) continue;
    const members: string[] = [];
    const stack = [person.id];
    seen.add(person.id);
    while (stack.length > 0) {
      const id = stack.pop()!;
      members.push(id);
      for (const map of [
        graph.parentsOf,
        graph.childrenOf,
        graph.spousesOf,
        graph.siblingsOf,
      ]) {
        for (const next of map.get(id) ?? []) {
          if (!seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        }
      }
    }
    components.push(members.sort(ctx.byRank));
  }
  return components;
}

/**
 * Orders one block's members so partner edges join neighbours wherever a
 * line allows it (always for couples and for remarriage chains of up to two
 * partners per person). Parentless sibling satellites are deliberately kept
 * out of that partner core: a sibling run goes at an outside edge, never
 * between a person and their spouse. Deterministic: starts from the
 * best-connected member, ties broken by walk order, then rank.
 */
function orderBlockMembers(
  members: string[],
  adjacency: Map<string, string[]>,
  byRank: (a: string, b: string) => number,
  walked: Map<string, number>,
  anchorOf: Map<string, string>,
): string[] {
  if (members.length < 2) return members;

  // `adjacency` contains both partner and anchor/satellite links so it can
  // identify one rigid block. Only partners belong in its inner core though:
  // treating a sibling satellite as another generic neighbour lets a BFS put
  // it between an anchor and spouse (the bug this guards against).
  const satellitesByAnchor = new Map<string, string[]>();
  const satelliteIds = new Set<string>();
  for (const id of members) {
    const anchor = anchorOf.get(id);
    if (!anchor || !adjacency.has(anchor)) continue;
    satelliteIds.add(id);
    const list = satellitesByAnchor.get(anchor) ?? [];
    list.push(id);
    satellitesByAnchor.set(anchor, list);
  }
  const core = members.filter((id) => !satelliteIds.has(id));
  if (core.length === 0) return members;

  const coreSet = new Set(core);
  const partnerAdjacency = new Map<string, string[]>();
  for (const id of core) {
    partnerAdjacency.set(
      id,
      (adjacency.get(id) ?? []).filter((other) => coreSet.has(other)),
    );
  }

  const degree = (id: string) => partnerAdjacency.get(id)!.length;
  const placed = new Set<string>();
  const queue: { id: string; side: "left" | "right" }[] = [];

  // Removing satellites can leave several partner components. Lay each out
  // in the same deterministic order rather than dropping anything that was
  // previously only connected through a sibling link.
  const starts = [...core].sort(
    (a, b) =>
      degree(b) - degree(a) || walked.get(a)! - walked.get(b)! || byRank(a, b),
  );
  const orderedCore: string[] = [];
  for (const start of starts) {
    if (placed.has(start)) continue;
    placed.add(start);
    const componentLeft: string[] = [];
    const componentRight: string[] = [];
    const first = partnerAdjacency.get(start)!;
    first.forEach((id, i) => {
      const side = first.length === 1 || i % 2 === 1 ? "right" : "left";
      placed.add(id);
      (side === "left" ? componentLeft : componentRight).push(id);
      queue.push({ id, side });
    });
    while (queue.length > 0) {
      const { id, side } = queue.shift()!;
      for (const next of partnerAdjacency.get(id)!) {
        if (placed.has(next)) continue;
        placed.add(next);
        (side === "left" ? componentLeft : componentRight).push(next);
        queue.push({ id: next, side });
      }
    }
    orderedCore.push(...componentLeft.reverse(), start, ...componentRight);
  }

  let ordered = orderedCore;
  const anchors = [...satellitesByAnchor.keys()].sort(
    (a, b) => orderedCore.indexOf(a) - orderedCore.indexOf(b) || byRank(a, b),
  );
  for (const anchor of anchors) {
    const satellites = satellitesByAnchor
      .get(anchor)!
      .sort((a, b) => walked.get(a)! - walked.get(b)! || byRank(a, b));
    const at = ordered.indexOf(anchor);
    // At an endpoint, the run stays directly beside its anchor and opposite
    // the spouse. For a rare remarriage chain where the anchor is internal,
    // keep the run outside the partner core rather than breaking either
    // adjacent spouse pair; choose the closer outside edge deterministically.
    if (at === 0) {
      ordered = [...satellites, ...ordered];
    } else if (at === ordered.length - 1) {
      ordered = [...ordered, ...satellites];
    } else if (at * 2 < ordered.length - 1) {
      ordered = [...satellites, ...ordered];
    } else {
      ordered = [...ordered, ...satellites];
    }
  }
  return ordered;
}

/**
 * Deterministic walk used only to seed the order inside each row: roots by
 * canonical rank, then a person's partners, then the children of each
 * couple, then the rest of their children.
 */
function walkOrder(
  members: string[],
  ctx: Ctx,
  firstRoot?: string,
  reverseKids = false,
): Map<string, number> {
  const { graph, anchorOf, satellitesOf } = ctx;
  const index = new Map<string, number>();
  const expanded = new Set<string>();

  // Iterative (explicit stacks) so a very deep family cannot overflow the call
  // stack, and every loop is guarded by `index`/`expanded` so cyclic records
  // cannot spin forever.
  function claim(id: string) {
    const pending = [id];
    while (pending.length > 0) {
      const current = pending.pop()!;
      if (index.has(current)) continue;
      index.set(current, index.size);
      const satellites = satellitesOf.get(current) ?? [];
      for (let i = satellites.length - 1; i >= 0; i--) pending.push(satellites[i]);
    }
  }

  type Task = { kind: "expand" | "parent"; id: string };
  function run(rootId: string) {
    const stack: Task[] = [{ kind: "expand", id: rootId }];
    while (stack.length > 0) {
      const task = stack.pop()!;
      if (task.kind === "parent") {
        // A married-in partner's own family is walked right here, so it lands
        // beside the family it joins instead of wherever its root sorts to.
        if (!index.has(task.id)) {
          const top = topAncestor(task.id);
          claim(top);
          stack.push({ kind: "expand", id: top });
        }
        continue;
      }
      const id = task.id;
      if (expanded.has(id)) continue;
      expanded.add(id);
      const kids = graph.childrenOf.get(id) ?? [];
      const partners = graph.partnersOf.get(id) ?? [];
      const satellites = satellitesOf.get(id) ?? [];
      for (const partner of partners) claim(partner);

      // Children are listed couple by couple, then the rest; all of them are
      // claimed before any is explored, so siblings stay together.
      const ordered: string[] = [];
      const listed = new Set<string>();
      for (const partner of partners) {
        const partnerKids = new Set(graph.childrenOf.get(partner) ?? []);
        for (const kid of kids) {
          if (partnerKids.has(kid) && !listed.has(kid)) {
            listed.add(kid);
            ordered.push(kid);
          }
        }
      }
      for (const kid of kids) {
        if (!listed.has(kid)) {
          listed.add(kid);
          ordered.push(kid);
        }
      }
      if (reverseKids) ordered.reverse();
      for (const kid of ordered) claim(kid);

      // Work to do after this prelude, in order; pushed reversed onto the stack.
      const next: Task[] = [];
      for (const partner of partners) {
        for (const parent of graph.parentsOf.get(partner) ?? []) {
          next.push({ kind: "parent", id: parent });
        }
      }
      for (const kid of ordered) next.push({ kind: "expand", id: kid });
      for (const partner of partners) next.push({ kind: "expand", id: partner });
      for (const satellite of satellites) next.push({ kind: "expand", id: satellite });
      for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]);
    }
  }

  function visit(id: string) {
    claim(id);
    run(id);
  }

  /** Walks up to the first ancestor chain end not yet placed; `seen` stops it looping on cyclic ancestry. */
  function topAncestor(id: string): string {
    const seen = new Set<string>();
    let current = id;
    for (;;) {
      seen.add(current);
      const up = (graph.parentsOf.get(current) ?? []).find((p) => !index.has(p) && !seen.has(p));
      if (up === undefined) return current;
      current = up;
    }
  }

  const roots = members.filter(
    (id) => (graph.parentsOf.get(id) ?? []).length === 0 && !anchorOf.has(id),
  );
  if (firstRoot !== undefined) visit(firstRoot);
  for (const id of roots) visit(id);
  // Anything left is only reachable through a marriage: seed from whoever
  // already has their parents placed, otherwise from the best-ranked.
  for (;;) {
    const left = members.filter((id) => !index.has(id));
    if (left.length === 0) break;
    const next =
      left.find((id) => (graph.parentsOf.get(id) ?? []).every((p) => index.has(p))) ?? left[0];
    visit(next);
  }
  return index;
}

/**
 * Lays out one connected family. Cards of a generation are arranged in rigid
 * blocks (partners and sibling satellites, exactly one column apart), the
 * blocks of every row are ordered Sugiyama-style (family walk, barycenter
 * sweeps, then crossing-minimising moves) and then
 * given x coordinates by alternating "pull toward relatives" with an
 * order-preserving projection that enforces the minimum spacing. Overlap is
 * impossible by construction: a row's final step is always the projection,
 * and a block's cards never move relative to one another.
 */
function layoutComponent(members: string[], ctx: Ctx): Map<string, number> {
  const { graph, byRank, generation } = ctx;
  const memberSet = new Set(members);
  const genOf = (id: string) => generation.get(id) ?? 0;

  // --- Blocks -----------------------------------------------------------
  const adjacency = new Map<string, string[]>();
  for (const id of members) adjacency.set(id, []);
  const link = (a: string, b: string) => {
    if (a === b || !memberSet.has(a) || !memberSet.has(b) || genOf(a) !== genOf(b)) return;
    if (!adjacency.get(a)!.includes(b)) adjacency.get(a)!.push(b);
    if (!adjacency.get(b)!.includes(a)) adjacency.get(b)!.push(a);
  };
  for (const id of members) {
    for (const partner of graph.partnersOf.get(id) ?? []) link(id, partner);
    const anchor = ctx.anchorOf.get(id);
    if (anchor) link(id, anchor);
  }
  for (const list of adjacency.values()) list.sort(byRank);

  const baseWalk = walkOrder(members, ctx);
  const blockOf = new Map<string, Block>();
  const blocks: Block[] = [];
  for (const id of members) {
    if (blockOf.has(id)) continue;
    const component: string[] = [];
    const stack = [id];
    blockOf.set(id, null as unknown as Block);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of adjacency.get(current)!) {
        if (!blockOf.has(next)) {
          blockOf.set(next, null as unknown as Block);
          stack.push(next);
        }
      }
    }
    component.sort(byRank);
    const ordered = orderBlockMembers(component, adjacency, byRank, baseWalk, ctx.anchorOf);
    const own = new Set(ordered);
    const distinct = (map: Map<string, string[]>) => {
      const result: string[] = [];
      for (const m of ordered) {
        for (const other of map.get(m) ?? []) {
          if (!own.has(other) && memberSet.has(other) && !result.includes(other)) result.push(other);
        }
      }
      return result;
    };
    const block: Block = {
      members: ordered,
      preferred: ordered,
      gen: genOf(id),
      rank: ctx.rank.get(component[0])!,
      parents: distinct(graph.parentsOf),
      children: distinct(graph.childrenOf),
    };
    for (const m of ordered) blockOf.set(m, block);
    blocks.push(block);
  }

  // --- Order within each row ---------------------------------------------
  const generations = [...new Set(blocks.map((b) => b.gen))].sort((a, b) => a - b);
  const rows: Block[][] = generations.map(() => []);
  const rowOfGeneration = new Map(generations.map((g, i) => [g, i]));
  function seedRows(walk: Map<string, number>) {
    const walkKey = (b: Block) => Math.min(...b.members.map((m) => walk.get(m)!));
    const grouped: Block[][] = generations.map(() => []);
    for (const b of blocks) grouped[rowOfGeneration.get(b.gen)!].push(b);
    grouped.forEach((row, i) => {
      rows[i] = row.sort((x, y) => walkKey(x) - walkKey(y) || x.rank - y.rank);
    });
  }

  /** Every card's x as a fraction of its own row's width, so rows are comparable. */
  function fractions(): Map<string, number> {
    const fx = new Map<string, number>();
    for (const row of rows) {
      const total = row.reduce((sum, b) => sum + b.members.length, 0);
      let cursor = 0;
      for (const b of row) {
        b.members.forEach((m, i) => fx.set(m, (cursor + i + 0.5) / total));
        cursor += b.members.length;
      }
    }
    return fx;
  }

  function neighbourKey(b: Block, direction: "down" | "up", fx: Map<string, number>): number {
    const primary = direction === "down" ? b.parents : b.children;
    const secondary = direction === "down" ? b.children : b.parents;
    const pick = primary.length > 0 ? primary : secondary.length > 0 ? secondary : b.members;
    return Math.round(mean(pick.map((p) => fx.get(p)!)) * 1e6);
  }

  /** `fx` is the current fractions of every row; only row `r` changes here, so only it is refreshed. */
  function sweepRow(r: number, direction: "down" | "up", fx: Map<string, number>) {
    rows[r] = rows[r]
      .map((b) => ({ b, key: neighbourKey(b, direction, fx) }))
      .sort((x, y) => x.key - y.key || x.b.rank - y.b.rank)
      .map((x) => x.b);
    for (const b of rows[r]) {
      if (b.members.length < 2) continue;
      const before = cost(r - 1, r);
      const original = b.members;
      b.members = [...original].reverse();
      if (cost(r - 1, r) >= before - EPSILON) b.members = original;
    }
    const total = rowWidth[r];
    let cursor = 0;
    for (const b of rows[r]) {
      b.members.forEach((m, i) => fx.set(m, (cursor + i + 0.5) / total));
      cursor += b.members.length;
    }
  }

  const rowIndexOf = rowOfGeneration;
  const cardNumber = new Map(members.map((id, i) => [id, i]));
  const rowWidth = rows.map(() => 0);
  for (const b of blocks) rowWidth[rowIndexOf.get(b.gen)!] += b.members.length;
  /** Per layer: each child with the parents above it, as TreeClient draws them (numeric card ids). */
  const linesBelow: { parents: number[]; child: number }[][] = rows.map(() => []);
  for (const id of members) {
    const row = rowIndexOf.get(genOf(id))!;
    if (row === 0) continue;
    const above = (graph.parentsOf.get(id) ?? []).filter(
      (p) => memberSet.has(p) && rowIndexOf.get(genOf(p)) === row - 1,
    );
    if (above.length > 0) {
      linesBelow[row - 1].push({ parents: above.map((p) => cardNumber.get(p)!), child: cardNumber.get(id)! });
    }
  }
  const position = new Float64Array(members.length);
  const fraction = new Float64Array(members.length);
  /** Cards visited by cost() so far; compared with LAYOUT_WORK_BUDGET to bound the search. */
  let work = 0;
  const outOfBudget = () => work >= LAYOUT_WORK_BUDGET;

  function cardIds(b: Block): number[] {
    if (b.idsFor !== b.members) {
      b.ids = b.members.map((m) => cardNumber.get(m)!);
      b.idsFor = b.members;
    }
    return b.ids!;
  }

  /**
   * Quality of the current order for the line layers `from..to` (indexes of
   * the upper row of each layer): crossing parent-child lines dominate
   * (`CROSSING`), total line length (as row fractions) breaks ties, so
   * children settle next to their parents instead of at the far end of a row.
   */
  function cost(from: number, to: number): number {
    const lo = Math.max(0, from);
    const hi = Math.min(rows.length - 2, to);
    for (let r = lo; r <= hi + 1; r++) {
      const total = rowWidth[r];
      work += total;
      let cursor = 0;
      for (const b of rows[r]) {
        for (const id of cardIds(b)) {
          position[id] = cursor;
          fraction[id] = (cursor + 0.5) / total;
          cursor++;
        }
      }
    }
    let crossings = 0;
    let length = 0;
    for (let k = lo; k <= hi; k++) {
      work += linesBelow[k].length;
      const lines = linesBelow[k].map(({ parents, child }) => {
        let fractionSum = 0;
        let positionSum = 0;
        for (const p of parents) {
          fractionSum += fraction[p];
          positionSum += position[p];
        }
        length += Math.abs(fractionSum / parents.length - fraction[child]);
        return [positionSum / parents.length, position[child]] as const;
      });
      // Two lines cross when their ends are in opposite order: count strict
      // inversions of the lower ends after sorting by upper end (Fenwick tree).
      lines.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
      const width = rowWidth[k + 1];
      const tree = new Array<number>(width + 1).fill(0);
      lines.forEach(([, bottom], inserted) => {
        let notAfter = 0;
        for (let i = bottom + 1; i > 0; i -= i & -i) notAfter += tree[i];
        crossings += inserted - notAfter;
        for (let i = bottom + 1; i <= width; i += i & -i) tree[i]++;
      });
    }
    return crossings * CROSSING + length;
  }

  const snapshot = () => ({
    rows: rows.map((row) => [...row]),
    members: new Map(blocks.map((b) => [b, b.members] as const)),
  });
  const restore = (saved: ReturnType<typeof snapshot>) => {
    saved.rows.forEach((row, i) => (rows[i] = [...row]));
    for (const [b, m] of saved.members) b.members = m;
  };

  /**
   * Move one block to a better place in its row, or flip it. Only strict
   * improvements are kept, so this terminates and is deterministic.
   */
  function polish(passes: number, allowMoves: boolean) {
    for (let pass = 0; pass < passes; pass++) {
      let changed = false;
      for (let r = 0; r < rows.length; r++) {
        for (const block of [...rows[r]]) {
          const startOrder = rows[r];
          const startMembers = block.members;
          let best = cost(r - 1, r);
          let bestOrder = startOrder;
          let bestMembers = startMembers;
          if (startMembers.length > 1) {
            block.members = [...startMembers].reverse();
            const flipped = cost(r - 1, r);
            if (flipped < best - EPSILON) {
              best = flipped;
              bestMembers = block.members;
            }
            block.members = startMembers;
          }
          if (allowMoves && !outOfBudget()) {
            const at = startOrder.indexOf(block);
            const rest = startOrder.filter((b) => b !== block);
            for (let j = 0; j <= rest.length; j++) {
              if (j === at) continue;
              if (outOfBudget()) break;
              rows[r] = [...rest.slice(0, j), block, ...rest.slice(j)];
              const trial = cost(r - 1, r);
              if (trial < best - EPSILON) {
                best = trial;
                bestOrder = rows[r];
                bestMembers = startMembers;
              }
            }
          }
          rows[r] = bestOrder;
          block.members = bestMembers;
          if (bestOrder !== startOrder || bestMembers !== startMembers) changed = true;
        }
      }
      if (!changed) break;
    }
  }

  /**
   * Seeds the order with a walk of the family (which root it starts from
   * decides how the branches line up), then improves it. Barycenter sweeps
   * can beat the walk or settle somewhere worse, so they are kept only if
   * they cross fewer lines; finally blocks are moved and flipped one at a time.
   */
  function arrange(firstRoot: string | undefined, reverseKids: boolean): number {
    seedRows(walkOrder(members, ctx, firstRoot, reverseKids));
    polish(1, false);
    const walked = snapshot();
    const walkedCost = cost(0, rows.length);
    const fx = fractions();
    for (let i = 0; i < SWEEPS; i++) {
      for (let r = 1; r < rows.length; r++) sweepRow(r, "down", fx);
      for (let r = rows.length - 2; r >= 0; r--) sweepRow(r, "up", fx);
    }
    if (cost(0, rows.length) >= walkedCost - EPSILON) restore(walked);
    polish(POLISH_PASSES, true);
    return cost(0, rows.length);
  }

  // Try the roots in canonical order and stop at the first start that
  // leaves no crossings: a tree that is already planar from its canonical
  // first root keeps reading left to right in canonical order.
  const roots = members.filter(
    (id) => (graph.parentsOf.get(id) ?? []).length === 0 && !ctx.anchorOf.has(id),
  );
  let bestCost = Infinity;
  let best: ReturnType<typeof snapshot> | null = null;
  search: for (const root of roots.length > 0 ? roots.slice(0, MAX_STARTS) : [undefined]) {
    // A walk can only list siblings one way round; when that traps a branch
    // between two others, the opposite sibling order is planar.
    for (const reverseKids of [false, true]) {
      const c = arrange(root, reverseKids);
      if (c < bestCost - EPSILON) {
        bestCost = c;
        best = snapshot();
      }
      if (bestCost < CROSSING || outOfBudget()) break search;
    }
  }
  if (best) restore(best);

  /**
   * Cost is mirror-symmetric, so the best order and its mirror image are
   * equally good. Keep the one that reads in canonical order: the canonically
   * first root as far left in its row as possible, then (as a tie-break)
   * lower-ranked people left of higher-ranked ones summed over every pair in
   * a row; a remaining tie keeps the order as found. Then un-flip any couple
   * whose flip bought nothing, so a pair is only ever reversed when keeping a
   * spouse next to the family it joins requires it.
   */
  const firstRoot = roots[0];
  function orientation(): [number, number] {
    let pairs = 0;
    let rootFraction = 0.5;
    for (const row of rows) {
      const flat = row.flatMap((b) => b.members);
      const at = firstRoot === undefined ? -1 : flat.indexOf(firstRoot);
      if (at >= 0) rootFraction = (at + 0.5) / flat.length;
      const ranks = flat.map((m) => ctx.rank.get(m)!);
      for (let i = 0; i < ranks.length; i++) {
        for (let j = i + 1; j < ranks.length; j++) pairs += ranks[i] < ranks[j] ? 1 : -1;
      }
    }
    return [rootFraction, pairs];
  }
  const mirror = () => {
    for (let i = 0; i < rows.length; i++) rows[i] = [...rows[i]].reverse();
    for (const b of blocks) b.members = [...b.members].reverse();
  };
  const [rootBefore, pairsBefore] = orientation();
  mirror();
  const [rootAfter, pairsAfter] = orientation();
  const mirroredReadsBetter =
    Math.abs(rootAfter - rootBefore) > EPSILON
      ? rootAfter < rootBefore
      : pairsAfter > pairsBefore;
  if (!mirroredReadsBetter) mirror();
  for (let r = 0; r < rows.length; r++) {
    for (const b of rows[r]) {
      if (b.members.length < 2 || b.members.every((m, i) => m === b.preferred[i])) continue;
      const current = b.members;
      const now = cost(r - 1, r);
      b.members = b.preferred;
      if (cost(r - 1, r) > now + EPSILON) b.members = current;
    }
  }

  // --- Coordinates ---------------------------------------------------------
  const left = new Map<Block, number>();
  for (const row of rows) {
    let cursor = 0;
    for (const b of row) {
      left.set(b, cursor);
      cursor += b.members.length;
    }
  }
  const xOf = (id: string) => {
    const b = blockOf.get(id)!;
    return left.get(b)! + b.members.indexOf(id);
  };

  /**
   * Order-preserving projection (pool-adjacent-violators): moves the blocks
   * of one row as little as possible so neighbours are at least a block
   * width apart.
   */
  function projectRow(row: Block[], targets: number[]) {
    const offsets: number[] = [];
    let offset = 0;
    for (const b of row) {
      offsets.push(offset);
      offset += b.members.length;
    }
    type Pool = { start: number; count: number; weight: number; total: number };
    const pools: Pool[] = [];
    row.forEach((b, i) => {
      const weight = b.members.length;
      pools.push({ start: i, count: 1, weight, total: weight * (targets[i] - offsets[i]) });
      while (pools.length > 1) {
        const last = pools[pools.length - 1];
        const prev = pools[pools.length - 2];
        if (prev.total / prev.weight <= last.total / last.weight) break;
        pools.splice(pools.length - 2, 2, {
          start: prev.start,
          count: prev.count + last.count,
          weight: prev.weight + last.weight,
          total: prev.total + last.total,
        });
      }
    });
    for (const pool of pools) {
      const y = pool.total / pool.weight;
      for (let i = pool.start; i < pool.start + pool.count; i++) left.set(row[i], y + offsets[i]);
    }
  }

  function pull(r: number, direction: "children" | "parents") {
    const row = rows[r];
    const targets = row.map((b) => {
      if (direction === "children") {
        if (b.children.length === 0) return left.get(b)!;
        const xs = b.children.map(xOf);
        return (Math.min(...xs) + Math.max(...xs)) / 2 - (b.members.length - 1) / 2;
      }
      const wanted: number[] = [];
      b.members.forEach((m, i) => {
        const parents = (graph.parentsOf.get(m) ?? []).filter((p) => memberSet.has(p));
        if (parents.length > 0) wanted.push(mean(parents.map(xOf)) - i);
      });
      return wanted.length > 0 ? mean(wanted) : left.get(b)!;
    });
    projectRow(row, targets);
  }

  const bottomUp = () => {
    for (let r = rows.length - 2; r >= 0; r--) pull(r, "children");
  };
  const topDown = () => {
    for (let r = 1; r < rows.length; r++) pull(r, "parents");
  };
  for (let i = 0; i < COORDINATE_ROUNDS; i++) {
    bottomUp();
    topDown();
  }
  bottomUp();

  // Snap to the grid, left to right, never closing a gap below one block width.
  for (const row of rows) {
    let edge = -Infinity;
    for (const b of row) {
      const snapped = Math.max(Math.round(left.get(b)! * GRID) / GRID, edge);
      left.set(b, snapped);
      edge = snapped + b.members.length;
    }
  }

  const column = new Map<string, number>();
  let minColumn = Infinity;
  for (const id of members) {
    const x = xOf(id);
    column.set(id, x);
    minColumn = Math.min(minColumn, x);
  }
  for (const [id, x] of column) column.set(id, x - minColumn);
  return column;
}

export function computeFamilyTreeLayout(
  people: Person[],
  relationships: Relationship[],
): FamilyTreeLayout {
  const canonical = [...people].sort(comparePeople);
  const rank = new Map(canonical.map((p, i) => [p.id, i]));
  const byRank = (a: string, b: string) => rank.get(a)! - rank.get(b)!;
  const graph = buildGraph(canonical, relationships, byRank);
  const anchorOf = computeSiblingAnchors(canonical, graph);
  const generation = assignGenerations(canonical, graph, anchorOf);

  const satellitesOf = new Map<string, string[]>();
  for (const person of canonical) {
    const anchor = anchorOf.get(person.id);
    if (!anchor) continue;
    const list = satellitesOf.get(anchor) ?? [];
    list.push(person.id);
    satellitesOf.set(anchor, list);
  }

  const ctx: Ctx = { graph, rank, byRank, generation, anchorOf, satellitesOf };

  // Separate families sit side by side, in canonical order, never interleaved.
  const column = new Map<string, number>();
  let offset = 0.5;
  for (const component of connectedComponents(canonical, graph, ctx)) {
    const local = layoutComponent(component, ctx);
    let right = 0;
    for (const [id, x] of local) {
      column.set(id, offset + x);
      right = Math.max(right, x);
    }
    offset += right + 1;
  }

  const nodes = new Map<string, FamilyTreeNode>();
  for (const person of people) {
    nodes.set(person.id, {
      id: person.id,
      generation: generation.get(person.id) ?? 0,
      column: column.get(person.id) ?? 0,
    });
  }

  return { nodes };
}
