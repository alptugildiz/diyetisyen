import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import ToolsPromo from "@/components/ToolsPromo";
import BlogPromo from "@/components/BlogPromo";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Hero />
        <About />
        <Services />
        <ToolsPromo />
        <BlogPromo />
      </main>
      <Footer />
    </>
  );
}
