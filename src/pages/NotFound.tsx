import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, 
  Search, 
  ArrowLeft, 
  Sparkles, 
  BookOpen, 
  Image, 
  Video, 
  Box,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const suggestedLinks = [
  {
    title: "Create Content",
    description: "Generate AI images, videos, and 3D models",
    href: "/create",
    icon: Sparkles,
    color: "from-violet-500 to-purple-600"
  },
  {
    title: "Browse Gallery",
    description: "Explore community creations and get inspired",
    href: "/gallery",
    icon: Image,
    color: "from-cyan-500 to-blue-600"
  },
  {
    title: "Tutorials",
    description: "Learn how to get the best results",
    href: "/tutorials",
    icon: BookOpen,
    color: "from-emerald-500 to-green-600"
  },
  {
    title: "Pricing",
    description: "View plans and upgrade options",
    href: "/pricing",
    icon: Box,
    color: "from-amber-500 to-orange-600"
  }
];

const helpfulResources = [
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact Support", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms-of-service" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to tutorials with search query
      navigate(`/tutorials?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            {/* 404 Graphic */}
            <div className="relative mb-8">
              <h1 className="text-[150px] md:text-[200px] font-bold text-muted/20 leading-none select-none">
                404
              </h1>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <HelpCircle className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto mb-2">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-8">
              Requested: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-md mx-auto mb-12">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for tutorials, guides, or features..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-24 py-6 text-base glass border-border/30"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  Search
                </Button>
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <Link to="/">
                <Button variant="default" className="gap-2">
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              </Link>
              <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Link to="/contact">
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Contact Support
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Suggested Pages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-foreground text-center mb-6">
              Popular Destinations
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {suggestedLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Link to={link.href}>
                      <Card className="glass border-border/30 p-4 hover:border-primary/30 transition-all group h-full">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center mb-3`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                          {link.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {link.description}
                        </p>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Additional Resources */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground mb-3">Other helpful pages:</p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {helpfulResources.map((resource) => (
                <Link 
                  key={resource.href} 
                  to={resource.href}
                  className="text-sm text-primary hover:underline"
                >
                  {resource.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
