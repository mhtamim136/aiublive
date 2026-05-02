import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome to AIUB Live · Set up your profile",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
