import type { Person, Relationship } from "@/lib/schemas";

export type FamilyChartDatum = {
  id: string;
  data: {
    gender: "M" | "F";
    firstName: string;
    lastName: string;
    birthDate: string;
    deathDate?: string;
    avatar?: string;
  };
  rels: {
    parents: string[];
    spouses: string[];
    children: string[];
  };
};

export function toFamilyChartData(
  people: Person[],
  relationships: Relationship[],
): FamilyChartDatum[] {
  return people.map((person) => {
    const parents = relationships
      .filter((rel) => rel.type === "parent-child" && rel.person2Id === person.id)
      .map((rel) => rel.person1Id);

    const children = relationships
      .filter((rel) => rel.type === "parent-child" && rel.person1Id === person.id)
      .map((rel) => rel.person2Id);

    const spouses = relationships
      .filter((rel) => rel.type === "spouse" && (rel.person1Id === person.id || rel.person2Id === person.id))
      .map((rel) => (rel.person1Id === person.id ? rel.person2Id : rel.person1Id));

    return {
      id: person.id,
      data: {
        // family-chart requires a gender field for its own internal defaults;
        // it is never read since we fully override card rendering.
        gender: "M",
        firstName: person.firstName,
        lastName: person.lastName,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        avatar: person.avatar,
      },
      rels: { parents, spouses, children },
    };
  });
}
