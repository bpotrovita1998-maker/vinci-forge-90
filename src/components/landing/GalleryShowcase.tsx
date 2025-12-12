import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Image as ImageIcon, Video, Box, Package, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import ThreeDThumbnail from '@/components/ThreeDThumbnail';
import { useNavigate } from 'react-router-dom';

interface GalleryItem {
  id: string;
  type: 'image' | 'video' | '3d' | 'cad';
  prompt: string;
  outputs: string[];
  completedAt: Date;
}

const typeFilters = [
  { id: 'all', label: 'All', icon: null },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'video', label: 'Videos', icon: Video },
  { id: '3d', label: '3D Models', icon: Box },
  { id: 'cad', label: 'CAD', icon: Package },
];

export function GalleryShowcase() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGalleryItems = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, type, prompt, outputs, completed_at')
          .eq('status', 'completed')
          .not('outputs', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(12);

        if (error) throw error;

        const validItems = (data || [])
          .filter((job: any) => {
            const outputs = job.outputs as string[];
            if (!outputs || outputs.length === 0) return false;
            // Filter out base64 images and keep URL-based outputs
            const hasValidUrl = outputs.some((output: string) => 
              output?.startsWith('http') && !output.includes('data:')
            );
            return hasValidUrl;
          })
          .map((job: any) => ({
            id: job.id,
            type: job.type as 'image' | 'video' | '3d' | 'cad',
            prompt: job.prompt,
            outputs: (job.outputs as string[]).filter((o: string) => o?.startsWith('http')),
            completedAt: new Date(job.completed_at),
          }));

        setItems(validItems);
      } catch (error) {
        console.error('Failed to fetch gallery items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGalleryItems();
  }, []);

  const filteredItems = activeFilter === 'all' 
    ? items 
    : items.filter(item => item.type === activeFilter);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-3 h-3" />;
      case 'video': return <Video className="w-3 h-3" />;
      case '3d': return <Box className="w-3 h-3" />;
      case 'cad': return <Package className="w-3 h-3" />;
      default: return null;
    }
  };

  return (
    <section className="py-24 px-4 bg-gradient-to-b from-transparent via-card/30 to-transparent">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Community Showcase
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore what creators are building with VinciAI
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-2"
        >
          {typeFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <Button
                key={filter.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.id)}
                className={`gap-2 ${isActive ? 'bg-primary text-primary-foreground' : 'border-border/50'}`}
              >
                {Icon && <Icon className="w-4 h-4" />}
                {filter.label}
              </Button>
            );
          })}
        </motion.div>

        {/* Gallery Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <Box className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group relative aspect-square rounded-2xl bg-card border border-border/50 overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Content */}
                    {item.type === '3d' || item.type === 'cad' ? (
                      <ThreeDThumbnail
                        modelUrl={item.outputs[0]}
                        jobId={item.id}
                      />
                    ) : item.type === 'video' ? (
                      <video
                        src={item.outputs[0]}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    ) : (
                      <img
                        src={item.outputs[0]}
                        alt={item.prompt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}

                    {/* Type Badge */}
                    <Badge 
                      variant="secondary" 
                      className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm"
                    >
                      {getTypeIcon(item.type)}
                      <span className="ml-1 capitalize text-xs">{item.type}</span>
                    </Badge>

                    {/* Hover Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent transition-opacity duration-300 ${
                      hoveredItem === item.id ? 'opacity-100' : 'opacity-0'
                    }`}>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-sm text-foreground line-clamp-2 mb-3">
                          {item.prompt}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* CTA */}
        <div className="text-center">
          <Button 
            variant="outline" 
            className="gap-2 border-border/50 hover:border-primary/50"
            onClick={() => navigate('/create')}
          >
            Start Creating
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
