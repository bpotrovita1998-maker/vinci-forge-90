import { motion } from 'framer-motion';
import { Upload, Wand2, Download, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Input',
    description: 'Upload a clear image or type a short text prompt, no 3D skills required.',
    icon: Upload,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    number: 2,
    title: 'Generate',
    description: 'Watch it become a high-quality 3D model aligned to your input in moments.',
    icon: Wand2,
    color: 'from-primary to-primary-glow',
  },
  {
    number: 3,
    title: 'Download',
    description: 'Preview your model in the browser, then download for your workflow.',
    icon: Download,
    color: 'from-green-500 to-emerald-500',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            See It Live
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting lines */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-blue-500 via-primary to-green-500 opacity-30" />
          
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              <div className="flex flex-col items-center text-center">
                {/* Step Number */}
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <step.icon className="w-10 h-10 text-white" />
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center">
                    <span className="text-sm font-bold text-foreground">{step.number}</span>
                  </div>
                </div>

                {/* Arrow between steps */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex absolute top-10 -right-4 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}

                {/* Content */}
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground max-w-xs">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Example Cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-16"
        >
          {steps.map((step, index) => (
            <div
              key={`example-${step.number}`}
              className="relative h-48 rounded-2xl bg-card border border-border/50 overflow-hidden group hover:border-primary/30 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
              <div className="absolute inset-0 flex items-center justify-center">
                <step.icon className="w-16 h-16 text-muted-foreground/30" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-card to-transparent">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
