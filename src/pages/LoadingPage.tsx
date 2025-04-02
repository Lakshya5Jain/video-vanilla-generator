
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GenerationProgress } from "@/types";
import { motion } from "framer-motion";
import { checkProgress } from "@/lib/api";
import { toast } from "sonner";
import { Clock, Sparkles, PencilLine, Film, Upload, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = React.useState<GenerationProgress>({
    progress: 0,
    status: "Starting up the AI engines..."
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  
  const processId = location.state?.processId;
  
  // Define the steps for the video creation process
  const steps = [
    { id: 0, label: "Generating AI Script", icon: <PencilLine className="text-green-400" /> },
    { id: 1, label: "Bringing your image to life with Lemon Slice", icon: <Sparkles className="text-purple-400" /> },
    { id: 2, label: "Fusing everything together with Creatomate", icon: <Film className="text-orange-400" /> },
    { id: 3, label: "Your awesome TikTok video is ready!", icon: <Check className="text-green-500" /> }
  ];
  
  useEffect(() => {
    if (!processId) {
      toast.error("No process ID found. Redirecting to create page.");
      navigate("/create");
      return;
    }
    
    // Start timer
    const timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    
    const pollProgress = async () => {
      try {
        const progressData = await checkProgress(processId);
        setProgress(progressData);
        
        // Count words in script if available
        if (progressData.scriptText && wordCount === 0) {
          const words = progressData.scriptText.trim().split(/\s+/).length;
          setWordCount(words);
        }
        
        // Determine current step based on status
        if (progressData.status.includes("Generating script")) {
          setCurrentStep(0);
        } else if (progressData.status.includes("Generating AI video")) {
          setCurrentStep(1);
        } else if (progressData.status.includes("Creating final")) {
          setCurrentStep(2);
        } else if (progressData.status.includes("Complete")) {
          setCurrentStep(3);
        }
        
        if (progressData.progress >= 100) {
          navigate("/result", { 
            state: { result: progressData },
            replace: true 
          });
        } else {
          // Continue polling
          setTimeout(pollProgress, 2000);
        }
      } catch (error) {
        console.error("Error checking progress:", error);
        toast.error("Error checking progress. Please try again.");
        navigate("/create");
      }
    };
    
    pollProgress();
    
    // Cleanup on unmount
    return () => {
      clearInterval(timerInterval);
    };
  }, [processId, navigate, wordCount]);

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    toast.info("Processing canceled");
    navigate("/create");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculate estimated time based on word count: 30 seconds + 5 seconds per word
  // Only show this after we have the script (wordCount > 0)
  const estimatedTimeInSeconds = wordCount > 0 ? 30 + (wordCount * 5) : 0;
  const remainingTime = Math.max(0, estimatedTimeInSeconds - elapsedTime);

  // Generate bubbles for the lava lamp effect
  const bubbles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    size: 50 + Math.random() * 180,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * 5,
    initialX: Math.random() * 100,
    initialY: 50 + Math.random() * 40,
    color: i % 2 === 0 ? 
      `rgba(255, ${107 + Math.floor(Math.random() * 50)}, ${Math.floor(Math.random() * 80)}, 0.${4 + Math.floor(Math.random() * 4)})` : 
      `rgba(${200 + Math.floor(Math.random() * 55)}, ${70 + Math.floor(Math.random() * 30)}, 0, 0.${4 + Math.floor(Math.random() * 4)})`
  }));

  return (
    <div className="min-h-screen overflow-hidden relative bg-gradient-to-b from-black via-zinc-900 to-black">
      {/* Improved lava lamp effect background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-black opacity-80"></div>
        
        {bubbles.map((bubble) => (
          <motion.div
            key={bubble.id}
            className="absolute rounded-full blur-xl"
            style={{
              backgroundColor: bubble.color,
              width: bubble.size,
              height: bubble.size,
              left: `${bubble.initialX}%`,
              top: `${bubble.initialY}%`,
            }}
            animate={{
              x: [
                0,
                Math.random() * 200 - 100,
                Math.random() * 200 - 100,
                0
              ],
              y: [
                0,
                -300 - Math.random() * 300,
                -600 - Math.random() * 200,
                -900
              ],
              scale: [
                1,
                1 + Math.random() * 0.3,
                1 - Math.random() * 0.2,
                1
              ]
            }}
            transition={{
              repeat: Infinity,
              duration: bubble.duration,
              delay: bubble.delay,
              ease: "easeInOut",
              times: [0, 0.3, 0.7, 1]
            }}
          />
        ))}
      </div>

      <div className="flex items-center justify-center p-4 min-h-screen relative z-10">
        <motion.div 
          className="relative max-w-md w-full p-8 bg-zinc-900/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800/80"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <button 
            onClick={handleCancel}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-800 text-gray-300 hover:bg-zinc-700 transition-colors z-10"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            {/* Bouncing ball animation */}
            <motion.div 
              className="mb-6 relative h-20 w-20"
            >
              <motion.div
                className="absolute w-16 h-16 bg-gradient-to-br from-quicktok-orange to-rose-600 rounded-full shadow-lg"
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 0.9, 1],
                  borderRadius: ["50%", "30%", "50%"]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-700 rounded-full opacity-60"
                animate={{
                  width: [10, 16, 10],
                  opacity: [0.6, 0.4, 0.6]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>

            <h2 className="text-2xl font-bold text-center mb-2 text-quicktok-orange">Processing Your Video</h2>
            <p className="text-gray-300 text-center mb-6">{steps[currentStep].label}</p>
            
            {/* Time indicator with improved estimation - only show after we have word count */}
            {wordCount > 0 && (
              <div className="flex items-center justify-center mb-4 text-sm text-gray-400">
                <Clock className="h-4 w-4 mr-2" />
                <span>Elapsed: {formatTime(elapsedTime)} | Remaining: ~{formatTime(remainingTime)}</span>
              </div>
            )}

            {/* Progress indicator */}
            <div className="w-full mb-2">
              <Progress value={progress.progress} className="h-2 bg-zinc-800" />
            </div>
            
            {/* Progress percentage */}
            <p className="text-quicktok-orange font-medium mb-6">{progress.progress}%</p>
            
            {/* Status timeline - only show steps */}
            <div className="w-full border-l-2 border-zinc-800 pl-4 space-y-3 mb-6">
              {steps.map((step, index) => (
                <motion.div 
                  key={step.id}
                  initial={{ opacity: index <= currentStep ? 1 : 0.4, x: 0 }}
                  animate={{ 
                    opacity: index <= currentStep ? 1 : 0.4,
                    x: 0
                  }}
                  className="flex items-start"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 -ml-5 mr-3 ${
                    index < currentStep ? 'bg-green-500' : 
                    index === currentStep ? 'bg-quicktok-orange' : 
                    'bg-gray-600'
                  }`} />
                  <div className="flex items-center">
                    <span className={`mr-2 ${
                      index <= currentStep ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {step.icon}
                    </span>
                    <p className={`text-sm ${
                      index <= currentStep ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Powered by Creatomate API for Automated Video Generation<br />
              and Lemon Slice for Talking Avatar
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-100">Cancel Video Generation?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to cancel this video generation? All progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4">
            <AlertDialogCancel className="bg-zinc-800 hover:bg-zinc-700 text-gray-200 border-zinc-700">
              Continue Processing
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-red-600 hover:bg-red-700">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LoadingPage;
