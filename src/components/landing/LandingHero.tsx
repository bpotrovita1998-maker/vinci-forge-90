import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-20 pb-12 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              The Easiest Way to Create with AI
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight"
          >
            <span className="text-foreground">The Easiest Way to</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              Create 3D Models
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Meet the world's most popular and intuitive free AI 3D model generator. 
            Transform text and images into stunning 3D models in seconds with our 
            text & image to 3D model tool—no experience required!
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="pt-4"
          >
            <Button
              size="lg"
              onClick={() => navigate('/create')}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-semibold text-lg px-8 py-6 h-auto rounded-full shadow-[0_0_40px_rgba(132,204,22,0.3)] hover:shadow-[0_0_60px_rgba(132,204,22,0.5)] transition-all gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Creating
            </Button>
          </motion.div>
        </motion.div>

        {/* Floating 3D Models Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 relative"
        >
          <div className="flex justify-center items-end gap-4 md:gap-6 flex-wrap">
            {/* Model cards */}
            {[
              { color: 'from-purple-500 to-blue-500', title: 'Film Production', delay: 0 },
              { color: 'from-cyan-500 to-teal-500', title: 'Product Design', delay: 0.1 },
              { color: 'from-yellow-500 to-orange-500', title: 'Education', delay: 0.2 },
              { color: 'from-green-500 to-emerald-500', title: 'Game Dev', delay: 0.3 },
              { color: 'from-pink-500 to-rose-500', title: '3D Printing', delay: 0.4 },
              { color: 'from-indigo-500 to-purple-500', title: 'VR/AR', delay: 0.5 },
              { color: 'from-amber-500 to-yellow-500', title: 'Interior Design', delay: 0.6 },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + item.delay }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group cursor-pointer"
              >
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all`}>
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/20 backdrop-blur" />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.title}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
