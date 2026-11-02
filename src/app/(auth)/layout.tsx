import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="wrap flex items-center justify-center py-6 sm:py-8">
        <Logo href="/login" className="w-[220px]" />
      </header>
      <main id="content" className="wrap flex flex-1 items-start justify-center pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
