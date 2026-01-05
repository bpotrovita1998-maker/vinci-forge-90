import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Image,
  Video,
  Box,
  Wand2,
  Download,
  Palette,
  Check,
  Play,
  Crown,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    id: "welcome",
    title: "Welcome to VinciAI",
    subtitle: "Your AI-Powered Creative Studio",
    description: "Create stunning images, videos, and 3D models with the power of artificial intelligence. No design skills required — just describe what you want!",
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    features: [
      { icon: Image, label: "AI Images", desc: "Generate photorealistic or artistic images" },
      { icon: Video, label: "AI Videos", desc: "Create smooth animated videos" },
      { icon: Box, label: "3D Models", desc: "Build game-ready 3D assets" }
    ]
  },
  {
    id: "prompts",
    title: "The Power of Prompts",
    subtitle: "Describe Your Vision",
    description: "The secret to great AI art is writing effective prompts. Be specific about style, lighting, colors, and mood. The more detail you provide, the better your results!",
    icon: Wand2,
    color: "from-cyan-500 to-blue-600",
    tips: [
      "Start with the subject: 'A majestic lion'",
      "Add style: 'in oil painting style'",
      "Describe lighting: 'golden hour sunlight'",
      "Set the mood: 'dramatic and powerful'"
    ],
    example: "A majestic lion in oil painting style, golden hour sunlight, dramatic and powerful, detailed fur texture, renaissance masterpiece"
  },
  {
    id: "features",
    title: "Explore Features",
    subtitle: "Powerful Creative Tools",
    description: "VinciAI offers a complete suite of AI-powered tools to bring your creative vision to life. Here's what you can do:",
    icon: Palette,
    color: "from-emerald-500 to-green-600",
    features: [
      { icon: Image, label: "Text to Image", desc: "Generate images from text descriptions" },
      { icon: Video, label: "Text to Video", desc: "Create animated videos from prompts" },
      { icon: Box, label: "Text to 3D", desc: "Build 3D models from descriptions" },
      { icon: Zap, label: "Prompt Enhancer", desc: "AI-powered prompt improvement" }
    ]
  },
  {
    id: "workflow",
    title: "Your Creative Workflow",
    subtitle: "From Idea to Creation",
    description: "Follow these simple steps to create your first masterpiece:",
    icon: Play,
    color: "from-pink-500 to-rose-600",
    workflow: [
      { step: 1, title: "Choose Content Type", desc: "Select Image, Video, or 3D" },
      { step: 2, title: "Write Your Prompt", desc: "Describe what you want to create" },
      { step: 3, title: "Adjust Settings", desc: "Fine-tune resolution, style, etc." },
      { step: 4, title: "Generate & Download", desc: "Watch AI create your content" }
    ]
  },
  {
    id: "tokens",
    title: "Understanding Tokens",
    subtitle: "Your Creative Currency",
    description: "VinciAI uses a token system to manage generations. Here's how it works:",
    icon: Crown,
    color: "from-amber-500 to-orange-600",
    tokenInfo: [
      { label: "Free Tokens", desc: "New users get 5 free image generations to start", icon: Sparkles },
      { label: "Watch Ads", desc: "Earn extra generations by watching short ads", icon: Play },
      { label: "Pro Subscription", desc: "Unlimited generations with PRO membership", icon: Crown }
    ]
  },
  {
    id: "ready",
    title: "You're All Set!",
    subtitle: "Start Creating Amazing Content",
    description: "You now have everything you need to start creating. Head to the Create page and bring your imagination to life!",
    icon: Check,
    color: "from-green-500 to-emerald-600",
    cta: true
  }
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();
  
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const StepIcon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="glass border-border/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Getting Started</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onSkip}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                  <StepIcon className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-6">
                <p className="text-sm text-primary font-medium mb-1">{step.subtitle}</p>
                <h2 className="text-2xl font-bold text-foreground mb-3">{step.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{step.description}</p>
              </div>

              {/* Step-specific content */}
              {step.features && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {step.features.map((feature, i) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div key={i} className="text-center p-4 rounded-xl bg-muted/30 border border-border/30">
                        <FeatureIcon className="w-8 h-8 text-primary mx-auto mb-2" />
                        <p className="font-medium text-foreground text-sm">{feature.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {step.tips && (
                <div className="space-y-4 mb-6">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
                    <p className="text-sm font-medium text-foreground mb-3">Tips for great prompts:</p>
                    <ul className="space-y-2">
                      {step.tips.map((tip, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {step.example && (
                    <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-2">Example prompt:</p>
                      <p className="text-sm text-foreground italic">"{step.example}"</p>
                    </div>
                  )}
                </div>
              )}

              {step.workflow && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {step.workflow.map((item) => (
                    <div key={item.step} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step.tokenInfo && (
                <div className="space-y-3 mb-6">
                  {step.tokenInfo.map((info, i) => {
                    const InfoIcon = info.icon;
                    return (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
                        <InfoIcon className="w-8 h-8 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{info.label}</p>
                          <p className="text-sm text-muted-foreground">{info.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {step.cta && (
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 text-green-500">
                    <Check className="w-6 h-6" />
                    <span className="font-medium">Tutorial Complete!</span>
                  </div>
                  <Link to="/create">
                    <Button size="lg" className="gap-2" onClick={onComplete}>
                      <Sparkles className="w-5 h-5" />
                      Start Creating
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-border/30">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {!isLastStep && (
              <Button onClick={handleNext} className="gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
            {isLastStep && (
              <Button onClick={onComplete} className="gap-2">
                <Check className="w-4 h-4" />
                Finish
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default OnboardingWizard;
