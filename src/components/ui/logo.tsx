import { cn } from "@/lib/utils";

export function Logo({
  className,
  showText = true,
  size = 28,
}: {
  className?: string;
  showText?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative grid place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[60%] w-[60%]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 18 12 4l8 14"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 14h8"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showText && (
        <span className="text-base font-semibold tracking-tight">
          AIUB <span className="gradient-text">Live</span>
        </span>
      )}
    </div>
  );
}
