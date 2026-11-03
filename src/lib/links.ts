import "server-only";

const USER_AGENT = "Mozilla/5.0 (compatible; OrangeDoorPubTriviaPortal/1.0)";

export type LinkCheck = {
  reachable: boolean;
  /** The link opened a web page rather than a file (e.g. a folder was shared, or downloads are off). */
  isHtml: boolean;
  isPdf: boolean;
  /** A PowerPoint (.pptx is a zip; we go by its name and type). */
  isPresentation: boolean;
  fileName: string | null;
  size: number | null;
  /** The type the link says it is, e.g. "application/pdf". */
  contentType: string;
};

function fileNameFrom(disposition: string | null) {
  if (!disposition) return null;
  const star = disposition.match(/filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)/);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

type Probe = { res: Response; head: Buffer };

/** Fetches the start of a link (optionally asking for just the first 4 KB) and stops reading. */
async function probe(url: string, ranged: boolean, timeoutMs: number): Promise<Probe | null> {
  try {
    const res = await fetch(url, {
      headers: {
        ...(ranged ? { Range: "bytes=0-4095" } : {}),
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "identity",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    let head = Buffer.alloc(0);
    if (res.body) {
      const reader = res.body.getReader();
      while (head.length < 4096) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        head = Buffer.concat([head, Buffer.from(value)]);
      }
      await reader.cancel().catch(() => {});
    }
    return { res, head };
  } catch {
    return null;
  }
}

/** A file name at the end of the link's final address, e.g. ".../GQW369.pptx". */
function fileNameFromUrl(url: string) {
  try {
    const last = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
    return /\.[a-z0-9]{2,5}$/i.test(last) ? last : null;
  } catch {
    return null;
  }
}

/**
 * Fetches the first few KB of a link to see what customers will get:
 * a real file (its name and size) or a web page.
 *
 * Zoho sometimes answers slowly (big PowerPoints especially) or leaves out the file name
 * when only part of the file is asked for, so if the first try doesn't give us a name,
 * it tries again asking for the file normally, with longer to answer.
 */
export async function checkLink(url: string): Promise<LinkCheck> {
  const empty: LinkCheck = {
    reachable: false,
    isHtml: false,
    isPdf: false,
    isPresentation: false,
    fileName: null,
    size: null,
    contentType: "",
  };

  let got = await probe(url, true, 15_000);
  if (!got || !fileNameFrom(got.res.headers.get("content-disposition"))) {
    const second = await probe(url, false, 25_000);
    if (second && (fileNameFrom(second.res.headers.get("content-disposition")) || !got)) got = second;
  }
  if (!got) return empty;
  const { res, head } = got;

  const type = (res.headers.get("content-type") ?? "").toLowerCase();
  const range = res.headers.get("content-range")?.match(/\/(\d+)$/);
  const length = res.status === 200 ? Number(res.headers.get("content-length")) : NaN;
  const size = range ? Number(range[1]) : Number.isFinite(length) && length > 0 ? length : null;
  const fileName = fileNameFrom(res.headers.get("content-disposition")) ?? fileNameFromUrl(res.url);
  const isHtml = type.includes("text/html") || /<!doctype html|<html[\s>]/i.test(head.subarray(0, 2048).toString("latin1"));
  const isZip = head.subarray(0, 2).toString("latin1") === "PK";
  return {
    reachable: true,
    isHtml,
    isPdf: type.includes("pdf") || head.subarray(0, 1024).includes("%PDF-"),
    isPresentation:
      type.includes("presentation") ||
      type.includes("powerpoint") ||
      /\.(pptx?|ppsx?|potx)$/i.test(fileName ?? "") ||
      (isZip && !type.includes("pdf")),
    fileName,
    size,
    contentType: type.split(";")[0].trim(),
  };
}
