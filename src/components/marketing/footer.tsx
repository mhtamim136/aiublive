import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="container py-10">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <Link
            href="/"
            className="flex items-center"
            aria-label="AIUB Live home"
          >
            <Logo />
          </Link>

          <p className="max-w-md text-xs text-muted-foreground">
            AIUB Live is an independent student project. Not affiliated with,
            endorsed by, or operated by American International
            University-Bangladesh.
          </p>

          <div className="flex items-center gap-4 text-xs">
            <Link
              href="#story"
              className="text-muted-foreground hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#faq"
              className="text-muted-foreground hover:text-foreground"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="font-medium text-foreground hover:text-primary"
            >
              Get started →
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Made with care for AIUB students · © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
