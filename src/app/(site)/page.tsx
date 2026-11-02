import Link from "next/link";
import { Download, FileText, LogIn, Presentation } from "lucide-react";
import { IMAGES, SITE } from "@/lib/site";

// Kept short on purpose: this site is where customers get their game files.
// Edit the wording here; the game's own details live on orangedoormusic.com.
const INCLUDED = [
  {
    icon: Presentation,
    title: "The PowerPoint",
    text: "The quiz itself, ready to run on your venue's screens, round by round.",
  },
  {
    icon: FileText,
    title: "The printables",
    text: "The PDFs for the night: answer sheets for the teams and the host's notes.",
  },
  {
    icon: Download,
    title: "Ready when you are",
    text: "New games appear in your portal as they're released. Log in any time to download them.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="wrap grid items-center gap-10 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={IMAGES.logo}
            alt=""
            width={930}
            height={275}
            className="h-auto w-full max-w-[560px]"
          />
          <h1 className="sr-only">{SITE.name}</h1>
          <p className="marker mt-6 text-[clamp(1.5rem,3.6vw,2.2rem)] leading-tight text-tang">Free entry – great prizes!</p>
          <p className="mt-4 max-w-xl text-lg text-white/90">
            The customer portal for Orange Door Pub Trivia. Log in to download your games: the PowerPoint
            presentation and the printable PDFs for each night.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-orange">
              <LogIn size={18} aria-hidden /> Customer login
            </Link>
            <Link href="/contact-us" className="btn btn-ghost">
              Contact us
            </Link>
          </div>
        </div>
        <figure className="relative mx-auto w-full max-w-[560px] rotate-[1.5deg]">
          <div className="border-[10px] border-white bg-white shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES.triviaNight}
              alt="A packed room of teams at an Orange Door Pub Trivia night"
              width={792}
              height={552}
              className="block h-auto w-full"
            />
          </div>
          <figcaption className="torn-orange absolute -bottom-6 left-6 -rotate-[3deg] px-5 py-2">
            <span className="marker text-lg">Register your team now!</span>
          </figcaption>
        </figure>
      </section>

      <section className="torn-orange mt-24" aria-labelledby="included-heading">
        <div className="wrap py-12">
          <h2 id="included-heading" className="text-[clamp(2rem,4.5vw,2.8rem)] text-black">
            In your portal
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {INCLUDED.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-[var(--radius-card)] bg-black p-6 text-white">
                <Icon size={26} aria-hidden className="text-tang" />
                <h3 className="mt-3 text-xl">{title}</h3>
                <p className="mt-1 text-mist">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap mt-24 text-center" aria-labelledby="more-heading">
        <h2 id="more-heading" className="text-[clamp(1.8rem,4vw,2.4rem)]">
          New to Orange Door Pub Trivia?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-mist">
          Find out how the game works and how to get it running at your venue.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={SITE.infoUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
            About the game
          </a>
          <Link href="/contact-us" className="btn btn-orange">
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
