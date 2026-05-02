import { MarketingNav } from "@/components/marketing/nav";
import { Hero } from "@/components/marketing/hero";
import { Story } from "@/components/marketing/story";
import { FAQ } from "@/components/marketing/faq";
import { CTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function Home() {
  return (
    <main className="relative">
      <MarketingNav />
      <Hero />
      <div id="story">
        <Story />
      </div>
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
