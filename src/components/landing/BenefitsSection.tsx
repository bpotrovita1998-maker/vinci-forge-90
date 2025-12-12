import { motion } from 'framer-motion';
import { Users, Zap, DollarSign, Handshake } from 'lucide-react';

const benefits = [
  {
    icon: Users,
    title: '3D Content Creation Democratized',
    description: 'Empower anyone to create production-ready 3D assets from a simple text prompt or reference images in seconds, no need for learning specialized modeling skills.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Zap,
    title: '10x Faster Than Traditional Methods',
    description: 'Reduce hours or days of manual modeling and texturing to mere minutes, lightning fast generation speed saves you time and ensures projects stay on schedule.',
    color: 'from-yellow-500 to-orange-500',
  },
  {
    icon: DollarSign,
    title: 'Scale Creation without Scaling Costs',
    description: 'Create thousands of assets simultaneously at a fraction of traditional costs, cutting expenses for scaled 3D content creation by up to 100x.',
    color: 'from-green-500 to-emerald-500',
  },
];

const partners = [
  'Adobe', 'Unity', 'Unreal', 'Blender', 'Maya', 'Cinema 4D', 'Godot', 'Bambu'
];

export function BenefitsSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-card to-background rounded-3xl transform group-hover:scale-105 transition-transform duration-300" />
              <div className="relative p-8 space-y-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg`}>
                  <benefit.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Partners Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <Handshake className="w-8 h-8 text-primary" />
            <p className="text-lg text-muted-foreground">
              Trusted by partners and customers across industries to build the future of 3D creation
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-8 items-center">
            {partners.map((partner, index) => (
              <motion.div
                key={partner}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="px-6 py-3 rounded-lg bg-card/50 border border-border/30 hover:border-primary/30 transition-colors"
              >
                <span className="text-muted-foreground font-medium">{partner}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
