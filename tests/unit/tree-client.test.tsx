import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TreeClient } from "@/components/client/TreeClient";
import type { Person, Relationship } from "@/lib/schemas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

// Empty people/relationships short-circuits the fit-to-screen effect (no
// nodes means totalWidth/totalHeight stay 0), so these assert the
// component's own static contract (classes/markup it always renders)
// without needing real layout data or a DOM with real element sizes.
describe("TreeClient", () => {
  it("renders zoom in, zoom out, and reset controls", () => {
    render(
      <TreeClient
        people={[]}
        relationships={[]}
        hint="перетягніть"
        lifespanLabels={{ born: "нар.", died: "пом." }}
      />,
    );
    expect(screen.getByRole("button", { name: "Збільшити" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Зменшити" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Вмістити все дерево" }),
    ).toBeTruthy();
  });

  it("renders the given hint text", () => {
    render(
      <TreeClient
        people={[]}
        relationships={[]}
        hint="перетягніть · колесо для масштабу"
        lifespanLabels={{ born: "нар.", died: "пом." }}
      />,
    );
    expect(
      screen.getByText("перетягніть · колесо для масштабу"),
    ).toBeTruthy();
  });

  it("sizes the chart viewport to fill its flex parent instead of collapsing to content size", () => {
    render(
      <TreeClient
        people={[]}
        relationships={[]}
        hint="перетягніть"
        lifespanLabels={{ born: "нар.", died: "пом." }}
      />,
    );
    const viewport = screen.getByTestId("tree-viewport");
    const canvas = screen.getByTestId("tree-canvas");
    // flex-1 on the outer viewport + absolute inset-0 on the canvas is what
    // makes the tree fill available space instead of its ~300px natural size.
    expect(viewport.className).toContain("flex-1");
    expect(canvas.className).toContain("absolute");
    expect(canvas.className).toContain("inset-0");
  });

  it("does not draw a sibling bracket when common parents already explain the relationship", () => {
    const people: Person[] = [
      { id: "parent", firstName: "Parent" },
      { id: "ivan", firstName: "Ivan" },
      { id: "anatolii", firstName: "Anatolii" },
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "parent-child", person1Id: "parent", person2Id: "ivan" },
      { id: "r2", type: "parent-child", person1Id: "parent", person2Id: "anatolii" },
      { id: "r3", type: "sibling", person1Id: "ivan", person2Id: "anatolii" },
    ];

    render(
      <TreeClient
        people={people}
        relationships={relationships}
        hint="перетягніть"
        lifespanLabels={{ born: "нар.", died: "пом." }}
      />,
    );

    expect(screen.queryByTestId("tree-legend")).toBeNull();
    expect(document.querySelector(".tree-connector-sibling")).toBeNull();
  });

  it("draws one sibling bracket for a transitive group instead of overlapping pair brackets", () => {
    const people: Person[] = [
      { id: "anatolii", firstName: "Anatolii" },
      { id: "ivan", firstName: "Ivan" },
      { id: "vasyl", firstName: "Vasyl" },
    ];
    const relationships: Relationship[] = [
      { id: "r1", type: "sibling", person1Id: "anatolii", person2Id: "ivan" },
      { id: "r2", type: "sibling", person1Id: "ivan", person2Id: "vasyl" },
    ];

    render(
      <TreeClient
        people={people}
        relationships={relationships}
        hint="перетягніть"
        lifespanLabels={{ born: "нар.", died: "пом." }}
      />,
    );

    const siblingConnectors = document.querySelectorAll(".tree-connector-sibling");
    expect(siblingConnectors).toHaveLength(1);
    const cardCenters = people.map((person) => {
      const card = screen.getByRole("link", { name: new RegExp(person.firstName) });
      return Number.parseFloat((card as HTMLElement).style.left) + 78;
    });
    const left = Math.min(...cardCenters);
    const right = Math.max(...cardCenters);
    const middle = cardCenters.find((center) => center !== left && center !== right);
    expect(siblingConnectors[0].getAttribute("d")).toBe(
      `M ${left} 0 V -16 H ${right} V 0 M ${middle} -16 V 0`,
    );
  });
});
