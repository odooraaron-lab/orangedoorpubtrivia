import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get in touch with Orange Door Pub Trivia: questions about your games, your login, or adding trivia to your venue.",
};

export default function ContactPage() {
  return (
    <div className="wrap grid gap-12 pt-14 md:pt-20 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <h1 className="text-[clamp(2.6rem,6vw,4.2rem)] text-tang">Contact us</h1>
        <p className="mt-4 max-w-md text-lg text-white/90">
          Questions about your games or your login? Want to run Orange Door Pub Trivia at your venue? Send us a message.
        </p>
        <div className="panel mt-10 max-w-md p-6">
          <h2 className="font-sans text-lg font-bold">Already a customer?</h2>
          <p className="mt-1 text-mist">Log in to download your trivia PowerPoint and PDFs.</p>
          <Link href="/login" className="btn btn-ghost btn-sm mt-4">
            Customer login
          </Link>
        </div>
        <ul className="mt-8 flex gap-5 text-mist">
          {SITE.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-white hover:underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className="panel relative p-6 sm:p-9">
        <ContactForm />
      </div>
    </div>
  );
}
