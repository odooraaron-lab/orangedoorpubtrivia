import type { FileKind } from "@/db/schema";

export function formatBytes(bytes: number | null | undefined) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}

const dateFormat = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Pacific/Auckland",
});

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "";
  return dateFormat.format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  return dateTimeFormat.format(typeof d === "string" ? new Date(d) : d);
}

const timeFormat = new Intl.DateTimeFormat("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: "Pacific/Auckland" });
const dayFormat = new Intl.DateTimeFormat("en-NZ", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

/** "3:05 pm", NZ time. */
export function formatTime(d: Date) {
  return timeFormat.format(d);
}

/** "Tuesday, 20 October 2026", NZ time. */
export function formatDay(d: Date) {
  return dayFormat.format(d);
}

/** yyyy-mm-dd for <input type="date">, in NZ time. */
export function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(d);
}

export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

export const FILE_KINDS: { value: FileKind; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "presentation", label: "PowerPoint" },
  { value: "other", label: "File" },
];

export function kindLabel(kind: FileKind) {
  return FILE_KINDS.find((k) => k.value === kind)?.label ?? "File";
}

/** "Week 12 - Answer Sheet.pdf" -> "Week 12 - Answer Sheet" */
export function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_]+/g, " ").trim() || fileName;
}

/** Turn share links into direct-download links where we know how. */
export function directDownloadUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("dropbox.com")) {
      u.searchParams.delete("dl");
      u.searchParams.set("dl", "1");
      return u.toString();
    }
    if (u.hostname === "drive.google.com") {
      const match = u.pathname.match(/\/file\/d\/([^/]+)/);
      const id = match?.[1] ?? u.searchParams.get("id");
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }
    if (isZohoPublicHost(u.hostname)) {
      // Public share link: https://workdrive.zohopublic.com.au/external/<id>
      const share = u.pathname.match(/^\/external\/([^/]+)/);
      if (share) {
        const direct = new URL(`${u.origin}/external/${share[1]}/download`);
        direct.searchParams.set("directDownload", "true");
        return direct.toString();
      }
      u.searchParams.set("directDownload", "true");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function isZohoPublicHost(host: string) {
  return /(^|\.)zohopublic\.[a-z.]+$/.test(host) || /(^|\.)zohoexternal\.[a-z.]+$/.test(host);
}

/** Explains why a pasted link won't work for customers, or returns null if it looks fine. */
export function linkProblem(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "Paste the full link, starting with https://";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "Paste the full link, starting with https://";
  if (/^workdrive\.zoho\.[a-z.]+$/.test(u.hostname)) {
    return "That's a private WorkDrive link that only you can open. In WorkDrive, right-click the file, choose Share → External share link, allow downloads, and paste that link instead.";
  }
  return null;
}
