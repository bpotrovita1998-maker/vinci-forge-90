import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  BookOpen, 
  Video, 
  Image, 
  Box, 
  Sparkles, 
  ChevronRight, 
  Clock, 
  Search,
  Play,
  FileText,
  Lightbulb,
  Zap,
  Target,
  Settings,
  Download,
  Palette,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/landing/Footer";
import AdBanner from "@/components/AdBanner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEO } from "@/components/SEO";

const categories = [
  { id: "all", label: "All Guides", icon: BookOpen },
  { id: "getting-started", label: "Getting Started", icon: Sparkles },
  { id: "images", label: "Image Generation", icon: Image },
  { id: "videos", label: "Video Creation", icon: Video },
  { id: "3d", label: "3D Models", icon: Box },
  { id: "advanced", label: "Advanced", icon: Settings },
];

const tutorials = [
  {
    id: 1,
    title: "Getting Started with VinciAI",
    description: "Learn the basics of VinciAI and create your first AI-generated content in minutes.",
    category: "getting-started",
    difficulty: "Beginner",
    readTime: "5 min",
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    steps: [
      "Create your free account",
      "Navigate to the Create page",
      "Enter your first prompt",
      "Download your creation"
    ]
  },
  {
    id: 2,
    title: "Writing Effective Prompts",
    description: "Master the art of prompt engineering to get exactly what you envision from the AI.",
    category: "getting-started",
    difficulty: "Beginner",
    readTime: "8 min",
    icon: FileText,
    color: "from-cyan-500 to-blue-600",
    steps: [
      "Be specific and descriptive",
      "Include style references",
      "Specify lighting and mood",
      "Use negative prompts wisely"
    ]
  },
  {
    id: 3,
    title: "Creating Photorealistic Images",
    description: "Generate stunning, photorealistic images that look like professional photographs.",
    category: "images",
    difficulty: "Intermediate",
    readTime: "10 min",
    icon: Image,
    color: "from-emerald-500 to-green-600",
    steps: [
      "Choose the right resolution",
      "Describe lighting conditions",
      "Add camera and lens details",
      "Fine-tune with advanced settings"
    ]
  },
  {
    id: 4,
    title: "AI Video Generation Basics",
    description: "Create smooth, professional-quality videos from text descriptions or images.",
    category: "videos",
    difficulty: "Intermediate",
    readTime: "12 min",
    icon: Video,
    color: "from-pink-500 to-rose-600",
    steps: [
      "Start with a strong concept",
      "Write scene descriptions",
      "Set duration and style",
      "Export in your preferred format"
    ]
  },
  {
    id: 5,
    title: "Text to 3D Model Creation",
    description: "Transform text descriptions into detailed 3D models ready for games or printing.",
    category: "3d",
    difficulty: "Intermediate",
    readTime: "15 min",
    icon: Box,
    color: "from-amber-500 to-orange-600",
    steps: [
      "Describe your 3D object",
      "Choose the output format",
      "Adjust geometry settings",
      "Export for your platform"
    ]
  },
  {
    id: 6,
    title: "Image to 3D Conversion",
    description: "Convert 2D images into fully-textured 3D models with accurate depth and detail.",
    category: "3d",
    difficulty: "Intermediate",
    readTime: "10 min",
    icon: Layers,
    color: "from-indigo-500 to-violet-600",
    steps: [
      "Upload your reference image",
      "Select conversion settings",
      "Preview the 3D result",
      "Refine and export"
    ]
  },
  {
    id: 7,
    title: "Advanced Prompt Techniques",
    description: "Learn advanced prompting strategies for complex, multi-element compositions.",
    category: "advanced",
    difficulty: "Advanced",
    readTime: "15 min",
    icon: Target,
    color: "from-red-500 to-pink-600",
    steps: [
      "Weighted prompts",
      "Compositional control",
      "Style mixing",
      "Iterative refinement"
    ]
  },
  {
    id: 8,
    title: "Batch Processing & Automation",
    description: "Generate multiple variations and automate your creative workflow.",
    category: "advanced",
    difficulty: "Advanced",
    readTime: "12 min",
    icon: Zap,
    color: "from-yellow-500 to-amber-600",
    steps: [
      "Set up batch generation",
      "Use seed values",
      "Create variations",
      "Organize outputs"
    ]
  },
  {
    id: 9,
    title: "Exporting for Different Platforms",
    description: "Learn how to export your creations for Unity, Unreal, web, and 3D printing.",
    category: "advanced",
    difficulty: "Intermediate",
    readTime: "10 min",
    icon: Download,
    color: "from-teal-500 to-cyan-600",
    steps: [
      "Choose the right format",
      "Optimize for your platform",
      "Set up materials",
      "Test your export"
    ]
  },
  {
    id: 10,
    title: "Color & Style Customization",
    description: "Control colors, materials, and artistic styles in your generated content.",
    category: "images",
    difficulty: "Beginner",
    readTime: "7 min",
    icon: Palette,
    color: "from-fuchsia-500 to-purple-600",
    steps: [
      "Specify color palettes",
      "Reference art styles",
      "Control saturation and contrast",
      "Apply consistent branding"
    ]
  },
  {
    id: 11,
    title: "Creating Cinematic Videos",
    description: "Produce Hollywood-quality video clips with professional camera movements.",
    category: "videos",
    difficulty: "Advanced",
    readTime: "18 min",
    icon: Play,
    color: "from-rose-500 to-red-600",
    steps: [
      "Plan your shot sequence",
      "Describe camera movements",
      "Add cinematic effects",
      "Edit and combine clips"
    ]
  },
  {
    id: 12,
    title: "Optimizing 3D Models for Games",
    description: "Create game-ready assets with proper LODs, materials, and optimized geometry.",
    category: "3d",
    difficulty: "Advanced",
    readTime: "20 min",
    icon: Lightbulb,
    color: "from-green-500 to-emerald-600",
    steps: [
      "Set polygon limits",
      "Configure LOD levels",
      "Apply PBR materials",
      "Export to game engines"
    ]
  },
];

const quickStartGuide = {
  title: "Quick Start Guide",
  steps: [
    {
      number: 1,
      title: "Sign Up",
      description: "Create your free VinciAI account to get started with AI content generation."
    },
    {
      number: 2,
      title: "Choose Your Content Type",
      description: "Select whether you want to create images, videos, 3D models, or CAD files."
    },
    {
      number: 3,
      title: "Write Your Prompt",
      description: "Describe what you want to create in natural language. Be specific about details, style, and mood."
    },
    {
      number: 4,
      title: "Generate & Download",
      description: "Click generate and watch the AI bring your vision to life. Download in your preferred format."
    }
  ]
};

export default function Tutorials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredTutorials = tutorials.filter(tutorial => {
    const matchesCategory = activeCategory === "all" || tutorial.category === activeCategory;
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-green-500/10 text-green-500";
      case "Intermediate": return "bg-yellow-500/10 text-yellow-500";
      case "Advanced": return "bg-red-500/10 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <SEO 
        title="Tutorials & Documentation"
        description="Learn how to create stunning AI-generated images, videos, and 3D models with our comprehensive tutorials and guides."
        keywords="AI tutorials, image generation guide, video generation tutorial, 3D model creation, VinciAI documentation"
      />
      <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
          <Breadcrumbs />
        </div>
      </div>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Tutorials & Documentation
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Learn how to create stunning AI-generated content with our comprehensive guides and tutorials.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg glass border-border/30"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Start Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">{quickStartGuide.title}</h2>
            <p className="text-muted-foreground">Get started in just 4 simple steps</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {quickStartGuide.steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass border-border/30 p-6 h-full relative">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {index < quickStartGuide.steps.length - 1 && (
                    <ChevronRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link to="/create">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Start Creating Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 mb-8">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-full border border-border/30"
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeCategory} className="mt-0">
              {filteredTutorials.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No tutorials found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTutorials.map((tutorial, index) => {
                    const Icon = tutorial.icon;
                    return (
                      <motion.div
                        key={tutorial.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="glass border-border/30 overflow-hidden group hover:border-primary/30 transition-all h-full flex flex-col">
                          <div className={`h-32 bg-gradient-to-br ${tutorial.color} flex items-center justify-center`}>
                            <Icon className="w-12 h-12 text-white/80" />
                          </div>
                          <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center gap-2 mb-3">
                              <Badge className={getDifficultyColor(tutorial.difficulty)}>
                                {tutorial.difficulty}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {tutorial.readTime}
                              </span>
                            </div>
                            <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                              {tutorial.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 flex-grow">
                              {tutorial.description}
                            </p>
                            <div className="space-y-2 mb-4">
                              <p className="text-xs font-medium text-muted-foreground uppercase">What you'll learn:</p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {tutorial.steps.slice(0, 3).map((step, i) => (
                                  <li key={i} className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-primary" />
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <Button variant="outline" size="sm" className="w-full gap-2 mt-auto">
                              Read Tutorial <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Tips Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">Pro Tips for Better Results</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Follow these expert tips to get the most out of VinciAI's generation capabilities.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Be Specific in Your Prompts",
                description: "Instead of 'a car', try 'a red 1967 Ford Mustang convertible parked on a sunny California beach at golden hour'.",
                icon: Target
              },
              {
                title: "Use Style References",
                description: "Mention specific art styles, artists, or visual references to guide the AI's creative direction.",
                icon: Palette
              },
              {
                title: "Iterate and Refine",
                description: "Start with a base generation and refine your prompt based on the results. Small tweaks can make big differences.",
                icon: Zap
              },
              {
                title: "Leverage Negative Prompts",
                description: "Tell the AI what to avoid. Use negative prompts to remove unwanted elements from your generations.",
                icon: Settings
              }
            ].map((tip, index) => {
              const Icon = tip.icon;
              return (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass border-border/30 p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{tip.title}</h3>
                      <p className="text-sm text-muted-foreground">{tip.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/20 rounded-3xl p-12 border border-border/30"
          >
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to Put Your Knowledge to Use?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start creating stunning AI-generated content with the skills you've learned.
            </p>
            <Link to="/create">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Start Creating
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Ad Banner */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner 
            pageType="content" 
            format="horizontal" 
            contentItemCount={tutorials.length}
            minContentItems={1}
          />
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
