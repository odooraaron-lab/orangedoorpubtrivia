import { File, FileText, Presentation } from "lucide-react";
import type { FileKind } from "@/db/schema";

const ICONS = { pdf: FileText, presentation: Presentation, other: File } as const;

const TONES: Record<FileKind, string> = {
  pdf: "bg-white/10 text-paper",
  presentation: "bg-tang/20 text-tang",
  other: "bg-white/10 text-mist",
};

export function FileIcon({ kind, size = 22 }: { kind: FileKind; size?: number }) {
  const Icon = ICONS[kind] ?? File;
  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONES[kind] ?? TONES.other}`} aria-hidden>
      <Icon size={size} />
    </span>
  );
}
