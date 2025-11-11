import { NavLink } from './NavLink';
import { Button } from './ui/button';
import { Image, Grid3x3, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navigation() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30 backdrop-blur-xl"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <Sparkles className="w-8 h-8 text-primary relative" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              VinciAI
            </span>
          </NavLink>

          {/* Nav Links */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-primary"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </NavLink>
            <NavLink
              to="/gallery"
              className="text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-primary"
            >
              <Button variant="ghost" size="sm" className="gap-2">
                <Grid3x3 className="w-4 h-4" />
                <span className="hidden sm:inline">Gallery</span>
              </Button>
            </NavLink>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
