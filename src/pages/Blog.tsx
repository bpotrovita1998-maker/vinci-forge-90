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

**The Democratization of Creativity**

What does this mean for creatives? Rather than replacing human creativity, AI is amplifying it. Designers can now iterate faster, explore more ideas, and focus on the conceptual work that truly requires human insight.

The democratization of creative tools means that small studios can now produce content that previously required massive budgets. Independent game developers can generate assets in hours instead of weeks. Architects can visualize concepts before spending time on detailed models.

**Key Trends to Watch**

Looking ahead to 2025, we expect to see even more integration between AI tools and traditional creative software:

- Real-time generation capabilities during the creative process
- Better control over outputs with more precise prompting
- Specialized models for different industries and use cases
- Seamless integration with existing workflows and software
- Improved consistency for character and brand assets

**Impact on Different Industries**

The gaming industry has seen perhaps the most dramatic adoption, with indie studios now competing with larger publishers on visual quality. Architecture firms are using AI to explore more sustainable design options. Marketing teams are producing personalized content at scale.

**What This Means for You**

For creative professionals, now is the time to learn these tools. Those who embrace AI assistance will find themselves more productive and creative than ever. The future belongs to those who can effectively collaborate with AI while bringing uniquely human vision and judgment to their work.`,
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

**1. Start with the Subject, Then Add Details**

Always begin your prompt with the main subject. "A medieval castle" before "with towers and a moat, Gothic architecture, stone walls covered in ivy."

**2. Specify Materials and Textures Explicitly**

Don't assume the AI will choose the right materials. Be explicit: "brushed aluminum," "polished marble," "weathered wood," or "matte black plastic."

**3. Include Lighting Information**

Lighting dramatically affects the result. Try "soft studio lighting," "dramatic rim lighting," "natural outdoor illumination," or "golden hour sunset glow."

**4. Reference Real-World Objects for Scale**

Help the AI understand size: "the size of a coffee table," "towering 10 meters high," or "small enough to hold in one hand."

**5. Use Style Keywords Strategically**

Style keywords are powerful: "minimalist," "art deco," "cyberpunk," "organic," "industrial," or "whimsical."

**6. Describe the Viewing Angle**

"front view," "isometric perspective," "3/4 angle," "top-down view" – these help the AI understand your intent.

**7. Add Environmental Context**

Where will this object exist? "in a futuristic cityscape," "in a cozy living room," or "in a dense forest" adds context.

**8. Specify the Level of Detail**

"highly detailed" vs "simplified" vs "stylized low-poly" – be clear about your needs.

**9. Use Negative Prompts to Exclude Unwanted Elements**

Tell the AI what NOT to include: "no text," "no humans," "no bright colors."

**10. Iterate Based on Initial Results**

The most successful creators treat prompts as iterative experiments. They start simple, analyze results, and refine their approach based on what the AI responds to best.

**Pro Tip: Create a Prompt Library**

Build a personal library of prompt fragments that work well for your style. This saves time and ensures consistency across projects.`,
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

**The Challenge**

Creating a fantasy RPG requires diverse assets: characters, weapons, armor, furniture, buildings, creatures, and environmental elements. For a two-person art team, this would normally mean years of work or significant compromise on scope.

**The Solution**

By integrating VinciAI into their pipeline, they achieved remarkable results:

- Asset creation time reduced from 2-3 days to 2-3 hours
- Consistent art style across all assets
- Rapid iteration on concepts
- More time for polish and gameplay refinement

**The Process**

The key was developing a systematic approach:

1. **Style Guide Development**: They created detailed prompts that captured their desired aesthetic.
2. **Prompt Templates**: For each asset category, they built templates that could be modified quickly.
3. **Quality Review Process**: All AI-generated assets went through artistic review and refinement.
4. **Optimization Pipeline**: Assets were automatically processed for game engine compatibility.

**The Results**

"We couldn't have shipped this game without AI tools," says lead designer Marcus Chen. "It's not about replacing artists—it's about letting them focus on what matters most."

The game launched 4 months ahead of the original schedule, with players specifically praising the visual variety and consistency.

**Lessons Learned**

- AI tools work best when integrated into a structured workflow
- Human oversight remains essential for quality
- Time saved on production means more time for polish
- Consistent prompting leads to consistent results`,
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
    title: "Understanding AI Video Generation: A Complete Technical Guide",
    excerpt: "Deep dive into how AI video generation works, from diffusion models to temporal coherence, and how to achieve the best results.",
    content: `AI video generation has evolved rapidly from experimental technology to practical creative tool. Understanding how it works helps you get better results.

**How AI Video Generation Works**

Modern AI video generators use diffusion models similar to image generators, but with additional temporal modeling to maintain consistency across frames.

**Key Concepts**

1. **Temporal Coherence**: The ability to maintain consistent elements (objects, characters, colors) across multiple frames.

2. **Motion Dynamics**: Understanding realistic movement and physics to create believable motion.

3. **Scene Consistency**: Keeping backgrounds, lighting, and environmental elements stable throughout the video.

**Best Practices for Video Prompts**

Video prompts differ from image prompts in important ways:

- **Describe Motion**: "A butterfly gently fluttering between flowers" is better than "a butterfly on flowers"
- **Specify Camera Movement**: "Slow dolly forward" or "static wide shot" clarifies intent
- **Include Timing Cues**: "Gradually transitioning from day to night"

**Technical Settings Explained**

- **Duration**: Shorter videos (3-5 seconds) maintain better coherence
- **Resolution**: Balance quality with generation time
- **FPS**: 24fps for cinematic feel, 30fps for web standard

**Common Challenges and Solutions**

**Challenge**: Flickering or inconsistent elements
**Solution**: Use more specific prompts and lower CFG values

**Challenge**: Unnatural motion
**Solution**: Reference real-world physics in your prompt

**Challenge**: Scene changes unexpectedly
**Solution**: Include strong environmental anchors in your prompt

**Post-Production Tips**

AI videos often benefit from light editing:
- Color grading for consistency
- Speed ramping for dramatic effect
- Audio addition for impact
- Minor stabilization if needed`,
    category: "Tutorials",
    author: "Sarah Johnson",
    authorRole: "Head of AI Research",
    date: "December 15, 2024",
    readTime: "14 min read",
    image: "from-pink-500 to-rose-600",
    featured: true
  },
  {
    id: 5,
    title: "5 Common Mistakes When Creating AI-Generated Content",
    excerpt: "Avoid these pitfalls to get better results and save time in your creative workflow.",
    content: `After working with thousands of creators, we've identified the most common mistakes that lead to poor results:

**1. Being Too Vague**

"A building" vs "A modern glass skyscraper with geometric patterns reflecting sunset light, minimalist architecture, 40 stories tall" – specificity matters.

**Why This Happens**: New users often underestimate how much detail AI models can handle.

**The Fix**: Spend extra time on your prompt. More detail almost always leads to better results.

**2. Ignoring Negative Prompts**

Tell the AI what to avoid. This is just as important as telling it what to include.

**Common Negative Prompts to Use**:
- "no text, no watermarks, no signatures"
- "no blurry, no pixelated, no low quality"
- "no humans, no people" (when not wanted)

**3. Not Iterating**

The first result is rarely the best. Use it as a starting point and refine.

**Effective Iteration Strategy**:
- Generate 4-5 initial variations
- Identify what works in each
- Combine successful elements in a refined prompt
- Repeat until satisfied

**4. Wrong Resolution for Purpose**

Match your output settings to your intended use case.

**Resolution Guide**:
- Social media: 1024x1024 or 1080x1920
- Print: 2048x2048 or higher
- Game assets: Depends on platform, often 512x512 to 2048x2048
- Thumbnails: 512x512

**5. Skipping the Preview**

Always preview before final generation to catch issues early. This saves tokens and time.

**Bonus Mistake: Inconsistent Style**

When creating multiple assets, maintain a consistent prompt structure to ensure visual coherence across your project.`,
    category: "Tips & Tricks",
    author: "David Kim",
    authorRole: "Community Lead",
    date: "December 12, 2024",
    readTime: "7 min read",
    image: "from-amber-500 to-orange-600",
    featured: false
  },
  {
    id: 6,
    title: "The Rise of AI-Generated Game Assets: Industry Analysis",
    excerpt: "How AI is transforming game development pipelines and what it means for the future of the industry.",
    content: `The gaming industry is experiencing a paradigm shift. AI-generated assets are moving from experimental to essential.

**Market Adoption Statistics**

- 65% of indie studios now use some form of AI in their asset pipeline
- 40% of AAA studios have integrated AI tools, and this is growing rapidly
- The AI game asset market is projected to reach $1.5 billion by 2026

**Quality Evolution**

Just two years ago, AI assets required significant manual cleanup. Today, many are production-ready out of the box.

**Key Improvements**:
- Better topology and mesh quality
- More consistent texturing
- Improved UV mapping
- Game-engine-ready exports

**Economic Impact**

Studios report 50-80% reduction in asset creation costs. This is enabling smaller teams to compete with larger studios on visual quality.

**Case Studies**

**Indie RPG Studio**: Reduced character modeling time from 2 weeks to 2 days per character.

**Mobile Game Developer**: Created 200+ unique items for a match-3 game in one month instead of six.

**VR Experience Creator**: Built an entire virtual museum with historically accurate artifacts in 3 weeks.

**Creative Freedom**

With faster iteration, developers can experiment more. This is leading to more diverse and creative game designs.

**Looking Ahead**

The question is no longer whether to use AI tools, but how to integrate them effectively. Studios that master AI-assisted workflows will have significant competitive advantages in time-to-market and creative exploration.`,
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

Start with text prompts to explore different directions:

1. Write a basic prompt describing your desired asset
2. Generate 5-10 variations to explore possibilities
3. Identify elements you like from each variation
4. Refine your prompt based on what works

**Phase 2: Refinement**

Use image-to-3D for more control:

1. Select your best concept image
2. Upload as reference for 3D generation
3. Adjust generation settings for your target platform
4. Generate the 3D model

**Phase 3: Optimization**

Prepare the model for game use:

1. Reduce polygon count while maintaining visual quality
2. Set up LOD (Level of Detail) levels
3. Clean up any mesh issues
4. Optimize UV unwrapping

**Phase 4: Materials**

Apply production-quality materials:

1. Set up PBR material workflows
2. Ensure textures are properly sized (power of 2)
3. Create material variations if needed
4. Test under different lighting conditions

**Phase 5: Export**

Choose the right format:

- **Unity**: FBX or GLB
- **Unreal Engine**: FBX
- **Web/WebGL**: GLB with Draco compression
- **3D Printing**: STL or OBJ

**Phase 6: Integration**

Finalize in your game engine:

1. Import and verify materials
2. Set up colliders
3. Add animations if needed
4. Test performance and visual quality

**Pro Tips**

- Create naming conventions for organized asset libraries
- Document your successful prompts
- Build template workflows for common asset types
- Always test on target hardware before finalizing`,
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

**Real-World Impact**:
- Concept presentations that took 2 weeks now take 2 days
- Client revision cycles reduced by 60%
- More design options explored per project

**Client Communication**

AI-generated visualizations help clients understand concepts before detailed plans are drawn. This reduces costly revisions later in the project.

**Before AI**: Clients often struggled to visualize designs from blueprints and technical drawings.

**After AI**: Realistic visualizations enable immediate feedback and faster decision-making.

**Sustainable Design**

Rapid prototyping enables more exploration of sustainable design options without additional time investment.

**Case Study: Smith & Associates**

This mid-sized firm reduced their concept phase from 3 weeks to 3 days using AI visualization:

- Client satisfaction scores increased by 40%
- Won 25% more competitive bids
- Reduced pre-design costs by 50%

**Implementation Strategy**

Successful architecture firms follow this adoption path:

1. Start with internal concept exploration
2. Use AI for early client presentations
3. Integrate with traditional CAD workflows
4. Train entire team on AI tools

**The Future**

The firms embracing AI tools are winning more projects and delivering better results. Those who delay adoption risk falling behind in an increasingly competitive market.`,
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
    title: "Mastering CFG Scale: The Key to Controlled AI Generation",
    excerpt: "Deep dive into Classifier-Free Guidance and learn how to use CFG scale to achieve the perfect balance between creativity and prompt adherence.",
    content: `CFG Scale (Classifier-Free Guidance) is one of the most important yet misunderstood parameters in AI generation.

**What is CFG Scale?**

CFG Scale controls how closely the AI follows your prompt versus how much creative freedom it takes:

- **Low CFG (1-5)**: More creative, dreamy, may diverge from prompt
- **Medium CFG (6-10)**: Balanced approach, follows prompt while maintaining quality
- **High CFG (11-20)**: Strict adherence to prompt, may become oversaturated

**Optimal Settings by Use Case**

**Photorealistic Images (CFG 7-9)**
Realistic images need a balanced approach. Too high produces artificial-looking results.

**Artistic/Abstract (CFG 5-7)**
Lower values allow for more creative interpretation, perfect for artistic styles.

**Technical/Precise (CFG 10-12)**
When accuracy matters more than aesthetics, higher values ensure prompt fidelity.

**Experimental/Surreal (CFG 3-5)**
For dream-like, unexpected results, keep CFG low.

**Common Mistakes**

**Setting CFG Too High**: Beyond 12-15, images often become oversaturated, artificially contrasty, and "crispy."

**Ignoring CFG Entirely**: Default values aren't always optimal for your specific use case.

**Not Experimenting**: The ideal CFG varies by prompt, model, and desired outcome.

**Practical Workflow**

1. Start with CFG 7 for a baseline
2. Generate the same prompt at CFG 5, 7, 9, and 11
3. Compare results and identify the best range
4. Fine-tune within that range
5. Document optimal settings for future reference

Understanding CFG scale gives you fine-grained control over your AI generations.`,
    category: "Tips & Tricks",
    author: "David Kim",
    authorRole: "Community Lead",
    date: "December 3, 2024",
    readTime: "6 min read",
    image: "from-yellow-500 to-amber-600",
    featured: false
  },
  {
    id: 10,
    title: "Building Consistent Characters Across AI Generations",
    excerpt: "Learn techniques for maintaining character consistency across multiple AI-generated images, essential for comics, games, and storytelling.",
    content: `One of the biggest challenges in AI art is maintaining consistent characters across multiple images. Here's how professional creators solve this problem.

**The Consistency Challenge**

AI models don't have memory between generations. Each image is created independently, making consistent characters difficult.

**Method 1: Detailed Character Sheets**

Create a comprehensive written description:

**Physical Features**:
- "Adult woman, 28 years old, East Asian heritage"
- "Shoulder-length black hair with subtle blue highlights"
- "Almond-shaped brown eyes, small nose, full lips"

**Distinctive Features**:
- "Small scar above left eyebrow"
- "Silver ring on right index finger"
- "Always wears a red leather jacket"

Use this description consistently in every prompt.

**Method 2: Reference Images**

If your platform supports image inputs:

1. Generate your best character image
2. Use it as a reference for future generations
3. Combine with text description for best results

**Method 3: Seed Tracking**

When you get a good character:

1. Note the seed value
2. Use similar prompts with the same seed
3. Adjust other elements while maintaining character

**Method 4: Style Anchoring**

Define a consistent style:

- "In the style of Pixar 3D animation"
- "Disney-inspired character design"
- "Anime style, consistent with Studio Ghibli"

**Practical Workflow**

1. Generate 20+ variations of your character
2. Select the best one as your canonical version
3. Document every detail
4. Create a "model sheet" with multiple angles
5. Use identical character descriptions for all future generations

With practice, consistent AI characters become achievable for any project.`,
    category: "Tutorials",
    author: "Sarah Johnson",
    authorRole: "Head of AI Research",
    date: "November 28, 2024",
    readTime: "10 min read",
    image: "from-purple-500 to-violet-600",
    featured: false
  },
  {
    id: 11,
    title: "AI Art for E-commerce: Product Visualization Without Photography",
    excerpt: "How online retailers are using AI to create stunning product images, reducing costs while maintaining quality.",
    content: `E-commerce is embracing AI-generated product visualization at an unprecedented rate. Here's how it's transforming online retail.

**The Traditional Challenge**

Product photography is expensive:
- Studio rental and equipment
- Professional photographer fees
- Post-processing and retouching
- Limited variations and angles

**The AI Alternative**

AI-generated product images offer compelling advantages:

- Cost reduction of 60-80%
- Unlimited angle and lighting variations
- Rapid iteration for A/B testing
- Consistent styling across catalogs

**Best Practices for Product Images**

**1. Start with Reference**
Use existing product photos as a starting point for AI generation.

**2. Maintain Brand Consistency**
Create prompt templates that capture your brand's visual identity.

**3. Focus on Key Details**
Ensure important product features are clearly visible.

**4. Use Multiple Angles**
Generate front, side, back, and detail views.

**Case Study: Fashion Retailer**

A mid-sized fashion brand implemented AI product visualization:

- Reduced photography costs by 70%
- Increased product listings by 3x
- Maintained consistent styling across 5,000+ products
- Faster time-to-market for new items

**Limitations to Consider**

- Some products require real photography for accuracy
- Consumer trust may vary by category
- Regulatory requirements in some industries

**Implementation Strategy**

1. Start with supplementary images (lifestyle, context)
2. Expand to product variants and colors
3. Test customer response before full adoption
4. Maintain some real photography for credibility`,
    category: "Industry Trends",
    author: "Alex Chen",
    authorRole: "CEO & Founder",
    date: "November 25, 2024",
    readTime: "8 min read",
    image: "from-orange-500 to-red-600",
    featured: false
  },
  {
    id: 12,
    title: "The Complete Guide to AI Image Upscaling",
    excerpt: "Everything you need to know about enhancing AI-generated images, from basic upscaling to professional-quality enhancement.",
    content: `AI upscaling can transform good images into great ones. Here's your complete guide to getting the best results.

**What is AI Upscaling?**

AI upscaling uses neural networks to increase image resolution while adding realistic details that weren't in the original image.

**When to Use Upscaling**

- Preparing images for print
- Creating high-resolution wallpapers
- Enhancing web images for retina displays
- Recovering detail from compressed images

**Upscaling Best Practices**

**1. Start with the Best Source**
Upscaling amplifies both quality and flaws. Start with your best generation.

**2. Choose Appropriate Scale**
2x is usually optimal. 4x can introduce artifacts.

**3. Consider the Content**
Different content types may need different approaches:
- Photographs: Focus on natural detail
- Illustrations: Preserve clean lines
- Textures: Maintain patterns

**4. Review Carefully**
Always inspect upscaled images at 100% zoom for artifacts.

**Common Issues and Solutions**

**Blurriness**: Try a different upscaling model or reduce scale factor.

**Artifacts**: Lower the enhancement strength or try a different model.

**Unnatural Details**: Some upscalers add too much "enhancement." Choose a more conservative option.

**Workflow Integration**

1. Generate at standard resolution for speed
2. Select your best outputs
3. Upscale only final selections
4. Apply post-processing if needed

**Pro Tips**

- Batch process similar images for consistency
- Save upscaling for final outputs to save processing time
- Different upscalers excel at different content types`,
    category: "Tutorials",
    author: "David Kim",
    authorRole: "Community Lead",
    date: "November 20, 2024",
    readTime: "7 min read",
    image: "from-blue-500 to-indigo-600",
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

            {/* Article Body with In-Article Ads */}
            <div className="prose prose-lg prose-invert max-w-none">
              {selectedPost.content.split('\n\n').map((paragraph, index, allParagraphs) => {
                const elements = [];
                
                // Insert in-article ad after 3rd paragraph (good placement per AdSense guidelines)
                if (index === 3) {
                  elements.push(
                    <AdBanner
                      key={`ad-${index}`}
                      format="in-article"
                      pageType="content"
                      contentItemCount={blogPosts.length}
                      minContentItems={5}
                    />
                  );
                }
                
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  elements.push(
                    <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
                      {paragraph.replace(/\*\*/g, '')}
                    </h2>
                  );
                } else if (paragraph.startsWith('**')) {
                  elements.push(
                    <h3 key={index} className="text-xl font-semibold text-foreground mt-6 mb-3">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  );
                } else if (paragraph.startsWith('-') || paragraph.startsWith('1.')) {
                  elements.push(
                    <ul key={index} className="list-disc list-inside text-muted-foreground mb-4">
                      {paragraph.split('\n').map((item, i) => (
                        <li key={i}>{item.replace(/^[-\d.]\s*/, '')}</li>
                      ))}
                    </ul>
                  );
                } else {
                  elements.push(
                    <p key={index} className="text-muted-foreground mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  );
                }
                
                return elements;
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
            
            {/* In-Article Ad between Featured and Category sections */}
            <div className="mt-8 flex justify-center">
              <AdBanner
                format="in-article"
                pageType="content"
                contentItemCount={blogPosts.length}
                minContentItems={5}
              />
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
