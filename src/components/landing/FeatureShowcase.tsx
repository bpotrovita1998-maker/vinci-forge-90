import { motion } from 'framer-motion';
import { 
  Zap, 
  Palette, 
  Settings2, 
  Rocket,
  Image,
  Video,
  Box,
  Sparkles,
  Layers,
  Wand2,
  Paintbrush,
  RefreshCw,
  FileDown,
  Shield,
  Globe
} from 'lucide-react';

const featureCategories = [
  {
    id: 'speed',
    badge: 'Creation Speed',
    title: 'Instant 3D Model Creation in Seconds',
    description: 'VinciAI turbocharges every phase of 3D asset creation, slashing turnaround times from days to minutes.',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    features: [
      { icon: Image, title: 'Image to 3D Model', desc: 'Turn your 2D images into stunning 3D models' },
      { icon: Video, title: '3D to Video', desc: 'Bring 3D models to life with AI video' },
      { icon: Box, title: 'Text to 3D Model', desc: 'Create 3D models from simple text descriptions' },
      { icon: Paintbrush, title: 'AI Texturing', desc: 'Enhance 3D models with AI-generated textures' },
    ],
  },
  {
    id: 'creativity',
    badge: 'Creative Flexibility',
    title: 'Unlock Limitless Creative Freedom',
    description: 'Craft props, characters, and environments in any style, from photorealistic to cartoon or sci-fi.',
    icon: Palette,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    features: [
      { icon: Sparkles, title: 'AI Prompt Helper', desc: 'Transform vague ideas into clear prompts' },
      { icon: Layers, title: 'PBR Maps Support', desc: 'Diffuse, Roughness, Metallic, Normal maps' },
      { icon: Palette, title: 'Versatile Styles', desc: 'Realistic, cartoon, hand painted, fantasy' },
      { icon: Box, title: 'Limitless Assets', desc: 'Characters, props, environments, and more' },
    ],
  },
  {
    id: 'control',
    badge: 'Fine-tuned Control',
    title: 'Total Creative Authority and Control',
    description: 'Guide generation with input settings, iterate on results, and fine-tune until perfect.',
    icon: Settings2,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    features: [
      { icon: Image, title: 'Text to Image', desc: 'Generate captivating images from text' },
      { icon: Layers, title: 'Multi-view to 3D', desc: 'Front, side, back views to high-fidelity 3D' },
      { icon: RefreshCw, title: 'Free Retry', desc: 'Re-generate models for free with same prompt' },
      { icon: Wand2, title: 'AI Texture Editing', desc: 'Create unlimited textures on same mesh' },
    ],
  },
  {
    id: 'production',
    badge: 'Production Readiness',
    title: 'Ready for Professional Production',
    description: 'Built-in post-processing to meet poly budgets, fix mesh issues, and export in industry formats.',
    icon: Rocket,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    features: [
      { icon: Layers, title: 'Asset Management', desc: 'Browse, preview, and manage generated assets' },
      { icon: Shield, title: 'Private Licensed', desc: 'Commercialize while protecting from misuse' },
      { icon: FileDown, title: 'Multiple Formats', desc: 'FBX, GLB, OBJ, STL, 3MF, USDZ, BLEND' },
      { icon: Globe, title: 'Resize & Pivot', desc: 'Set real-world dimensions and pivot points' },
    ],
  },
];

export function FeatureShowcase() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto space-y-32">
        {featureCategories.map((category, categoryIndex) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`grid lg:grid-cols-2 gap-12 items-center ${
              categoryIndex % 2 === 1 ? 'lg:flex-row-reverse' : ''
            }`}
          >
            {/* Text Content */}
            <div className={`space-y-6 ${categoryIndex % 2 === 1 ? 'lg:order-2' : ''}`}>
              <span className={`inline-block px-4 py-1.5 rounded-full ${category.bgColor} ${category.color} text-sm font-medium`}>
                {category.badge}
              </span>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {category.title}
              </h2>
              
              <p className="text-lg text-muted-foreground">
                {category.description}
              </p>

              <div className="grid sm:grid-cols-2 gap-4 pt-4">
                {category.features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${category.bgColor}`}>
                      <feature.icon className={`w-5 h-5 ${category.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className={`relative ${categoryIndex % 2 === 1 ? 'lg:order-1' : ''}`}>
              <div className={`relative h-80 md:h-96 rounded-3xl bg-gradient-to-br from-card to-background border border-border/50 overflow-hidden`}>
                {/* Decorative elements */}
                <div className={`absolute inset-0 ${category.bgColor} opacity-20`} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <category.icon className={`w-32 h-32 ${category.color} opacity-30`} />
                </div>
                
                {/* Floating cards */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-8 left-8 p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                      <Sparkles className={`w-4 h-4 ${category.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">AI Powered</span>
                  </div>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-8 right-8 p-4 rounded-xl bg-card/80 backdrop-blur border border-border/50 shadow-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">10x Faster</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
