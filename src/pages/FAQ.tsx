import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  HelpCircle, 
  Search,
  ChevronDown,
  Sparkles,
  CreditCard,
  Image,
  Video,
  Box,
  Shield,
  Zap,
  Users,
  Download,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Footer } from "@/components/landing/Footer";
import AdBanner from "@/components/AdBanner";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SEO } from "@/components/SEO";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: typeof HelpCircle;
  color: string;
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    faqs: [
      {
        question: "What is VinciAI?",
        answer: "VinciAI is an AI-powered creative platform that allows you to generate stunning images, videos, and 3D models from text descriptions. Our Renaissance-inspired AI technology makes professional-quality content creation accessible to everyone, regardless of technical skill level."
      },
      {
        question: "How do I get started with VinciAI?",
        answer: "Getting started is easy! Simply create a free account, navigate to the Create page, enter a text description of what you want to generate, and click Generate. Our AI will create your content in seconds. You can then download, edit, or share your creations."
      },
      {
        question: "Do I need any design or technical skills?",
        answer: "No technical skills are required! VinciAI is designed for everyone. Simply describe what you want in plain English, and our AI handles the rest. We also provide tutorials and prompt guides to help you get the best results."
      },
      {
        question: "What types of content can I create?",
        answer: "VinciAI supports multiple content types: AI-generated images (up to Full HD resolution), AI videos (various durations and styles), 3D models (for games, printing, and visualization), and CAD files (for engineering and manufacturing). Each type has specialized options for customization."
      }
    ]
  },
  {
    id: "pricing",
    title: "Pricing & Plans",
    icon: CreditCard,
    color: "from-emerald-500 to-green-600",
    faqs: [
      {
        question: "Is VinciAI free to use?",
        answer: "Yes! VinciAI offers a free tier with limited generations per month. This allows you to explore our platform and create content without any upfront cost. For users who need more generations or advanced features, we offer affordable Pro and Business plans."
      },
      {
        question: "What's included in the free plan?",
        answer: "The free plan includes a set number of image generations per month, access to basic resolution options, standard processing speeds, and the ability to download your creations. You can also earn additional free generations by engaging with our platform."
      },
      {
        question: "What are the benefits of upgrading to Pro?",
        answer: "Pro users enjoy unlimited generations, higher resolution outputs (up to 4K), priority processing for faster results, advanced customization options, no watermarks, commercial usage rights, and priority customer support."
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer: "Absolutely! You can cancel your subscription at any time with no cancellation fees. Your Pro benefits will remain active until the end of your current billing period. We believe in earning your business every month."
      },
      {
        question: "Do you offer refunds?",
        answer: "Yes, we offer a 7-day money-back guarantee for new Pro subscribers. If you're not satisfied with your experience, contact our support team within 7 days of your initial subscription for a full refund."
      }
    ]
  },
  {
    id: "images",
    title: "Image Generation",
    icon: Image,
    color: "from-cyan-500 to-blue-600",
    faqs: [
      {
        question: "What resolution can I generate images at?",
        answer: "Free users can generate images up to 1024x1024 pixels. Pro users have access to higher resolutions including Full HD (1920x1080) and custom aspect ratios for various use cases like social media, print, and web."
      },
      {
        question: "How do I write effective prompts for images?",
        answer: "For best results, be specific and descriptive. Include details about the subject, style, lighting, colors, and mood. For example, instead of 'a cat', try 'a fluffy orange tabby cat sitting on a windowsill, soft morning light, photorealistic style'. Check our Tutorials page for more tips."
      },
      {
        question: "Can I edit or modify generated images?",
        answer: "Yes! VinciAI includes image editing capabilities. You can make adjustments, apply filters, crop, resize, and even use our AI to modify specific parts of an image while keeping the rest intact."
      },
      {
        question: "What file formats are supported for download?",
        answer: "Generated images can be downloaded in PNG (for high quality with transparency), JPG (for smaller file sizes), and WebP (for web optimization). Pro users also have access to additional formats."
      }
    ]
  },
  {
    id: "videos",
    title: "Video Generation",
    icon: Video,
    color: "from-pink-500 to-rose-600",
    faqs: [
      {
        question: "How long can AI-generated videos be?",
        answer: "Video duration varies by plan. Free users can generate short clips (up to 5 seconds), while Pro users can create longer videos up to 30 seconds. For extended content, you can use our video stitching feature to combine multiple clips."
      },
      {
        question: "Can I create videos from images?",
        answer: "Yes! VinciAI supports image-to-video generation. Upload an image, describe the motion or animation you want, and our AI will bring your static image to life with smooth, natural movement."
      },
      {
        question: "What video resolutions are available?",
        answer: "Free users can generate videos at 720p, while Pro users have access to Full HD (1080p) resolution. All videos are optimized for smooth playback across devices and platforms."
      },
      {
        question: "Can I add music or audio to my videos?",
        answer: "Currently, VinciAI generates silent videos. You can easily add music or voiceovers using any video editing software after downloading. We're working on integrated audio features for future updates."
      }
    ]
  },
  {
    id: "3d-models",
    title: "3D Model Generation",
    icon: Box,
    color: "from-amber-500 to-orange-600",
    faqs: [
      {
        question: "What can I use the 3D models for?",
        answer: "Our 3D models are suitable for game development, 3D printing, architectural visualization, product design, virtual reality, animations, and more. Models come with proper topology and can be exported in industry-standard formats."
      },
      {
        question: "What export formats are available for 3D models?",
        answer: "We support multiple formats including OBJ, GLTF/GLB (for web and games), FBX (for game engines and animation software), STL (for 3D printing), and USDZ (for AR on Apple devices)."
      },
      {
        question: "Are the 3D models game-ready?",
        answer: "Yes! Our models are optimized with proper polygon counts and UV mapping. Pro users can access additional optimization options including LOD (Level of Detail) generation and texture atlas creation for game engines."
      },
      {
        question: "Can I convert 2D images to 3D models?",
        answer: "Absolutely! Our image-to-3D feature analyzes your 2D image and generates a fully textured 3D model. This works great for product mockups, character creation, and converting artwork into 3D assets."
      }
    ]
  },
  {
    id: "account",
    title: "Account & Privacy",
    icon: Shield,
    color: "from-indigo-500 to-violet-600",
    faqs: [
      {
        question: "How is my data protected?",
        answer: "We take privacy seriously. Your data is encrypted in transit and at rest. We never sell your personal information to third parties. Generated content is stored securely and only accessible to you unless you choose to share it publicly."
      },
      {
        question: "Who owns the content I create?",
        answer: "You retain full ownership of all content you create with VinciAI. Pro users receive commercial usage rights, meaning you can use your creations for business purposes, sell them, or include them in commercial projects."
      },
      {
        question: "Can I delete my account and data?",
        answer: "Yes, you have full control over your data. You can delete your account at any time from the Settings page. This will permanently remove your account information and all stored generations. This action cannot be undone."
      },
      {
        question: "Do you use my creations to train AI?",
        answer: "No, we do not use your personal creations to train our AI models unless you explicitly opt-in to contribute to model improvement. Your creative work remains yours alone."
      }
    ]
  },
  {
    id: "technical",
    title: "Technical Support",
    icon: Zap,
    color: "from-teal-500 to-cyan-600",
    faqs: [
      {
        question: "Why is my generation taking a long time?",
        answer: "Generation time varies based on complexity, resolution, and current server load. Images typically take 10-30 seconds, while videos and 3D models may take 1-5 minutes. Pro users get priority queue access for faster processing."
      },
      {
        question: "What browsers are supported?",
        answer: "VinciAI works best on modern browsers including Chrome, Firefox, Safari, and Edge. We recommend keeping your browser updated to the latest version for optimal performance and feature compatibility."
      },
      {
        question: "Can I use VinciAI on mobile devices?",
        answer: "Yes! VinciAI is fully responsive and works on smartphones and tablets. You can create, view, and download content on any device with a modern web browser."
      },
      {
        question: "I'm experiencing an error. What should I do?",
        answer: "First, try refreshing the page or clearing your browser cache. If the issue persists, check our status page for any ongoing service issues. You can also contact our support team through the Contact page with details about the error."
      }
    ]
  }
];

export default function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Generate JSON-LD structured data for FAQ schema
  useEffect(() => {
    const allFAQs = faqCategories.flatMap(category => category.faqs);
    
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": allFAQs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };

    // Create or update the script element
    let script = document.querySelector('script[data-schema="faq"]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-schema', 'faq');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(faqSchema);

    // Cleanup on unmount
    return () => {
      const existingScript = document.querySelector('script[data-schema="faq"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  const totalFAQs = faqCategories.reduce((acc, cat) => acc + cat.faqs.length, 0);

  return (
    <>
      <SEO 
        title="Frequently Asked Questions"
        description="Find answers to common questions about VinciAI. Learn about pricing, features, image generation, video creation, 3D models, and more."
        keywords="VinciAI FAQ, AI image generator questions, pricing FAQ, support, help"
      />
      <div className="min-h-screen bg-background">
      {/* Spacer for fixed global navigation */}
      <div className="h-20" />
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Breadcrumbs />
      </div>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Find answers to common questions about VinciAI. Can't find what you're looking for? Contact our support team.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-6 text-lg glass border-border/30"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {totalFAQs} questions across {faqCategories.length} categories
            </p>
          </motion.div>
        </div>
      </section>

      {/* Category Cards */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {faqCategories.map((category, index) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`glass border-border/30 p-4 cursor-pointer transition-all hover:border-primary/30 ${isActive ? 'border-primary ring-2 ring-primary/20' : ''}`}
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{category.title}</h3>
                        <p className="text-xs text-muted-foreground">{category.faqs.length} questions</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Accordions */}
      <section className="py-8 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {(searchQuery ? filteredCategories : (activeCategory ? faqCategories.filter(c => c.id === activeCategory) : faqCategories)).map((category, catIndex) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.1 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                </div>
                
                <Card className="glass border-border/30 overflow-hidden">
                  <Accordion type="single" collapsible className="w-full">
                    {category.faqs.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`${category.id}-${faqIndex}`}
                        className="border-border/30"
                      >
                        <AccordionTrigger className="px-6 py-4 hover:bg-muted/30 text-left">
                          <span className="text-foreground font-medium pr-4">{faq.question}</span>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </Card>
              </motion.div>
            );
          })}

          {searchQuery && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground mb-6">
                We couldn't find any FAQs matching "{searchQuery}"
              </p>
              <Link to="/contact">
                <Button className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contact Support
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Still Have Questions CTA */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary/20 via-secondary/10 to-accent/20 rounded-3xl p-12 border border-border/30"
          >
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Still Have Questions?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Our support team is here to help. Reach out and we'll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact">
                <Button size="lg" className="gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Contact Support
                </Button>
              </Link>
              <Link to="/tutorials">
                <Button size="lg" variant="outline" className="gap-2">
                  <Sparkles className="w-5 h-5" />
                  View Tutorials
                </Button>
              </Link>
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
            contentItemCount={totalFAQs}
            minContentItems={10}
          />
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
}
