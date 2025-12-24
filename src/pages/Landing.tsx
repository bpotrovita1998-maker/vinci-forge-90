import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Film, Box, GraduationCap, Gamepad2, Printer, Glasses, Home, ChevronRight, Play, Zap, Layers, Wand2, Star, Quote, ChevronDown, BookOpen, ArrowRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import AdBanner from "@/components/AdBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

// Testimonials data
const testimonials = [
  {
    quote: "VinciAI has completely transformed our product visualization workflow. What used to take days now takes minutes.",
    author: "Jennifer Martinez",
    role: "Product Designer at DesignCo",
    rating: 5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jennifer"
  },
  {
    quote: "As a game developer, I can now prototype character models in seconds. It's like having a 3D artist on demand.",
    author: "Marcus Chen",
    role: "Indie Game Developer",
    rating: 5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus"
  },
  {
    quote: "The quality of the 3D models is incredible. Our clients are always impressed with the results.",
    author: "Sarah Thompson",
    role: "Architect at BuildStudio",
    rating: 5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
  },
  {
    quote: "We've reduced our content production costs by 70% since switching to VinciAI. Absolutely game-changing.",
    author: "David Kim",
    role: "Marketing Director at TechStart",
    rating: 5,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
  }
];

// FAQ data
const faqs = [
  {
    question: "What types of content can I create with VinciAI?",
    answer: "VinciAI supports multiple content types including high-quality images, videos, 3D models (GLB, OBJ, FBX), and CAD-ready files for manufacturing. You can generate everything from product visualizations to game assets and architectural models."
  },
  {
    question: "Do I need any technical experience to use VinciAI?",
    answer: "Not at all! VinciAI is designed to be user-friendly for everyone. Simply describe what you want to create in plain language, and our AI will generate it for you. No coding, 3D modeling, or design experience required."
  },
  {
    question: "How long does it take to generate content?",
    answer: "Most content is generated within seconds to a few minutes, depending on complexity. Simple images take just a few seconds, while detailed 3D models may take 1-2 minutes. Video generation typically takes 2-5 minutes."
  },
  {
    question: "Can I use the generated content commercially?",
    answer: "Yes! All content you generate with VinciAI is yours to use commercially. Pro and Enterprise users get full commercial rights with no attribution required."
  },
  {
    question: "What file formats are supported for 3D models?",
    answer: "We support all major 3D formats including GLB/GLTF, OBJ, FBX, STL (for 3D printing), and USDZ (for AR). You can easily export to your preferred format directly from the platform."
  },
  {
    question: "Is there a free tier available?",
    answer: "Yes! Free users can create AI-generated images by watching short ads. Each ad you watch grants you free generations to use. This allows you to experience VinciAI's powerful creation tools at no cost. Upgrade to Pro for ad-free unlimited access and all premium features."
  },
  {
    question: "How does VinciAI ensure content quality?",
    answer: "Our AI models are trained on millions of high-quality assets and continuously improved. We also offer upscaling and enhancement tools to ensure your content meets professional standards."
  }
];

// Blog posts data
const blogPosts = [
  {
    title: "How AI is Revolutionizing 3D Content Creation",
    excerpt: "Discover how artificial intelligence is transforming the way designers, developers, and creators work with 3D content.",
    category: "Industry Trends",
    date: "Dec 20, 2024",
    readTime: "5 min read",
    image: "from-violet-500 to-purple-600"
  },
  {
    title: "10 Tips for Better AI-Generated 3D Models",
    excerpt: "Learn the best practices for writing prompts and getting the most out of AI-powered 3D generation tools.",
    category: "Tutorial",
    date: "Dec 18, 2024",
    readTime: "8 min read",
    image: "from-cyan-500 to-blue-600"
  },
  {
    title: "From Text to Game Asset: A Developer's Guide",
    excerpt: "A step-by-step guide for game developers looking to integrate AI-generated assets into their workflow.",
    category: "Guide",
    date: "Dec 15, 2024",
    readTime: "12 min read",
    image: "from-emerald-500 to-green-600"
  }
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

      {/* Testimonials Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Loved by Creators Worldwide
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of designers, developers, and creators who trust VinciAI for their projects.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass border-border/30 p-6 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-primary/30 mb-3" />
                  <p className="text-sm text-muted-foreground flex-grow mb-4 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="w-10 h-10 rounded-full bg-muted"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
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
              contentItemCount={testimonials.length + faqs.length + blogPosts.length}
              minContentItems={1}
              className="w-full max-w-3xl"
            />
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-20 px-6 bg-muted/20">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything you need to know about VinciAI.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem 
                    value={`item-${index}`}
                    className="bg-card border border-border/50 rounded-xl px-6 data-[state=open]:border-primary/30"
                  >
                    <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                      <span className="font-medium">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Blog Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Latest from Our Blog
              </h2>
              <p className="text-muted-foreground">
                Insights, tutorials, and updates from the VinciAI team.
              </p>
            </div>
            <Link to="/blog" className="mt-4 md:mt-0">
              <Button variant="outline" className="gap-2">
                View All Posts <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <motion.div
                key={post.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass border-border/30 overflow-hidden group cursor-pointer hover:border-primary/30 transition-all">
                  <div className={`h-40 bg-gradient-to-br ${post.image} flex items-center justify-center`}>
                    <BookOpen className="w-12 h-12 text-white/50" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.readTime}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                      <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-muted/20">
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
      <footer className="py-16 px-6 border-t border-border/50 bg-card/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold text-foreground">VinciAI</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                The world's most intuitive AI-powered 3D content creation platform.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/create" className="hover:text-foreground transition-colors">Create</Link></li>
                <li><Link to="/gallery" className="hover:text-foreground transition-colors">Gallery</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} VinciAI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Made with <span className="text-primary">♥</span> for creators worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
