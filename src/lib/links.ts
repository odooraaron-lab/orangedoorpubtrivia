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

/**
 * Fetches the first few KB of a link to see what customers will get:
 * a real file (its name and size) or a web page.
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
  try {
    const res = await fetch(url, {
      headers: { Range: "bytes=0-4095", "User-Agent": USER_AGENT, "Accept-Encoding": "identity" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return empty;

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

    const type = (res.headers.get("content-type") ?? "").toLowerCase();
    const range = res.headers.get("content-range")?.match(/\/(\d+)$/);
    const length = res.status === 200 ? Number(res.headers.get("content-length")) : NaN;
    const size = range ? Number(range[1]) : Number.isFinite(length) && length > 0 ? length : null;
    const fileName = fileNameFrom(res.headers.get("content-disposition"));
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
        (isZip && /\.pptx$/i.test(fileName ?? "")),
      fileName,
      size,
      contentType: type.split(";")[0].trim(),
    };
  } catch {
    return empty;
  }
}
