import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Tag,
  TrendingUp,
  Lightbulb,
  Zap,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Footer } from "@/components/landing/Footer";
import AdBanner from "@/components/AdBanner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEO, ArticleSEO } from "@/components/SEO";

const categories = ["All", "Industry Trends", "Tutorials", "Product Updates", "Case Studies", "Tips & Tricks"];

const blogPosts = [
  {
    id: 1,
    title: "The Future of AI in Creative Industries: 2025 and Beyond",
    excerpt: "Explore how artificial intelligence is reshaping the creative landscape, from 3D modeling to video production, and what it means for designers, artists, and developers.",
    content: `The creative industry is undergoing a revolutionary transformation. AI-powered tools are no longer just assistants—they're becoming collaborative partners in the creative process.

In 2024, we've seen AI image generation reach photorealistic quality. 3D model creation from text prompts has become reliable enough for production use. Video generation has evolved from choppy clips to smooth, cinematic sequences.

What does this mean for creatives? Rather than replacing human creativity, AI is amplifying it. Designers can now iterate faster, explore more ideas, and focus on the conceptual work that truly requires human insight.

The democratization of creative tools means that small studios can now produce content that previously required massive budgets. Independent game developers can generate assets in hours instead of weeks. Architects can visualize concepts before spending time on detailed models.

Looking ahead to 2025, we expect to see even more integration between AI tools and traditional creative software. Real-time generation, better control over outputs, and more specialized models for different industries are all on the horizon.`,
    category: "Industry Trends",
    author: "Alex Chen",
    authorRole: "CEO & Founder",
    date: "December 22, 2024",
    readTime: "8 min read",
    image: "from-violet-500 to-purple-600",
    featured: true
  },
  {
    id: 2,
    title: "10 Prompt Engineering Secrets for Better 3D Models",
    excerpt: "Master the art of writing prompts that generate exactly what you envision. Learn techniques used by professional creators to get consistent, high-quality results.",
    content: `Prompt engineering is both an art and a science. After analyzing thousands of successful generations, we've identified the key patterns that lead to better results.

1. Start with the subject, then add details
2. Specify materials and textures explicitly
3. Include lighting information
4. Reference real-world objects for scale
5. Use style keywords strategically
6. Describe the viewing angle
7. Add environmental context
8. Specify the level of detail
9. Use negative prompts to exclude unwanted elements
10. Iterate based on initial results

The most successful creators treat prompts as iterative experiments. They start simple, analyze results, and refine their approach based on what the AI responds to best.`,
    category: "Tutorials",
    author: "Sarah Johnson",
    authorRole: "Head of AI Research",
    date: "December 20, 2024",
    readTime: "12 min read",
    image: "from-cyan-500 to-blue-600",
    featured: true
  },
  {
    id: 3,
    title: "Case Study: How GameForge Studio Reduced Asset Creation Time by 80%",
    excerpt: "Learn how an indie game studio transformed their workflow with AI-generated assets, shipping their game months ahead of schedule.",
    content: `GameForge Studio faced a common challenge: a small team with big ambitions. Their RPG game required hundreds of unique 3D assets, but their art team consisted of just two people.

By integrating VinciAI into their pipeline, they achieved remarkable results:
- Asset creation time reduced from 2-3 days to 2-3 hours
- Consistent art style across all assets
- Rapid iteration on concepts
- More time for polish and gameplay

The key was developing a systematic approach: creating style guides, building prompt templates, and establishing a review process for AI-generated content.

"We couldn't have shipped this game without AI tools," says lead designer Marcus Chen. "It's not about replacing artists—it's about letting them focus on what matters most."`,
    category: "Case Studies",
    author: "Michael Park",
    authorRole: "Content Manager",
    date: "December 18, 2024",
    readTime: "10 min read",
    image: "from-emerald-500 to-green-600",
    featured: false
  },
  {
    id: 4,
    title: "Introducing VinciAI 2.0: What's New",
    excerpt: "A deep dive into our latest release, featuring improved 3D generation, faster processing, and new export formats.",
    content: `We're thrilled to announce VinciAI 2.0, our biggest update yet. Here's everything that's new:

**Improved 3D Generation**
Our new model produces more detailed geometry, better topology, and cleaner meshes. Expect 40% improvement in geometric accuracy.

**Faster Processing**
Average generation time reduced by 60%. Most 3D models now complete in under 2 minutes.

**New Export Formats**
Added support for USDZ (for AR), STEP (for CAD), and optimized formats for major game engines.

**Enhanced Materials**
PBR materials now include more detail maps and better texture resolution.

**Batch Processing**
Generate up to 10 variations simultaneously with our new batch mode.

These improvements are available to all users starting today.`,
    category: "Product Updates",
    author: "Emma Williams",
    authorRole: "Product Manager",
    date: "December 15, 2024",
    readTime: "6 min read",
    image: "from-pink-500 to-rose-600",
    featured: false
  },
  {
    id: 5,
    title: "5 Common Mistakes When Creating AI-Generated Content",
    excerpt: "Avoid these pitfalls to get better results and save time in your creative workflow.",
    content: `After working with thousands of creators, we've identified the most common mistakes that lead to poor results:

**1. Being Too Vague**
"A building" vs "A modern glass skyscraper with geometric patterns reflecting sunset light" - specificity matters.

**2. Ignoring Negative Prompts**
Tell the AI what to avoid. This is just as important as telling it what to include.

**3. Not Iterating**
The first result is rarely the best. Use it as a starting point and refine.

**4. Wrong Resolution for Purpose**
Match your output settings to your intended use case.

**5. Skipping the Preview**
Always preview before final generation to catch issues early.`,
    category: "Tips & Tricks",
    author: "David Kim",
    authorRole: "Community Lead",
    date: "December 12, 2024",
    readTime: "5 min read",
    image: "from-amber-500 to-orange-600",
    featured: false
  },
  {
    id: 6,
    title: "The Rise of AI-Generated Game Assets: Industry Analysis",
    excerpt: "How AI is transforming game development pipelines and what it means for the future of the industry.",
    content: `The gaming industry is experiencing a paradigm shift. AI-generated assets are moving from experimental to essential.

**Market Adoption**
65% of indie studios now use some form of AI in their asset pipeline. Among AAA studios, that number is 40% and growing rapidly.

**Quality Evolution**
Just two years ago, AI assets required significant manual cleanup. Today, many are production-ready out of the box.

**Economic Impact**
Studios report 50-80% reduction in asset creation costs. This is enabling smaller teams to compete with larger studios.

**Creative Freedom**
With faster iteration, developers can experiment more. This is leading to more diverse and creative game designs.

The question is no longer whether to use AI tools, but how to integrate them effectively.`,
    category: "Industry Trends",
    author: "Alex Chen",
    authorRole: "CEO & Founder",
    date: "December 10, 2024",
    readTime: "9 min read",
    image: "from-indigo-500 to-violet-600",
    featured: false
  },
  {
    id: 7,
    title: "From Concept to Game-Ready: A Complete Workflow Guide",
    excerpt: "Step-by-step guide to taking an AI-generated 3D model from initial concept to fully optimized game asset.",
    content: `Creating game-ready assets with AI requires a systematic approach. Here's our proven workflow:

**Phase 1: Concept Generation**
Start with text prompts to explore different directions. Generate 5-10 variations before selecting the best.

**Phase 2: Refinement**
Use image-to-3D for more control. Reference your best generations.

**Phase 3: Optimization**
Reduce polygon count while maintaining visual quality. Set up LOD levels.

**Phase 4: Materials**
Apply PBR materials. Ensure textures are properly sized for your target platform.

**Phase 5: Export**
Choose the right format for your engine. Test import and rendering.

**Phase 6: Integration**
Add to your game engine. Set up colliders, animations, and interactions.

Following this workflow ensures consistent, high-quality results every time.`,
    category: "Tutorials",
    author: "Sarah Johnson",
    authorRole: "Head of AI Research",
    date: "December 8, 2024",
    readTime: "15 min read",
    image: "from-teal-500 to-cyan-600",
    featured: false
  },
  {
    id: 8,
    title: "How Architects Are Using AI to Revolutionize Design",
    excerpt: "Case studies and insights from architecture firms leveraging AI for faster visualization and innovative designs.",
    content: `Architecture is one of the industries most transformed by AI visualization tools.

**Speed of Iteration**
What once took days of rendering now takes minutes. Architects can explore dozens of design variations in a single client meeting.

**Client Communication**
AI-generated visualizations help clients understand concepts before detailed plans are drawn. This reduces costly revisions later.

**Sustainable Design**
Rapid prototyping enables more exploration of sustainable design options without additional time investment.

**Case Study: Smith & Associates**
This mid-sized firm reduced their concept phase from 3 weeks to 3 days using AI visualization. Client satisfaction scores increased by 40%.

The firms embracing AI tools are winning more projects and delivering better results.`,
    category: "Case Studies",
    author: "Michael Park",
    authorRole: "Content Manager",
    date: "December 5, 2024",
    readTime: "8 min read",
    image: "from-rose-500 to-pink-600",
    featured: false
  },
  {
    id: 9,
    title: "Optimizing Your Workflow: Keyboard Shortcuts and Power User Tips",
    excerpt: "Become a VinciAI power user with these productivity tips that will cut your creation time in half.",
    content: `Work faster and smarter with these power user techniques:

**Essential Shortcuts**
- Ctrl+Enter: Quick generate
- Ctrl+S: Save current settings
- Ctrl+D: Duplicate with variations
- Ctrl+E: Open export dialog

**Workflow Optimizations**
1. Create prompt templates for common tasks
2. Use the history feature to track what works
3. Set up preset export configurations
4. Organize outputs with consistent naming

**Advanced Techniques**
- Chain multiple generations for complex scenes
- Use seed values for reproducible results
- Batch process similar assets together

These tips can reduce your average creation time by 50% or more.`,
    category: "Tips & Tricks",
    author: "David Kim",
    authorRole: "Community Lead",
    date: "December 3, 2024",
    readTime: "6 min read",
    image: "from-yellow-500 to-amber-600",
    featured: false
  }
];

const POSTS_PER_PAGE = 6;

export default function Blog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<typeof blogPosts[0] | null>(null);

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
  const featuredPosts = blogPosts.filter(post => post.featured);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  // Add Article schema when viewing a post
  useEffect(() => {
    if (!selectedPost) {
      // Remove article schema when not viewing a post
      const existingScript = document.querySelector('script[data-schema="article"]');
      if (existingScript) existingScript.remove();
      return;
    }

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": selectedPost.title,
      "description": selectedPost.excerpt,
      "author": {
        "@type": "Person",
        "name": selectedPost.author,
        "jobTitle": selectedPost.authorRole
      },
      "publisher": {
        "@type": "Organization",
        "name": "VinciAI",
        "logo": {
          "@type": "ImageObject",
          "url": "https://vinciai.lovable.app/og-image.png"
        }
      },
      "datePublished": selectedPost.date,
      "dateModified": selectedPost.date,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://vinciai.lovable.app/blog#${selectedPost.id}`
      },
      "articleSection": selectedPost.category,
      "wordCount": selectedPost.content.split(/\s+/).length
    };

    let script = document.querySelector('script[data-schema="article"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema', 'article');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(articleSchema);

    return () => {
      const existingScript = document.querySelector('script[data-schema="article"]');
      if (existingScript) existingScript.remove();
    };
  }, [selectedPost]);

  if (selectedPost) {
    return (
      <>
        <ArticleSEO
          title={selectedPost.title}
          description={selectedPost.excerpt}
          author={selectedPost.author}
          publishedTime={selectedPost.date}
          section={selectedPost.category}
        />
        <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/30 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSelectedPost(null)}>
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Button>
            <Breadcrumbs 
              items={[
                { label: "Home", href: "/" },
                { label: "Blog", href: "/blog" },
                { label: selectedPost.title.slice(0, 30) + "...", href: `/blog#${selectedPost.id}` }
              ]} 
            />
          </div>
        </div>

        {/* Article Content */}
        <article className="max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Article Header */}
            <div className="mb-8">
              <Badge className="mb-4">{selectedPost.category}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                {selectedPost.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{selectedPost.author}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedPost.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{selectedPost.readTime}</span>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className={`h-64 md:h-96 rounded-2xl bg-gradient-to-br ${selectedPost.image} flex items-center justify-center mb-8`}>
              <BookOpen className="w-20 h-20 text-white/50" />
            </div>

            {/* Article Body */}
            <div className="prose prose-lg prose-invert max-w-none">
              {selectedPost.content.split('\n\n').map((paragraph, index) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
                      {paragraph.replace(/\*\*/g, '')}
                    </h2>
                  );
                }
                if (paragraph.startsWith('**')) {
                  return (
                    <h3 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  );
                }
                if (paragraph.startsWith('-') || paragraph.startsWith('1.')) {
                  return (
                    <ul key={index} className="list-disc list-inside text-muted-foreground mb-4">
                      {paragraph.split('\n').map((item, i) => (
                        <li key={i}>{item.replace(/^[-\d.]\s*/, '')}</li>
                      ))}
                    </ul>
                  );
                }
                return (
                  <p key={index} className="text-muted-foreground mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>

            {/* Author Box */}
            <Card className="glass border-border/30 p-6 mt-12">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedPost.author}</h3>
                  <p className="text-sm text-muted-foreground">{selectedPost.authorRole}</p>
                </div>
              </div>
            </Card>

            {/* Share & CTA */}
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Enjoyed this article?</p>
              <Link to="/create">
                <Button size="lg" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  Try VinciAI for Free
                </Button>
              </Link>
            </div>
          </motion.div>
        </article>

        <Footer />
      </div>
      </>
    );
  }

  return (
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
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              VinciAI Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Insights, tutorials, and updates from the VinciAI team. Learn how to create better with AI.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-12 py-6 text-lg glass border-border/30"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Posts */}
      {activeCategory === "All" && searchQuery === "" && currentPage === 1 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Featured Articles
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedPost(post)}
                  className="cursor-pointer"
                >
                  <Card className="glass border-border/30 overflow-hidden group hover:border-primary/30 transition-all h-full">
                    <div className={`h-48 bg-gradient-to-br ${post.image} flex items-center justify-center`}>
                      <Lightbulb className="w-16 h-16 text-white/50" />
                    </div>
                    <div className="p-6">
                      <Badge className="mb-3">{post.category}</Badge>
                      <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{post.author}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {post.readTime}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Filter */}
      <section className="py-8 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Posts Grid */}
          {paginatedPosts.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPost(post)}
                  className="cursor-pointer"
                >
                  <Card className="glass border-border/30 overflow-hidden group hover:border-primary/30 transition-all h-full flex flex-col">
                    <div className={`h-40 bg-gradient-to-br ${post.image} flex items-center justify-center`}>
                      <BookOpen className="w-12 h-12 text-white/50" />
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{post.readTime}</span>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/30">
                        <span>{post.date}</span>
                        <span>{post.author}</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                    className="w-10"
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/20 rounded-3xl p-12 border border-border/30"
          >
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Stay Updated
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Get the latest tutorials, tips, and product updates delivered straight to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input 
                placeholder="Enter your email" 
                className="flex-grow glass border-border/30"
              />
              <Button className="gap-2">
                Subscribe
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ad Banner */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <AdBanner 
            pageType="content" 
            format="horizontal" 
            contentItemCount={blogPosts.length}
            minContentItems={5}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}
