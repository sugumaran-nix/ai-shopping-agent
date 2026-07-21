import Hero       from "@/components/landing/Hero";
import StatsBar   from "@/components/landing/StatsBar";
import Features   from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import CTA        from "@/components/landing/CTA";
import Footer     from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </>
  );
}
