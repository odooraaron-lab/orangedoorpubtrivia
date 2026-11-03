import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { TRIVIA_SOFTWARE_URL } from "@/lib/site";

// The trivia software download: logged-in customers only, logged on their timeline.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", "/portal");
    return NextResponse.redirect(login);
  }
  await logActivity(user.id, "downloaded", { detail: "Trivia software" }).catch(() => {});
  const res = NextResponse.redirect(TRIVIA_SOFTWARE_URL, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
