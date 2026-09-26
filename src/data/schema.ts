// The shapes of the two data files: Chris's export, and the editorial overlay
// that adds what the export does not hold. Validating both at build time is
// what lets the page trust every field it reads.
import { z } from "astro/zod";
import { VERDICT_IDS } from "../reactions.ts";

const webAddress = z.url({ protocol: /^https?$/ });

const vocabularyEntry = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  description: z.string().optional(),
});

export const rawEventSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "ids are lowercase words joined by hyphens"),
  date: z.string().min(1),
  year: z.object({
    start: z.number().int(),
    end: z.number().int().nullable(),
    approximate: z.boolean(),
    openEnded: z.boolean(),
  }),
  title: z.string().min(1),
  titleMarkdown: z.string().min(1),
  kind: z.string().min(1),
  reactions: z.array(z.string()).min(1),
  regions: z.array(z.string()).min(1),
  themes: z.array(z.string()).min(1),
  description: z.string().min(1),
  descriptionMarkdown: z.string().min(1),
  // The export writes null for an event with no source yet.
  source: webAddress.nullable(),
});

export const rawExportSchema = z.object({
  eventCount: z.number().int(),
  vocabularies: z.object({
    kinds: z.array(vocabularyEntry).min(1),
    reactions: z.array(vocabularyEntry).min(1),
    regions: z.array(vocabularyEntry).min(1),
    themes: z.array(vocabularyEntry).min(1),
  }),
  events: z.array(rawEventSchema),
});

export const editorialSchema = z.object({
  /** The events shown as highlight cards. Everything else is a row. */
  featured: z.array(z.string()).default([]),
  events: z
    .record(
      z.string(),
      z.strictObject({
        verdict: z.enum(VERDICT_IDS).optional(),
        /** Added after the export's own source. */
        sources: z.array(webAddress).optional(),
        /** Replaces the export's title. Markdown, like the export's. */
        title: z.string().min(1).optional(),
        /** Replaces the export's description. Markdown, like the export's. */
        body: z.string().min(1).optional(),
        /** Why a year in the title is part of a name, which quiets the year-in-title warning. */
        allowYearInTitle: z.string().min(1).optional(),
      }),
    )
    .default({}),
  /** A one-line caption for each change of era, keyed "from-to" by era id, such as "print-industrial". Markdown. */
  seams: z.record(z.string(), z.string().min(1)).default({}),
});

export type RawEvent = z.infer<typeof rawEventSchema>;
export type RawExport = z.infer<typeof rawExportSchema>;
export type Editorial = z.infer<typeof editorialSchema>;
export type Vocabulary = z.infer<typeof vocabularyEntry>;
