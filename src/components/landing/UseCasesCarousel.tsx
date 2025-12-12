import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, Package, GraduationCap, Gamepad2, Printer, Glasses, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const useCases = [
  {
    id: 'film',
    title: 'Film Production',
    icon: Film,
    color: 'from-purple-500 to-blue-500',
    bgGradient: 'bg-gradient-to-br from-purple-900/40 to-blue-900/20',
    description: 'Cut costs and accelerate VFX and previsualization workflows with VinciAI',
    features: ['Fast Previs & Look Dev', 'Streamlined VFX Workflow', 'Industry-Standard Quality'],
  },
  {
    id: 'product',
    title: 'Product Design',
    icon: Package,
    color: 'from-cyan-500 to-teal-500',
    bgGradient: 'bg-gradient-to-br from-cyan-900/40 to-teal-900/20',
    description: 'Deliver creativity, speed, and precision in your product design workflow',
    features: ['Rapid Concept to 3D Prototype', 'Design Smarter, Spend Less', 'Democratize Modeling Skills'],
  },
  {
    id: 'education',
    title: 'Education',
    icon: GraduationCap,
    color: 'from-yellow-500 to-orange-500',
    bgGradient: 'bg-gradient-to-br from-yellow-900/40 to-orange-900/20',
    description: 'Affordable and Accessible 3D Models for educators and students',
    features: ['Unleash creativity in 3D printing', 'Power Game & XR Education', 'Speed Up Educational Apps'],
  },
  {
    id: 'game',
    title: 'Game Development',
    icon: Gamepad2,
    color: 'from-green-500 to-emerald-500',
    bgGradient: 'bg-gradient-to-br from-green-900/40 to-emerald-900/20',
    description: 'Slash 3D asset & animation cost in game development',
    features: ['Remesh & PBR Texture support', 'Animate Your Characters', 'Export to Any Game Engine'],
  },
  {
    id: '3dprint',
    title: '3D Printing',
    icon: Printer,
    color: 'from-pink-500 to-rose-500',
    bgGradient: 'bg-gradient-to-br from-pink-900/40 to-rose-900/20',
    description: 'Turn your ideas into 3D-printable models in seconds',
    features: ['No modeling barriers', 'Printer-Ready Formats', 'Industry Standard Quality'],
  },
  {
    id: 'vrar',
    title: 'VR/AR',
    icon: Glasses,
    color: 'from-indigo-500 to-purple-500',
    bgGradient: 'bg-gradient-to-br from-indigo-900/40 to-purple-900/20',
    description: 'Low poly, optimized 3D assets for VR/AR experiences',
    features: ['Rapid 3D Asset Creation', 'Optimized for Real-Time', 'Built for VR/AR Workflows'],
  },
  {
    id: 'interior',
    title: 'Interior Design',
    icon: Home,
    color: 'from-amber-500 to-yellow-500',
    bgGradient: 'bg-gradient-to-br from-amber-900/40 to-yellow-900/20',
    description: 'Turn sketches and mood boards into production-ready 3D interior assets',
    features: ['Concept to Presentation, Fast', 'Photorealistic Results', '3D Design Made Easy'],
  },
];

export function UseCasesCarousel() {
  const [activeIndex, setActiveIndex] = useState(3); // Start with Game Development

  const activeCase = useCases[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? useCases.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === useCases.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="py-20 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Use Case Tiles */}
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-12 flex-wrap">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            const isActive = index === activeIndex;
            
            return (
              <motion.button
                key={useCase.id}
                onClick={() => setActiveIndex(index)}
                className={`relative group flex flex-col items-center p-3 md:p-4 rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? `${useCase.bgGradient} ring-2 ring-primary/50` 
                    : 'bg-card/50 hover:bg-card'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br ${useCase.color}`}>
                  <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <span className={`text-xs md:text-sm font-medium text-center ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {useCase.title}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary"
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Active Use Case Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCase.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={`rounded-3xl p-8 md:p-12 ${activeCase.bgGradient}`}
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold text-foreground">
                  {activeCase.title}
                </h2>
                <p className="text-lg text-muted-foreground">
                  {activeCase.description}
                </p>
                <ul className="space-y-3">
                  {activeCase.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary-glow font-semibold"
                >
                  Explore More
                </Button>
              </div>
              
              <div className="relative h-64 md:h-80 rounded-2xl bg-gradient-to-br from-card to-background flex items-center justify-center overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${activeCase.color} opacity-20`} />
                <activeCase.icon className="w-32 h-32 text-muted-foreground/30" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="rounded-full border-border/50 hover:border-primary/50"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="rounded-full border-border/50 hover:border-primary/50"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
