import { z } from "zod";

// Avatars are stored as two resolutions: a small one for the tree/relative
// cards, a larger one for the person detail hero. Older data may still have
// a single `avatar: string` (one resolution used everywhere) -- normalize
// that into the same shape on read rather than forcing a data migration.
const avatarSchema = z
  .union([
    z.string().min(1).transform((url) => ({ small: url, large: url })),
    z.object({ small: z.string().min(1), large: z.string().min(1) }),
  ])
  .optional();
export type Avatar = { small: string; large: string };

export const personSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  birthDate: z.string().optional(),
  deathDate: z.string().optional(),
  bio: z.array(z.string().min(1)).optional(),
  avatar: avatarSchema,
});
export type Person = z.infer<typeof personSchema>;
export const peopleSchema = z.array(personSchema);

export const relationshipSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["parent-child", "spouse"]),
  person1Id: z.string().min(1),
  person2Id: z.string().min(1),
});
export type Relationship = z.infer<typeof relationshipSchema>;
export const relationshipsSchema = z.array(relationshipSchema);

export const graveSchema = z.object({
  personId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  description: z.string().optional(),
});
export type Grave = z.infer<typeof graveSchema>;
export const gravesSchema = z.array(graveSchema);

// A photo can show several family members, so a media item is tagged with
// one or more people rather than exactly one. Older data may still have a
// single `personId: string` -- normalize that into `personIds: [personId]`
// before validating, rather than forcing a data migration.
function normalizeMediaPersonIds(raw: unknown): unknown {
  if (
    raw &&
    typeof raw === "object" &&
    !("personIds" in raw) &&
    "personId" in raw &&
    typeof (raw as { personId: unknown }).personId === "string"
  ) {
    const { personId, ...rest } = raw as { personId: string };
    return { ...rest, personIds: [personId] };
  }
  return raw;
}

export const mediaSchema = z.preprocess(
  normalizeMediaPersonIds,
  z.object({
    id: z.string().min(1),
    personIds: z.array(z.string().min(1)).min(1),
    url: z.string().min(1),
    caption: z.string().optional(),
    type: z.enum(["photo", "document"]),
    year: z.number().int().optional(),
  }),
);
export type Media = z.infer<typeof mediaSchema>;
export const mediaListSchema = z.array(mediaSchema);

export const questionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  normalizedAnswer: z.string().min(1),
  variants: z.array(z.string().min(1)).optional(),
});
export type Question = z.infer<typeof questionSchema>;
export const questionsSchema = z.array(questionSchema);
