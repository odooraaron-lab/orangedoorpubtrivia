import { redirect } from "next/navigation";

// There's no public website: the address goes straight to the portal (or its login page).
export default function Home() {
  redirect("/portal");
}
