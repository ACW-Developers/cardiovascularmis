import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTourConfig, TourStep, RoleTourConfig } from '@/lib/tourSteps';
import { useAuth } from '@/contexts/AuthContext';

interface TourContextType {
  isActive: boolean;
  isSpeaking: boolean;
  currentStepIndex: number;
  tourConfig: RoleTourConfig | null;
  currentStep: TourStep | null;
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipToStep: (index: number) => void;
  playOverview: () => void;
  stopSpeaking: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 means showing overview
  const [tourConfig, setTourConfig] = useState<RoleTourConfig | null>(null);

  useEffect(() => {
    if (role) {
      setTourConfig(getTourConfig(role));
    }
  }, [role]);

  const currentStep = tourConfig && currentStepIndex >= 0 
    ? tourConfig.steps[currentStepIndex] 
    : null;

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const startTour = useCallback(() => {
    if (!tourConfig) return;
    setIsActive(true);
    setCurrentStepIndex(-1);
  }, [tourConfig]);

  const endTour = useCallback(() => {
    stopSpeaking();
    setIsActive(false);
    setCurrentStepIndex(-1);
    localStorage.setItem('tourCompleted', 'true');
  }, [stopSpeaking]);

  const playOverview = useCallback(() => {
    if (tourConfig) {
      speak(tourConfig.overview);
    }
  }, [tourConfig, speak]);

  const nextStep = useCallback(() => {
    if (!tourConfig) return;
    
    if (currentStepIndex < tourConfig.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      speak(tourConfig.steps[newIndex].audioText);
    } else {
      endTour();
    }
  }, [currentStepIndex, tourConfig, speak, endTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      if (tourConfig) {
        speak(tourConfig.steps[newIndex].audioText);
      }
    } else if (currentStepIndex === 0) {
      setCurrentStepIndex(-1);
    }
  }, [currentStepIndex, tourConfig, speak]);

  const skipToStep = useCallback((index: number) => {
    if (!tourConfig || index < 0 || index >= tourConfig.steps.length) return;
    setCurrentStepIndex(index);
    speak(tourConfig.steps[index].audioText);
  }, [tourConfig, speak]);

  return (
    <TourContext.Provider
      value={{
        isActive,
        isSpeaking,
        currentStepIndex,
        tourConfig,
        currentStep,
        startTour,
        endTour,
        nextStep,
        prevStep,
        skipToStep,
        playOverview,
        stopSpeaking,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
