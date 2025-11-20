import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';

interface ImageComparisonSliderProps {
  images: string[];
  onRemoveImage: (index: number) => void;
}

export default function ImageComparisonSlider({ images, onRemoveImage }: ImageComparisonSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<number | null>(null);

  if (images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleCompare = (index: number) => {
    setCompareIndex(compareIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {/* Main Slider */}
      <Card className="relative overflow-hidden bg-background/50 border-primary/20">
        <div className="relative aspect-video">
          {/* Primary Image */}
          <div className={`absolute inset-0 transition-all duration-300 ${compareIndex !== null ? 'w-1/2' : 'w-full'}`}>
            <img
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="w-full h-full object-contain bg-muted/30"
            />
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
              Image {currentIndex + 1}
            </Badge>
          </div>

          {/* Comparison Image */}
          {compareIndex !== null && (
            <div className="absolute inset-0 left-1/2 w-1/2 border-l-2 border-primary">
              <img
                src={images[compareIndex]}
                alt={`Image ${compareIndex + 1}`}
                className="w-full h-full object-contain bg-muted/30"
              />
              <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
                Image {compareIndex + 1}
              </Badge>
            </div>
          )}

          {/* Navigation Controls */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 hover:bg-background"
                onClick={goToNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Action Buttons */}
          <div className="absolute bottom-2 right-2 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full bg-background/80 hover:bg-background"
              onClick={() => setFullscreenImage(currentIndex)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full"
              onClick={() => {
                onRemoveImage(currentIndex);
                if (currentIndex >= images.length - 1) {
                  setCurrentIndex(Math.max(0, currentIndex - 1));
                }
                if (compareIndex === currentIndex) {
                  setCompareIndex(null);
                }
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Counter */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      </Card>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary ring-2 ring-primary/50'
                  : index === compareIndex
                  ? 'border-accent ring-2 ring-accent/50'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <Badge className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs px-1.5 py-0">
                {index + 1}
              </Badge>
              
              {/* Compare Toggle */}
              {index !== currentIndex && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompare(index);
                  }}
                  className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                    compareIndex === index
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                  }`}
                >
                  {compareIndex === index ? '✓' : 'C'}
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Dialog */}
      <Dialog open={fullscreenImage !== null} onOpenChange={() => setFullscreenImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {fullscreenImage !== null && (
            <div className="relative w-full h-full flex items-center justify-center bg-black/90">
              <img
                src={images[fullscreenImage]}
                alt={`Fullscreen ${fullscreenImage + 1}`}
                className="max-w-full max-h-[90vh] object-contain"
              />
              <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                Image {fullscreenImage + 1} / {images.length}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          💡 Use arrows to navigate • Click "C" on thumbnails to compare images side-by-side
        </p>
      )}
    </div>
  );
}
