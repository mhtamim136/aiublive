import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-background px-4">
      <div className="aurora opacity-50" aria-hidden />
      <div className="absolute inset-0 dotted-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        <div className="mb-8">
          <Logo size={36} />
        </div>
        <p className="font-display text-7xl font-bold tracking-tighter">
          <span className="gradient-text">404</span>
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          This corner of campus doesn't exist.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The page you're looking for moved, was renamed, or was never built.
          Try the dashboard or discover.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          <Link href="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
          <Link href="/discover">
            <Button variant="outline" leftIcon={<Compass className="h-4 w-4" />}>
              Discover
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
