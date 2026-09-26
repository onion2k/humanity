// Turns the export and the editorial overlay into the timeline the page draws:
// every event once, in order, with its era, vocabulary ids, rendered copy and
// editorial fields. It never throws on bad data. It names each problem as an
// error (the build stops) or a warning (publishing stops), so one run shows
// everything wrong at once.
import { ERAS, eraForYear, type EraId } from "../eras.ts";
import { REACTION_IDS, isReactionId, type ReactionId, type VerdictId } from "../reactions.ts";
import { renderInline, type Rendered } from "./markdown.ts";
import { editorialSchema, rawExportSchema, type RawEvent, type Vocabulary } from "./schema.ts";

export interface TimelineEvent {
  id: string;
  era: EraId;
  /** The date as written for display, such as "c. 1000" or "1830s onwards". */
  date: string;
  year: { start: number; end: number | null; approximate: boolean; openEnded: boolean };
  title: string;
  titleHtml: string;
  body: string;
  bodyHtml: string;
  kind: string;
  /** The first is the main reaction, which picks the mark on the spine. */
  reactions: ReactionId[];
  regions: string[];
  themes: string[];
  verdict?: VerdictId;
  featured: boolean;
  sources: string[];
}

export interface VocabularyItem {
  id: string;
  label: string;
}

export interface Vocabularies {
  kinds: VocabularyItem[];
  reactions: VocabularyItem[];
  regions: VocabularyItem[];
  themes: VocabularyItem[];
}

export interface Issue {
  level: "error" | "warning";
  code: string;
  id?: string;
  message: string;
}

/** The change from one era to the next, and the line of copy it shows. */
export interface SeamText {
  key: string;
  from: EraId;
  to: EraId;
  caption?: Rendered;
}

export interface Timeline {
  events: TimelineEvent[];
  seams: SeamText[];
  vocabularies: Vocabularies;
  issues: Issue[];
}

const EMPTY_VOCABULARIES: Vocabularies = { kinds: [], reactions: [], regions: [], themes: [] };

/** A year written into a title: a four-digit year from 1000 to 2099, or any year with BC or AD. */
const YEAR_IN_TITLE = /\b(?:1\d{3}|20\d{2})s?\b|\b\d{1,4}\s*(?:BC|BCE|AD|CE)\b|\b(?:AD|CE)\s*\d{1,4}\b/;

function schemaIssues(file: string, error: { issues: { path: PropertyKey[]; message: string }[] }): Issue[] {
  return error.issues.map((issue) => ({
    level: "error",
    code: "schema",
    message: `${file} at ${issue.path.map(String).join(".") || "top level"}: ${issue.message}`,
  }));
}

function labelMap(entries: Vocabulary[]): Map<string, string> {
  return new Map(entries.map((e) => [e.label, e.id]));
}

export function buildTimeline(rawInput: unknown, editorialInput: unknown): Timeline {
  const raw = rawExportSchema.safeParse(rawInput);
  const editorial = editorialSchema.safeParse(editorialInput);
  const issues: Issue[] = [];
  if (!raw.success) issues.push(...schemaIssues("panic-and-wonder.json", raw.error));
  if (!editorial.success) issues.push(...schemaIssues("editorial.json", editorial.error));
  if (!raw.success || !editorial.success) return { events: [], seams: [], vocabularies: EMPTY_VOCABULARIES, issues };

  const { vocabularies, events: rawEvents, eventCount } = raw.data;
  const { featured, events: notes, seams: captions } = editorial.data;

  const error = (code: string, message: string, id?: string): void => {
    issues.push(id === undefined ? { level: "error", code, message } : { level: "error", code, id, message });
  };
  const warn = (code: string, id: string, message: string): void => {
    issues.push({ level: "warning", code, id, message });
  };

  if (eventCount !== rawEvents.length) {
    error("count-mismatch", `The export says it has ${eventCount} events but holds ${rawEvents.length}`);
  }
  for (const reaction of vocabularies.reactions) {
    if (!isReactionId(reaction.id)) {
      error(
        "reaction-without-shape",
        `The export's reaction "${reaction.id}" has no shape yet. Known: ${REACTION_IDS.join(", ")}`,
      );
    }
  }

  const exportIds = new Set(rawEvents.map((e) => e.id));
  const seenFeatured = new Set<string>();
  for (const id of featured) {
    if (seenFeatured.has(id)) error("editorial-duplicate", `"${id}" is featured twice`, id);
    seenFeatured.add(id);
  }
  for (const id of [...featured, ...Object.keys(notes)]) {
    if (!exportIds.has(id)) error("editorial-unknown-id", `editorial.json names "${id}", which is not in the export`, id);
  }

  const maps = {
    kind: labelMap(vocabularies.kinds),
    reaction: labelMap(vocabularies.reactions),
    region: labelMap(vocabularies.regions),
    theme: labelMap(vocabularies.themes),
  };
  const toIds = (kind: keyof typeof maps, labels: string[], id: string): string[] =>
    labels.flatMap((label) => {
      const found = maps[kind].get(label);
      if (found === undefined) {
        error(`unknown-${kind}`, `"${label}" is not a ${kind} in the export's vocabularies`, id);
        return [];
      }
      return [found];
    });

  const render = (source: string, plain: string | undefined, id: string, field: string): Rendered => {
    try {
      const rendered = renderInline(source);
      if (plain !== undefined && rendered.text !== plain) {
        error("markdown-mismatch", `The ${field} markdown reads "${rendered.text}" but the plain text is "${plain}"`, id);
      }
      return rendered;
    } catch (e) {
      error("markdown", `The ${field}: ${e instanceof Error ? e.message : String(e)}`, id);
      return { html: "", text: plain ?? source };
    }
  };

  const seenIds = new Set<string>();
  const built = rawEvents.map((e: RawEvent): TimelineEvent => {
    if (seenIds.has(e.id)) error("duplicate-id", `The id "${e.id}" is used twice`, e.id);
    seenIds.add(e.id);
    if (e.year.end !== null && e.year.end < e.year.start) {
      error("year-range", `Ends in ${e.year.end}, before it starts in ${e.year.start}`, e.id);
    }

    const note = notes[e.id] ?? {};
    const title = note.title === undefined ? render(e.titleMarkdown, e.title, e.id, "title") : render(note.title, undefined, e.id, "title");
    const body =
      note.body === undefined
        ? render(e.descriptionMarkdown, e.description, e.id, "description")
        : render(note.body, undefined, e.id, "body");
    const sources = [...new Set([...(e.source === null ? [] : [e.source]), ...(note.sources ?? [])])];

    const [kind = ""] = toIds("kind", [e.kind], e.id);
    const reactions = toIds("reaction", e.reactions, e.id).filter(isReactionId);

    if (sources.length === 0) warn("no-sources", e.id, `"${title.text}" has no sources`);
    const titleOutsideWorks = (note.title ?? e.titleMarkdown).replace(/\*[^*]*\*/g, "");
    if (note.allowYearInTitle === undefined && YEAR_IN_TITLE.test(titleOutsideWorks)) {
      warn("year-in-title", e.id, `"${title.text}" has a year in its title; the date field carries it`);
    }

    const event: TimelineEvent = {
      id: e.id,
      era: eraForYear(e.year.start).id,
      date: e.date,
      year: e.year,
      title: title.text,
      titleHtml: title.html,
      body: body.text,
      bodyHtml: body.html,
      kind,
      reactions,
      regions: toIds("region", e.regions, e.id),
      themes: toIds("theme", e.themes, e.id),
      featured: seenFeatured.has(e.id),
      sources,
    };
    if (note.verdict !== undefined) event.verdict = note.verdict;
    return event;
  });

  const seams = ERAS.slice(0, -1).flatMap((era, i): SeamText[] => {
    const next = ERAS[i + 1];
    if (!next) return [];
    const key = `${era.id}-${next.id}`;
    const source = captions[key];
    if (source === undefined) {
      warn("no-caption", key, `The change from ${era.name} to ${next.name} has no caption`);
      return [{ key, from: era.id, to: next.id }];
    }
    return [{ key, from: era.id, to: next.id, caption: render(source, undefined, key, "caption") }];
  });
  const seamKeys = new Set(seams.map((seam) => seam.key));
  for (const key of Object.keys(captions)) {
    if (!seamKeys.has(key)) {
      error("editorial-unknown-seam", `editorial.json has a caption for "${key}", which is not a change between neighbouring eras`, key);
    }
  }

  // Array.prototype.sort is stable, so events that start in the same year keep the export's order.
  built.sort((a, b) => a.year.start - b.year.start);

  const vocab = (entries: Vocabulary[]): VocabularyItem[] => entries.map(({ id, label }) => ({ id, label }));
  return {
    events: built,
    seams,
    vocabularies: {
      kinds: vocab(vocabularies.kinds),
      reactions: vocab(vocabularies.reactions),
      regions: vocab(vocabularies.regions),
      themes: vocab(vocabularies.themes),
    },
    issues,
  };
}
