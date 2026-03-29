import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if dismissed forever
    if (localStorage.getItem("fitfuel_pwa_dismissed") === "true") {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("User accepted the A2HS prompt");
    } else {
      console.log("User dismissed the A2HS prompt");
    }
    
    // Clear the deferredPrompt so it can be garbage collected
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("fitfuel_pwa_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] md:bottom-4 md:left-auto md:right-4 md:max-w-md animate-in slide-in-from-bottom-full duration-500">
      <div className="bg-primary/95 backdrop-blur-md text-primary-foreground p-4 md:rounded-2xl shadow-2xl border-t md:border border-white/20 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-bold text-sm">Install FitFuel Hub</p>
          <p className="text-xs opacity-80 mt-0.5">Add to your homescreen for the best experience.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleInstall} 
            size="sm" 
            className="bg-white text-primary hover:bg-white/90 gap-1 rounded-full px-4 h-8"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
          <button 
            onClick={handleDismiss}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors opacity-80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
