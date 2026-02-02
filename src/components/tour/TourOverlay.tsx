import { useEffect, useState, useRef } from 'react';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pause, 
  SkipForward, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TourOverlay() {
  const {
    isActive,
    isSpeaking,
    currentStepIndex,
    tourConfig,
    currentStep,
    endTour,
    nextStep,
    prevStep,
    playOverview,
    stopSpeaking,
  } = useTour();

  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Find and highlight the current element
  useEffect(() => {
    if (!isActive || !currentStep?.selector) {
      setHighlightRect(null);
      return;
    }

    const element = document.querySelector(currentStep.selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setHighlightRect(null);
    }
  }, [isActive, currentStep]);

  if (!isActive || !tourConfig) return null;

  const isOverview = currentStepIndex === -1;
  const totalSteps = tourConfig.steps.length;
  const progress = isOverview ? 0 : ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 z-[100] pointer-events-none"
    >
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity duration-300"
        onClick={endTour}
      />
      
      {/* Spotlight cutout for highlighted element */}
      {highlightRect && (
        <div
          className="absolute bg-transparent border-4 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
          }}
        />
      )}

      {/* Tour card */}
      <Card className={cn(
        "fixed pointer-events-auto shadow-2xl border-2 border-primary/20 max-w-md w-[90vw]",
        isOverview 
          ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          : highlightRect
            ? "bottom-8 left-1/2 -translate-x-1/2"
            : "bottom-8 left-1/2 -translate-x-1/2"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            {isSpeaking ? (
              <Volume2 className="w-5 h-5 text-primary animate-pulse" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-semibold text-sm">
              {isOverview ? 'System Overview' : `Step ${currentStepIndex + 1} of ${totalSteps}`}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={endTour} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2">
            {isOverview ? 'Welcome to CardioRegistry' : currentStep?.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isOverview ? tourConfig.overview : currentStep?.description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-2">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 pt-2 border-t border-border">
          <div className="flex gap-2">
            {isSpeaking ? (
              <Button variant="outline" size="sm" onClick={stopSpeaking}>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={isOverview ? playOverview : () => {}}>
                <Play className="w-4 h-4 mr-1" />
                {isOverview ? 'Play Audio' : 'Replay'}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!isOverview && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={nextStep}>
              {isOverview ? (
                <>
                  Start Tour
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : currentStepIndex === totalSteps - 1 ? (
                'Finish'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
            {isOverview && (
              <Button variant="ghost" size="sm" onClick={endTour}>
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
