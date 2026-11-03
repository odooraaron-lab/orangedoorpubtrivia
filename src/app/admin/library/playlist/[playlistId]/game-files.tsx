"use client";

import { useState } from "react";
import { FileText, Plus, Presentation, X } from "lucide-react";

type Saved = { id: string; title: string; externalUrl: string; fileName: string };
type Row = { key: string; id: string; title: string; url: string };

const ZOHO_PLACEHOLDER = "https://workdrive.zohopublic.com.au/external/…";
let nextKey = 0;
const blank = (): Row => ({ key: `new-${nextKey++}`, id: "", title: "", url: "" });

/**
 * The link boxes for a game: one PowerPoint, and as many PDFs as it needs (add a row with
 * "Add another PDF", take one off with its ×). Sits inside the save form; the rows are sent
 * as pdfId / pdfTitle / pdfUrl in order.
 */
export function GameFilesEditor({
  pdfs,
  presentation,
  maxPdfs,
}: {
  pdfs: Saved[];
  presentation: Saved | null;
  maxPdfs: number;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const saved = pdfs.map((f) => ({ key: f.id, id: f.id, title: f.title, url: f.externalUrl }));
    // A new game starts with three empty PDF boxes: most games have about three.
    return saved.length ? saved : [blank(), blank(), blank()];
  });

  const update = (key: string, change: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const remove = (key: string) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [blank()]));

  return (
    <div className="grid gap-7">
      <fieldset className="grid gap-3">
        <legend className="mb-2 flex items-center gap-2 font-sans text-base font-bold">
          <Presentation size={18} aria-hidden className="text-tang" /> PowerPoint presentation
        </legend>
        {presentation && <input type="hidden" name="pptId" value={presentation.id} />}
        <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
          <div>
            <label htmlFor="pptTitle" className="sr-only">
              Button name for the PowerPoint
            </label>
            <input
              id="pptTitle"
              name="pptTitle"
              className="field"
              placeholder="Name (optional)"
              defaultValue={presentation?.title ?? ""}
            />
          </div>
          <div>
            <label htmlFor="pptUrl" className="sr-only">
              PowerPoint link
            </label>
            <input
              id="pptUrl"
              name="pptUrl"
              type="url"
              className="field"
              placeholder={ZOHO_PLACEHOLDER}
              defaultValue={presentation?.externalUrl ?? ""}
            />
          </div>
        </div>
        <p className="hint !mt-0">
          <FileNameNote saved={presentation} fallback="The .pptx file that runs the quiz on the screen." />
        </p>
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-2 flex items-center gap-2 font-sans text-base font-bold">
          <FileText size={18} aria-hidden className="text-tang" /> PDF files
        </legend>
        <ol className="grid gap-3">
          {rows.map((r, i) => (
            <li key={r.key} className="grid gap-2 rounded-xl border border-line bg-ink/60 p-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-center">
              <input type="hidden" name="pdfId" value={r.id} />
              <div>
                <label htmlFor={`pdfTitle-${r.key}`} className="sr-only">
                  Name for PDF {i + 1}
                </label>
                <input
                  id={`pdfTitle-${r.key}`}
                  name="pdfTitle"
                  className="field"
                  placeholder={`PDF ${i + 1} name (optional)`}
                  value={r.title}
                  onChange={(e) => update(r.key, { title: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`pdfUrl-${r.key}`} className="sr-only">
                  Link for PDF {i + 1}
                </label>
                <input
                  id={`pdfUrl-${r.key}`}
                  name="pdfUrl"
                  type="url"
                  className="field"
                  placeholder={ZOHO_PLACEHOLDER}
                  value={r.url}
                  onChange={(e) => update(r.key, { url: e.target.value })}
                />
              </div>
              <p className="hint !mt-0 sm:col-span-3">
                <FileNameNote saved={pdfs.find((f) => f.id === r.id && f.externalUrl === r.url) ?? null} fallback="" />
              </p>
              <button
                type="button"
                className="btn btn-quiet justify-self-end px-2 sm:col-start-3 sm:row-start-1"
                onClick={() => remove(r.key)}
                aria-label={`Remove PDF ${i + 1}`}
                title="Remove this PDF"
              >
                <X size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        {rows.length < maxPdfs && (
          <button type="button" className="btn btn-ghost btn-sm justify-self-start" onClick={() => setRows((rs) => [...rs, blank()])}>
            <Plus size={16} aria-hidden /> Add another PDF
          </button>
        )}
        <p className="hint !mt-0">
          E.g. answer sheets, host sheet and scoresheet. Leave the name blank to use the file&apos;s name from Zoho.
          Customers see them in this order.
        </p>
      </fieldset>
    </div>
  );
}

/** Under a saved link: the file name Zoho gave us, or a note that we couldn't read it. */
function FileNameNote({ saved, fallback }: { saved: Saved | null; fallback: string }) {
  if (!saved) return <>{fallback}</>;
  if (saved.fileName) {
    return (
      <>
        File: <span className="text-white">{saved.fileName}</span>
      </>
    );
  }
  return (
    <span className="text-tang">
      Zoho didn&apos;t tell us this file&apos;s name when we checked the link, so we couldn&apos;t confirm it&apos;s the
      right file. Customers can still download it. Press Save game files to check it again.
    </span>
  );
}
