import ParticleBackground from "@/components/ParticleBackground";
import Hero from "@/components/Hero";
import JobQueue from "@/components/JobQueue";
import FreeTokenCounter from "@/components/FreeTokenCounter";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 pt-20">
        <Hero />
        
        {/* Free Token Counter */}
        <FreeTokenCounter />
        
        {/* Job Queue Section */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <JobQueue />
        </div>
      </div>
    </div>
  );
};

export default Index;

