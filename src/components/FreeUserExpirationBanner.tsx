import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, Download, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Job } from '@/types/job';
import { toast } from 'sonner';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface FreeUserExpirationBannerProps {
  jobs?: Job[];
}

export function FreeUserExpirationBanner({ jobs = [] }: FreeUserExpirationBannerProps) {
  const { isAdmin, subscription } = useSubscription();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  
  const isPro = isAdmin || subscription?.status === 'active';
  
  // Don't show banner for PRO users
  if (isPro) return null;

  const imageJobs = jobs.filter(j => j.options.type === 'image' && j.outputs.length > 0);
  const totalImages = imageJobs.reduce((acc, j) => acc + j.outputs.length, 0);

  const handleDownloadAll = async () => {
    if (imageJobs.length === 0) {
      toast.info('No images to download');
      return;
    }

    setIsDownloading(true);
    toast.info(`Preparing ${totalImages} images for download...`);

    try {
      const zip = new JSZip();
      let successCount = 0;
      let failCount = 0;

      for (const job of imageJobs) {
        for (let i = 0; i < job.outputs.length; i++) {
          const url = job.outputs[i];
          try {
            const response = await fetch(url);
            if (!response.ok) {
              failCount++;
              continue;
            }
            const blob = await response.blob();
            const extension = url.includes('.png') ? 'png' : url.includes('.jpg') || url.includes('.jpeg') ? 'jpg' : 'webp';
            const fileName = `image_${job.id.slice(0, 8)}_${i + 1}.${extension}`;
            zip.file(fileName, blob);
            successCount++;
          } catch (error) {
            console.error('Failed to download image:', url, error);
            failCount++;
          }
        }
      }

      if (successCount === 0) {
        toast.error('No images could be downloaded. They may have expired.');
        setIsDownloading(false);
        return;
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const date = new Date().toISOString().split('T')[0];
      saveAs(content, `vinci-images-${date}.zip`);
      
      toast.success(`Downloaded ${successCount} images${failCount > 0 ? ` (${failCount} failed)` : ''}`);
    } catch (error) {
      console.error('Bulk download failed:', error);
      toast.error('Failed to create download package');
    } finally {
      setIsDownloading(false);
    }
  };
  
  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <Clock className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-amber-200">
          <strong>Free Tier:</strong> Your generated images expire after <strong>24 hours</strong>. 
          Download them to save permanently, or upgrade to PRO for unlimited cloud storage.
        </div>
        <div className="flex gap-2 shrink-0">
          {totalImages > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20 gap-2"
              onClick={handleDownloadAll}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download All ({totalImages})
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/20"
            onClick={() => navigate('/pricing')}
          >
            Upgrade to PRO
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}