import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Image, Video } from 'lucide-react';

export default function Hero() {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = () => {
    // TODO: Connect to VinciAI backend
    console.log('Generating with prompt:', prompt);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      {/* Glowing orb effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full space-y-8 text-center"
      >
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Powered by Renaissance AI</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              VinciAI
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Create stunning images and videos with the power of artificial intelligence
          </p>
        </motion.div>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(201,169,97,0.15)]"
        >
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision... (e.g., 'A futuristic cityscape at sunset with flying vehicles')"
            className="min-h-[120px] resize-none bg-background/50 border-border/50 text-lg placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
          />
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground font-semibold text-lg h-14 shadow-[0_0_30px_rgba(201,169,97,0.3)] hover:shadow-[0_0_40px_rgba(201,169,97,0.5)] transition-all"
            >
              <Wand2 className="w-5 h-5 mr-2" />
              Generate
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none glass border-primary/20 hover:bg-primary/10 hover:border-primary/30"
              >
                <Image className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Image</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none glass border-accent/20 hover:bg-accent/10 hover:border-accent/30"
              >
                <Video className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Video</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8"
        >
          {[
            { title: 'Full HD Quality', desc: 'Up to 1920×1080 resolution' },
            { title: 'Long Videos', desc: 'Create videos up to 30 minutes' },
            { title: '3D Rendering', desc: 'Stereoscopic and object 3D' },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass rounded-xl p-4 border border-border/30 hover:border-primary/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
