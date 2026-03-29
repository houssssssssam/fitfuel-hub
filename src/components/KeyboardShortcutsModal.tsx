import { X, Command } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { description: "Show keyboard shortcuts", keys: ["?"] },
  { description: "Go to Dashboard", keys: ["g", "d"] },
  { description: "Go to Food Tracking", keys: ["g", "f"] },
  { description: "Go to Workouts", keys: ["g", "w"] },
  { description: "Go to Meal Suggestions", keys: ["g", "m"] },
  { description: "Go to Profile", keys: ["g", "p"] },
  { description: "Close modal / unfocus input", keys: ["Esc"] },
  { description: "Search foods (when in Food Tracking)", keys: ["/"] },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-border shadow-2xl rounded-xl overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/50">
          <div className="flex items-center gap-2 text-foreground">
            <Command className="h-4 w-4" />
            <span className="font-semibold text-sm">Keyboard Shortcuts</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {shortcuts.map((shortcut, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 px-3 hover:bg-white/5 rounded-lg transition-colors group">
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{shortcut.description}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {shortcut.keys.map((key, j) => (
                    <kbd key={j} className="h-6 min-w-[24px] px-1.5 flex items-center justify-center text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700/50 rounded-md shadow-sm">
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
