"use server";

import { requireAdmin } from "@/lib/auth";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { emailFrom, sendEmailWithResult } from "@/lib/email";

/** Sends a test email to the admin who pressed the button, and says exactly what's wrong if it can't. */
export async function sendTestEmail(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const result = await sendEmailWithResult({
    to: admin.email,
    subject: "Test email from Orange Door Pub Trivia",
    text: [
      "This is a test from the admin overview.",
      "",
      `Password resets and customer invites are sent from ${emailFrom()}.`,
    ].join("\n"),
  });
  if (result.ok) return ok(`Sent to ${admin.email}. If it isn't in your inbox in a minute or two, check your spam folder.`);
  return fail([result.problem, result.detail].filter(Boolean).join("\n\n"));
}
