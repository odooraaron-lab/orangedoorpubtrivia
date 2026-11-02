import type { FileKind } from "@/db/schema";

/**
 * What a trivia game is made of: a handful of printable PDFs (answer sheets, host notes,
 * scoresheets...) and the PowerPoint presentation that runs the quiz on the screen.
 * Each is a Zoho WorkDrive external share link.
 */
export const MAX_PDFS = 12;

export type GameFile = { id: string; kind: FileKind; title: string; externalUrl: string };

/** The game's PDFs (in order) and its PowerPoint. */
export function splitGameFiles<T extends { kind: FileKind }>(files: T[]) {
  return {
    pdfs: files.filter((f) => f.kind !== "presentation"),
    presentation: files.find((f) => f.kind === "presentation") ?? null,
  };
}
