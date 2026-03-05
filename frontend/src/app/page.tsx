import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import BlogPromo from "@/components/BlogPromo";
import ToolsPromo from "@/components/ToolsPromo";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Hero />
        <About />
        <Services />
        <BlogPromo />
        <ToolsPromo />
      </main>
      <Footer />
    </>
  );
}
