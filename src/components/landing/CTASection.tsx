import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        <div className="p-12 md:p-16 rounded-3xl bg-gradient-to-br from-card via-card/80 to-primary/10 border border-border/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(132,204,22,0.4)]"
          >
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Ready to Create Something Amazing?
          </h2>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join millions of creators using VinciAI to bring their ideas to life. 
            Start creating stunning images, videos, and 3D models today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/create')}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-semibold text-lg px-8 py-6 h-auto rounded-full shadow-[0_0_40px_rgba(132,204,22,0.3)] hover:shadow-[0_0_60px_rgba(132,204,22,0.5)] transition-all gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Start Creating Free
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="font-semibold text-lg px-8 py-6 h-auto rounded-full border-border/50 hover:border-primary/50 gap-2"
            >
              View Pricing
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-border/30">
            {[
              { value: '3M+', label: 'Creators' },
              { value: '10M+', label: 'Models Created' },
              { value: '4.9', label: 'Rating' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <p className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
