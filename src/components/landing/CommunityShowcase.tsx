import { motion } from 'framer-motion';
import { Quote, Star, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    quote: "Incredible text to 3D and more! No limits to your imagination. If you have a creative mind, you can indulge yourself in creating everything that comes to mind, in a 3D version.",
    author: "Max Casu",
    role: "AI Creator",
    rating: 5,
  },
  {
    quote: "The level of texture and ease of the UI are incredible and unmatched. I use way too many 3D tools and this sits at the top of my workflow. Thanks VinciAI!",
    author: "Tom Blake",
    role: "Digital Artist",
    rating: 5,
  },
  {
    quote: "My current go-to for AI 3D model generation. The latest generations have been a huge leap in quality for both text and image to 3D. Plus the easy rigging and animation options.",
    author: "Jon Draper",
    role: "AI Animator & Developer",
    rating: 5,
  },
];

const userStories = [
  {
    title: "How Tony Renou Transformed Student Art into Interactive 3D Game Assets",
    category: "Education",
  },
  {
    title: "From 300 Hours in Blender to 5 Minutes per Model",
    category: "Productivity",
  },
  {
    title: "Solo Indie Dev's Journey: Turning Surreal 3D Platformer Dreams Into Reality",
    category: "Game Dev",
  },
  {
    title: "Crafting a Lovecraftian Horror Game with AI",
    category: "Game Dev",
  },
];

const galleryItems = [
  { title: "Cyber Dragon", category: "Character" },
  { title: "Medieval Castle", category: "Environment" },
  { title: "Sci-Fi Weapon", category: "Props" },
  { title: "Fantasy Creature", category: "Character" },
  { title: "Modern Interior", category: "Environment" },
  { title: "Steampunk Robot", category: "Character" },
];

export function CommunityShowcase() {
  return (
    <section className="py-24 px-4 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <div className="max-w-7xl mx-auto space-y-24">
        {/* Showcase Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Showcase
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore what our community of creators is building with VinciAI
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group relative aspect-square rounded-2xl bg-card border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                      <Star className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.category}</span>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-card to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="w-full">
                    View Details
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <Button variant="outline" className="gap-2">
              Explore More
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* User Stories */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
            User Stories
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {userStories.map((story, index) => (
              <motion.a
                key={story.title}
                href="#"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group block p-4 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all"
              >
                <div className="aspect-video rounded-lg bg-muted/30 mb-3 flex items-center justify-center">
                  <Star className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <span className="text-xs text-primary font-medium">{story.category}</span>
                <h4 className="text-sm font-medium text-foreground mt-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {story.title}
                </h4>
              </motion.a>
            ))}
          </div>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                
                <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">
                      {testimonial.author[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
