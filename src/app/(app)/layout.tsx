import { Sidebar, MobileBottomNav } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { AuthGate } from "@/components/app/auth-gate";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <AuthGate>
          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12 md:pt-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </AuthGate>
      </div>
      <MobileBottomNav />
    </div>
  );
}
