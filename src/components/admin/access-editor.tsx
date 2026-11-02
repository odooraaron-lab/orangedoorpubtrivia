"use client";

import { useState } from "react";

type Game = { id: string; name: string; isPublished: boolean };

/** Everything (including games added later), or a pick of single games. */
export function AccessEditor({
  games,
  initialAll,
  initialPlaylists,
}: {
  games: Game[];
  initialAll: boolean;
  initialPlaylists: string[];
}) {
  const [all, setAll] = useState(initialAll);
  const [picked, setPicked] = useState(() => new Set(initialPlaylists));

  const toggle = (id: string, on: boolean) =>
    setPicked((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <div className="grid gap-4">
      <label className="check rounded-xl border border-line bg-ink/60 p-4">
        <input type="checkbox" name="accessAll" checked={all} onChange={(e) => setAll(e.target.checked)} />
        <span>
          <span className="block font-semibold">Every game</span>
          <span className="block text-sm text-mist">Includes games you add later.</span>
        </span>
      </label>

      {!all && (
        <>
          <p className="text-sm text-mist">Or choose single games ({picked.size} chosen).</p>
          {games.length === 0 && <p className="text-mist">Add some games to the library first.</p>}
          {games.length > 0 && (
            <ul className="grid gap-1 rounded-xl border border-line bg-ink/60 p-3 sm:grid-cols-2">
              {games.map((g) => (
                <li key={g.id}>
                  <label className="check rounded-lg px-2 py-1.5">
                    <input
                      type="checkbox"
                      name="playlist"
                      value={g.id}
                      checked={picked.has(g.id)}
                      onChange={(e) => toggle(g.id, e.target.checked)}
                    />
                    <span>
                      {g.name}
                      {!g.isPublished && <span className="tag ml-2">Hidden</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
