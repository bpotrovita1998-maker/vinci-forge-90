import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Film, Box, GraduationCap, Gamepad2, Printer, Glasses, Home, ChevronRight, Play, Zap, Layers, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AdBanner from "@/components/AdBanner";
import { useSubscription } from "@/hooks/useSubscription";
const useCategories = [
  { id: "film", label: "Film Production", icon: Film, color: "from-pink-500 to-rose-600" },
  { id: "product", label: "Product Design", icon: Box, color: "from-cyan-500 to-blue-600" },
  { id: "education", label: "Education", icon: GraduationCap, color: "from-emerald-500 to-green-600" },
  { id: "game", label: "Game Development", icon: Gamepad2, color: "from-violet-500 to-purple-600" },
  { id: "printing", label: "3D Printing", icon: Printer, color: "from-blue-500 to-indigo-600" },
  { id: "vr", label: "VR/AR", icon: Glasses, color: "from-fuchsia-500 to-pink-600" },
  { id: "interior", label: "Interior Design", icon: Home, color: "from-amber-500 to-orange-600" },
];

const categoryDetails: Record<string, { title: string; description: string; features: string[] }> = {
  film: {
    title: "Film Production",
    description: "Create stunning 3D assets for your films, animations, and visual effects projects. From characters to environments, bring your creative vision to life.",
    features: ["Character modeling", "Environment design", "Props & assets", "Animation-ready models"],
  },
  product: {
    title: "Product Design",
    description: "Rapidly prototype and visualize product concepts with AI-powered 3D generation. Perfect for designers and engineers.",
    features: ["Rapid prototyping", "Photorealistic renders", "CAD-ready exports", "Design iterations"],
  },
  education: {
    title: "Education",
    description: "Transform learning with interactive 3D models. Create educational content that engages students across all subjects.",
    features: ["Interactive models", "Scientific visualizations", "Historical recreations", "Anatomy models"],
  },
  game: {
    title: "Game Development",
    description: "Accelerate game asset creation with AI. Generate characters, props, and environments that are ready for your game engine.",
    features: ["Game-ready assets", "LOD generation", "Texture mapping", "PBR materials"],
  },
  printing: {
    title: "3D Printing",
    description: "Generate print-ready 3D models instantly. Perfect for hobbyists, makers, and manufacturing professionals.",
    features: ["Watertight meshes", "Print optimization", "Support structures", "Multiple formats"],
  },
  vr: {
    title: "VR/AR",
    description: "Build immersive virtual and augmented reality experiences with optimized 3D content created in seconds.",
    features: ["Optimized geometry", "AR placement", "VR-ready assets", "Real-time rendering"],
  },
  interior: {
    title: "Interior Design",
    description: "Visualize interior spaces with custom 3D furniture, decor, and architectural elements tailored to your vision.",
    features: ["Furniture design", "Room visualization", "Custom decor", "Space planning"],
  },
};

const previewCards = [
  { color: "from-violet-400 to-purple-600", innerColor: "bg-violet-300/30" },
  { color: "from-cyan-400 to-teal-600", innerColor: "bg-cyan-300/30" },
  { color: "from-orange-400 to-amber-600", innerColor: "bg-orange-300/30" },
  { color: "from-emerald-400 to-green-600", innerColor: "bg-emerald-300/30" },
  { color: "from-pink-400 to-rose-600", innerColor: "bg-pink-300/30" },
  { color: "from-purple-400 to-violet-600", innerColor: "bg-purple-300/30" },
  { color: "from-amber-400 to-yellow-600", innerColor: "bg-amber-300/30" },
];

export default function Landing() {
  const [activeCategory, setActiveCategory] = useState("game");
  const { user } = useAuth();
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">VinciAI</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/gallery" className="text-muted-foreground hover:text-foreground transition-colors">Gallery</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/create">
                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link to="/create">
                  <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="container mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Create 3D Models
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Meet the world's most popular and intuitive free AI 3D model generator. Transform 
            text and images into stunning 3D models in seconds with our text & image to 3D 
            model tool—no experience required!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link to="/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Preview Cards */}
      <section className="py-12 px-6 overflow-hidden">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center gap-4 flex-wrap"
          >
            {previewCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${card.color} p-1 cursor-pointer shadow-lg`}
              >
                <div className={`w-full h-full rounded-xl ${card.innerColor} backdrop-blur-sm flex items-center justify-center`}>
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${card.color} opacity-60`} />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Use Case Categories */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap justify-center gap-4 md:gap-6 mb-12"
          >
            {useCategories.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <motion.button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col items-center gap-3 p-4 md:p-6 rounded-2xl transition-all duration-300 min-w-[100px] md:min-w-[120px] ${
                    isActive 
                      ? "bg-card border-2 border-primary shadow-lg shadow-primary/20" 
                      : "bg-card/50 border border-border/50 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-md`}>
                    <Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
                  </div>
                  <span className={`text-xs md:text-sm font-medium text-center ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {category.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="w-2 h-2 rounded-full bg-primary"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* Category Detail Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-gradient-to-br from-card to-muted/30 rounded-3xl p-8 md:p-12 border border-border/50"
            >
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    {categoryDetails[activeCategory].title}
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8">
                    {categoryDetails[activeCategory].description}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {categoryDetails[activeCategory].features.map((feature, index) => (
                      <motion.li
                        key={feature}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 text-foreground"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <ChevronRight className="h-4 w-4 text-primary" />
                        </div>
                        {feature}
                      </motion.li>
                    ))}
                  </ul>
                  <Link to="/create">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Play className="mr-2 h-4 w-4" />
                      Try {categoryDetails[activeCategory].title}
                    </Button>
                  </Link>
                </div>
                
                <div className="relative">
                  <div className="aspect-video rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 flex items-center justify-center border border-border/30">
                    <div className="text-center">
                      <Layers className="h-16 w-16 text-primary/50 mx-auto mb-4" />
                      <p className="text-muted-foreground">3D Preview</p>
                    </div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-secondary opacity-20 blur-xl" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Why Choose VinciAI?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The most powerful AI-driven 3D generation platform for creators, developers, and businesses.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: "Lightning Fast", description: "Generate detailed 3D models in seconds, not hours. Our AI processes your input instantly.", color: "from-amber-500 to-orange-600" },
              { icon: Wand2, title: "AI-Powered", description: "State-of-the-art machine learning models trained on millions of 3D assets.", color: "from-violet-500 to-purple-600" },
              { icon: Layers, title: "Export Anywhere", description: "Download in multiple formats: GLB, OBJ, FBX, STL and more for any platform.", color: "from-cyan-500 to-blue-600" },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-card rounded-2xl p-8 border border-border/50 hover:border-primary/30 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ad Banner for Free Users - Placed between content sections */}
      {!isPro && (
        <section className="py-8 px-6">
          <div className="container mx-auto flex justify-center">
            <AdBanner 
              format="horizontal" 
              pageType="content"
              contentItemCount={7} // We have 7 use case categories as content
              minContentItems={1}
              className="w-full max-w-3xl"
            />
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/20 rounded-3xl p-12 md:p-16 text-center border border-border/30"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Ready to Create?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Join thousands of creators who are already using VinciAI to bring their ideas to life.
            </p>
            <Link to="/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-10 py-6 rounded-xl shadow-lg shadow-primary/25">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Creating for Free
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">VinciAI</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/gallery" className="hover:text-foreground transition-colors">Gallery</Link>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 VinciAI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
