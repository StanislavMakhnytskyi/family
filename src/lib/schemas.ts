import { z } from "zod";

export const personSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  birthDate: z.string().min(1),
  deathDate: z.string().optional(),
  bio: z.array(z.string().min(1)).optional(),
  avatar: z.string().optional(),
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

export const mediaSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  url: z.string().min(1),
  caption: z.string().optional(),
  type: z.enum(["photo", "document"]),
  year: z.number().int().optional(),
});
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
