import HumanBodySVG from '@/components/HumanBodySVG';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell, Heart, ArrowLeft, X, Loader2, CheckCircle2, ChevronDown, ListFilter, Flame, Activity, Info, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';

// --- Types ---
type ViewMode = 'front' | 'back';
type TabMode = 'library' | 'saved';

interface MuscleZone {
  id: string;
  name: string;
  bodyPart: string;
  view: ViewMode;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const muscleZones: MuscleZone[] = [
  // Front
  { id: 'chest', name: 'Chest', bodyPart: 'chest', view: 'front', cx: 200, cy: 175, rx: 45, ry: 30 },
  { id: 'left-shoulder', name: 'Left Shoulder', bodyPart: 'shoulders', view: 'front', cx: 130, cy: 155, rx: 25, ry: 25 },
  { id: 'right-shoulder', name: 'Right Shoulder', bodyPart: 'shoulders', view: 'front', cx: 270, cy: 155, rx: 25, ry: 25 },
  { id: 'left-bicep', name: 'Left Bicep', bodyPart: 'upper arms', view: 'front', cx: 110, cy: 215, rx: 18, ry: 35 },
  { id: 'right-bicep', name: 'Right Bicep', bodyPart: 'upper arms', view: 'front', cx: 290, cy: 215, rx: 18, ry: 35 },
  { id: 'left-forearm', name: 'Left Forearm', bodyPart: 'lower arms', view: 'front', cx: 105, cy: 280, rx: 14, ry: 30 },
  { id: 'right-forearm', name: 'Right Forearm', bodyPart: 'lower arms', view: 'front', cx: 295, cy: 280, rx: 14, ry: 30 },
  { id: 'abs', name: 'Abs', bodyPart: 'waist', view: 'front', cx: 200, cy: 250, rx: 35, ry: 45 },
  { id: 'left-quad', name: 'Left Quad', bodyPart: 'upper legs', view: 'front', cx: 165, cy: 360, rx: 28, ry: 50 },
  { id: 'right-quad', name: 'Right Quad', bodyPart: 'upper legs', view: 'front', cx: 235, cy: 360, rx: 28, ry: 50 },
  { id: 'left-calf', name: 'Left Calf', bodyPart: 'lower legs', view: 'front', cx: 165, cy: 460, rx: 18, ry: 35 },
  { id: 'right-calf', name: 'Right Calf', bodyPart: 'lower legs', view: 'front', cx: 235, cy: 460, rx: 18, ry: 35 },
  // Back
  { id: 'back', name: 'Back', bodyPart: 'back', view: 'back', cx: 200, cy: 210, rx: 55, ry: 55 },
  { id: 'neck', name: 'Neck/Traps', bodyPart: 'neck', view: 'back', cx: 200, cy: 140, rx: 30, ry: 20 },
  { id: 'left-tricep', name: 'Left Tricep', bodyPart: 'upper arms', view: 'back', cx: 110, cy: 215, rx: 18, ry: 35 },
  { id: 'right-tricep', name: 'Right Tricep', bodyPart: 'upper arms', view: 'back', cx: 290, cy: 215, rx: 18, ry: 35 },
  { id: 'glutes', name: 'Glutes', bodyPart: 'upper legs', view: 'back', cx: 200, cy: 310, rx: 50, ry: 30 },
  { id: 'left-hamstring', name: 'Left Hamstring', bodyPart: 'upper legs', view: 'back', cx: 165, cy: 380, rx: 26, ry: 45 },
  { id: 'right-hamstring', name: 'Right Hamstring', bodyPart: 'upper legs', view: 'back', cx: 235, cy: 380, rx: 26, ry: 45 },
];

const allBodyParts = Array.from(new Set(muscleZones.map(m => m.bodyPart))).sort();
const MAX_EXERCISES_PER_MUSCLE = 20;
const EXERCISE_FETCH_POOL = 120;

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[]; // From DB
}

interface PexelsSearchResponse {
  photos?: Array<{
    src?: {
      medium?: string;
    };
  }>;
}

const normalizeEquipment = (equipment: string): string => {
  const normalized = equipment.trim().toLowerCase();

  if (normalized.includes('body weight')) return 'Body Weight';
  if (normalized.includes('barbell')) return 'Barbell';
  if (normalized.includes('dumbbell')) return 'Dumbbell';
  if (normalized.includes('cable')) return 'Cable';
  if (normalized.includes('smith')) return 'Smith Machine';
  if (normalized.includes('leverage')) return 'Leverage Machine';
  if (normalized.includes('band')) return 'Resistance Band';
  if (normalized.includes('kettlebell')) return 'Kettlebell';
  if (normalized.includes('ez bar')) return 'EZ Bar';
  if (normalized.includes('medicine ball')) return 'Medicine Ball';
  if (normalized.includes('stability ball')) return 'Stability Ball';
  if (normalized.includes('bosu')) return 'BOSU';
  if (normalized.includes('roller')) return 'Foam Roller';
  if (normalized.includes('trx') || normalized.includes('suspension')) return 'Suspension';
  if (normalized.includes('machine')) return 'Machine';

  return equipment
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const rebalanceExercisesByEquipment = (items: Exercise[]): Exercise[] => {
  const uniqueById = Array.from(new Map(items.map((exercise) => [exercise.id, exercise])).values());
  const grouped = new Map<string, Exercise[]>();

  uniqueById.forEach((exercise) => {
    const key = normalizeEquipment(exercise.equipment);
    const bucket = grouped.get(key) ?? [];
    bucket.push(exercise);
    grouped.set(key, bucket);
  });

  const preferredOrder = [
    'Body Weight',
    'Dumbbell',
    'Barbell',
    'Cable',
    'Machine',
    'Leverage Machine',
    'Smith Machine',
    'Resistance Band',
    'Kettlebell',
    'EZ Bar',
    'Medicine Ball',
    'Stability Ball',
    'Suspension',
    'BOSU',
    'Foam Roller',
  ];

  const orderedKeys = [
    ...preferredOrder.filter((key) => grouped.has(key)),
    ...Array.from(grouped.keys()).filter((key) => !preferredOrder.includes(key)).sort(),
  ];

  const balanced: Exercise[] = [];
  while (balanced.length < MAX_EXERCISES_PER_MUSCLE) {
    let addedInPass = false;

    for (const key of orderedKeys) {
      const bucket = grouped.get(key);
      if (!bucket || bucket.length === 0) continue;

      const nextExercise = bucket.shift();
      if (nextExercise) {
        balanced.push(nextExercise);
        addedInPass = true;
      }

      if (balanced.length >= MAX_EXERCISES_PER_MUSCLE) break;
    }

    if (!addedInPass) break;
  }

  return balanced;
};

const pexelsCache = new Map<string, string>();
const photoGradientMap: Record<string, string> = {
  'barbell': 'from-orange-500/20 to-orange-900/40',
  'dumbbell': 'from-cyan-500/20 to-cyan-900/40',
  'body weight': 'from-green-500/20 to-green-900/40',
  'cable': 'from-purple-500/20 to-purple-900/40',
  'machine': 'from-red-500/20 to-red-900/40',
  'leverage machine': 'from-yellow-500/20 to-yellow-900/40',
  'assisted': 'from-blue-500/20 to-blue-900/40',
};

const getPhotoGradient = (equipment: string): string =>
  photoGradientMap[equipment?.toLowerCase()] || 'from-gray-500/20 to-gray-900/40';

const getEquipmentIcon = (equipment: string): string => {
  const normalized = equipment?.toLowerCase();

  if (normalized.includes('barbell')) return '🏋️';
  if (normalized.includes('dumbbell')) return '💪';
  if (normalized === 'body weight') return '🤸';
  if (normalized.includes('cable')) return '🔗';
  if (normalized.includes('machine')) return '⚙️';

  return '🏃';
};

const fetchPexelsPhoto = async (
  exerciseName: string,
  targetMuscle: string
): Promise<string | null> => {
  const query = `${exerciseName} ${targetMuscle} exercise gym`;
  const cacheKey = exerciseName.toLowerCase();
  const apiKey = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

  if (!apiKey) return null;

  if (pexelsCache.has(cacheKey)) {
    return pexelsCache.get(cacheKey) ?? null;
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!res.ok) return null;

    const data = (await res.json()) as PexelsSearchResponse;
    const photoUrl = data.photos?.[0]?.src?.medium ?? null;

    if (photoUrl) {
      pexelsCache.set(cacheKey, photoUrl);
    }

    return photoUrl;
  } catch {
    return null;
  }
};

const fetchFromExerciseDB = async (endpoint: string) => {
  const hasParams = endpoint.includes('?');
  const query = hasParams ? `&limit=${EXERCISE_FETCH_POOL}&offset=0` : `?limit=${EXERCISE_FETCH_POOL}&offset=0`;
  const url = `https://exercisedb.p.rapidapi.com${endpoint}${query}`;
  try {
    const res = await axios.get(url, {
      headers: {
        'X-RapidAPI-Key': import.meta.env.VITE_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com'
      }
    });
    return res.data;
  } catch (err: any) {
    if (err.response?.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw err;
  }
};

const ExercisePhoto = ({
  exerciseName,
  targetMuscle,
  equipment,
  index = 0,
  className = 'h-48 rounded-t-xl',
}: {
  exerciseName: string;
  targetMuscle: string;
  equipment: string;
  index?: number;
  className?: string;
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const gradient = getPhotoGradient(equipment);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus('loading');
      setPhotoUrl(null);

      fetchPexelsPhoto(exerciseName, targetMuscle).then((url) => {
        if (cancelled) return;

        if (url) {
          setPhotoUrl(url);
        } else {
          setStatus('error');
        }
      });
    }, index * 100);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [exerciseName, index, targetMuscle]);

  return (
    <div className={`relative overflow-hidden bg-secondary ${className}`}>
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-secondary flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      {photoUrl && (
        <img
          src={photoUrl}
          alt={exerciseName}
          className={`w-full h-full object-cover transition-all duration-500 ${status === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          loading="lazy"
        />
      )}

      {status === 'error' && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2 p-4`}>
          <span className="text-4xl">{getEquipmentIcon(equipment)}</span>
          <p className="text-xs text-white/50 text-center capitalize leading-tight px-2">
            {exerciseName}
          </p>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
    </div>
  );
};

export default function ExerciseLibrary() {
  const [activeTab, setActiveTab] = useState<TabMode>('library');
  const [viewMode, setViewMode] = useState<ViewMode>('front');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [savedExercises, setSavedExercises] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  const [filterDifficulty, setFilterDifficulty] = useState('All');
  const [filterEquipment, setFilterEquipment] = useState('All');

  useEffect(() => {
    const ls = localStorage.getItem('savedExercises');
    if (ls) setSavedExercises(JSON.parse(ls));
  }, []);

  const saveToLocalStorage = (newSaved: string[]) => {
    setSavedExercises(newSaved);
    localStorage.setItem('savedExercises', JSON.stringify(newSaved));
  };

  const toggleSaveExercise = (exId: string) => {
    if (savedExercises.includes(exId)) {
      saveToLocalStorage(savedExercises.filter(id => id !== exId));
      toast.success("Removed from saved");
    } else {
      saveToLocalStorage([...savedExercises, exId]);
      toast.success("Saved to your library ♡");
    }
  };

  const loadExercisesForMuscle = async (bodyPart: string) => {
    const cacheKey = `ex_bodyPart_${bodyPart}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setExercises(JSON.parse(cached) as Exercise[]);
      return;
    }
    
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const data = (await fetchFromExerciseDB(`/exercises/bodyPart/${bodyPart}`)) as Exercise[];
      const balanced = rebalanceExercisesByEquipment(data);
      setExercises(balanced);
      sessionStorage.setItem(cacheKey, JSON.stringify(balanced));
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err.message || "Failed to load exercises.");
      setExercises([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedExercises = async () => {
    if (savedExercises.length === 0) {
      setExercises([]);
      return;
    }

    setIsLoading(true);
    setErrorStatus(null);
    try {
      // Free tier doesn't have batch fetch by ID, so we fetch each cached or real one.
      const loaded: Exercise[] = [];
      for (const id of savedExercises) {
        const cacheKey = `ex_id_${id}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          loaded.push(JSON.parse(cached) as Exercise);
        } else {
          try {
             const data = (await fetchFromExerciseDB(`/exercises/exercise/${id}`)) as Exercise;
             loaded.push(data);
             sessionStorage.setItem(cacheKey, JSON.stringify(data));
          } catch (e) {
             console.log(`Failed to load saved id ${id}`);
          }
        }
      }
      setExercises(loaded);
    } catch (err: any) {
      setErrorStatus(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'saved') {
      loadSavedExercises();
      setSelectedMuscle(null);
    } else {
      if (selectedMuscle) {
        loadExercisesForMuscle(selectedMuscle);
      } else {
        setExercises([]);
        setErrorStatus(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedMuscle]);

  const clickMuscle = (bodyPart: string) => {
    setActiveTab('library');
    setFilterDifficulty('All');
    setFilterEquipment('All');
    setSelectedMuscle(bodyPart);
    const top = document.getElementById('exercise-grid-target');
    if (top && window.innerWidth < 768) {
       top.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const eqMatch =
        filterEquipment === 'All' || normalizeEquipment(ex.equipment) === filterEquipment;
      return eqMatch;
    });
  }, [exercises, filterEquipment, filterDifficulty]);

  const equipmentOptions = useMemo(
    () => ['All', ...Array.from(new Set(exercises.map((exercise) => normalizeEquipment(exercise.equipment)))).sort()],
    [exercises]
  );

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* TABS HEADER */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-10 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-500 flex items-center gap-3">
            <Dumbbell className="h-6 w-6 text-primary" />
            Exercise Library
          </h1>
          <p className="text-sm text-slate-400 mt-1 hidden sm:block">Interactive MuscleWiki powered by ExerciseDB</p>
        </div>
        <div className="flex bg-secondary/50 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('library')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'library' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Dumbbell className="h-4 w-4" /> Library
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'saved' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart className={`h-4 w-4 ${activeTab === 'saved' ? 'fill-white' : ''}`} /> Saved ({savedExercises.length})
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'library' && (
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            
            {/* LEFT PANEL - SVG BODY MAP */}
            <div className="w-full lg:w-[45%] flex flex-col items-center">
              
              <div className="flex bg-secondary p-1 rounded-full mb-6 border border-white/5 shadow-xl">
                <button 
                  onClick={() => setViewMode('front')}
                  className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === 'front' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Front View
                </button>
                <button 
                  onClick={() => setViewMode('back')}
                  className={`px-8 py-2 rounded-full text-sm font-semibold transition-all ${viewMode === 'back' ? 'bg-primary text-primary-foreground shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  Back View
                </button>
              </div>

              <div className="relative w-full max-w-[400px] aspect-[1/1.5] bg-secondary/10 rounded-3xl border border-white/5 p-4 flex justify-center items-center overflow-hidden">
                
                {/* Background Grid/Dots Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <svg width="100%" height="100%">
                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <circle cx="10" cy="10" r="1.5" fill="white"/>
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#dots)"/>
                  </svg>
                </div>

                <HumanBodySVG 
                 view={viewMode} 
                 selectedMuscle={selectedMuscle} 
                 hoveredMuscle={hoveredMuscle} 
                 onMuscleClick={clickMuscle} 
                 onMuscleHover={setHoveredMuscle} 
              />

                {/* Instruction Badge */}
                {!selectedMuscle && (
                  <div className="absolute bottom-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-slate-300 animate-pulse flex items-center gap-2 pointer-events-none">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Select a muscle to view exercises
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 justify-center mt-6 text-xs text-slate-400">
                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="w-3 h-3 rounded-full bg-white/5 border border-white/20"/>
                  <span>Not selected</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="w-3 h-3 rounded-full bg-primary/30 border border-primary/50"/>
                  <span>Hover</span>
                </div>
                <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-full border border-white/5">
                  <div className="w-3 h-3 rounded-full bg-primary/60 border border-primary animate-pulse"/>
                  <span>Selected</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - LISTINGS */}
            <div className="w-full lg:w-[55%] flex flex-col" id="exercise-grid-target">
              
              {!selectedMuscle ? (
                // NO MUSCLE SELECTED - ALL CATEGORY GRID
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Muscle Groups</h2>
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">10 Groups</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {allBodyParts.map((bp) => (
                      <div 
                        key={bp}
                        onClick={() => clickMuscle(bp)}
                        className="group flex flex-col items-center justify-center p-6 bg-secondary/40 hover:bg-primary/20 hover:border-primary/50 border border-white/5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:-translate-y-1"
                      >
                        <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-primary text-slate-400 group-hover:text-primary-foreground transition-all">
                          <Activity className="h-6 w-6" />
                        </div>
                        <span className="font-medium text-slate-200 capitalize text-sm">{bp.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // EXERCISES LISTING FOR SPECIFIC MUSCLE
                <div className="flex flex-col h-full bg-secondary/10 rounded-3xl p-6 border border-white/5 min-h-[600px]">
                  
                  {/* Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" onClick={() => setSelectedMuscle(null)} className="rounded-full bg-transparent border-white/10 hover:bg-white/10 h-10 w-10 shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <h2 className="text-2xl font-bold text-white capitalize flex items-center gap-3">
                          {selectedMuscle.replace('_', ' ')}
                          {exercises.length > 0 && <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">{exercises.length} Exercises</Badge>}
                        </h2>
                      </div>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  {exercises.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-white/5 bg-gradient-to-br from-secondary/60 to-secondary/20 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Curated Mix</p>
                          <p className="text-sm text-slate-300">
                            Up to {MAX_EXERCISES_PER_MUSCLE} exercises balanced across available equipment for this muscle group.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-300">
                            <ListFilter className="h-4 w-4 text-primary" />
                            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Equipment</span>
                          </div>

                          <Select value={filterEquipment} onValueChange={setFilterEquipment}>
                            <SelectTrigger className="h-11 min-w-[210px] rounded-xl border-white/10 bg-slate-950/70 text-sm text-white shadow-none ring-offset-0 focus:ring-primary/40">
                              <SelectValue placeholder="All Equipment" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-slate-950 text-slate-100">
                              {equipmentOptions.map((option) => (
                                <SelectItem
                                  key={option}
                                  value={option}
                                  className="rounded-lg py-2.5 pl-8 pr-3 text-sm focus:bg-primary/20 focus:text-white"
                                >
                                  {option === 'All' ? 'All Equipment' : option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {equipmentOptions.slice(1).map((option) => {
                          const count = exercises.filter((exercise) => normalizeEquipment(exercise.equipment) === option).length;
                          return (
                            <Badge
                              key={option}
                              variant="outline"
                              className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                                filterEquipment === option
                                  ? 'border-primary/60 bg-primary/15 text-primary'
                                  : 'border-white/10 bg-white/[0.03] text-slate-300'
                              }`}
                            >
                              {option} ({count})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Grid / Loader / Error */}
                  {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
                      <p className="text-slate-400 font-medium animate-pulse">Fetching from RapidAPI ExerciseDB...</p>
                    </div>
                  ) : errorStatus ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-black/20 rounded-2xl border border-red-500/20 text-center">
                       <span className="text-4xl mb-4">🥲</span>
                       <h3 className="text-lg font-bold text-red-400 mb-2">API Connection Failed</h3>
                       <p className="text-sm text-slate-400 max-w-sm mb-6">{errorStatus}</p>
                       <Button onClick={() => loadExercisesForMuscle(selectedMuscle)} variant="default">Try Again</Button>
                    </div>
                  ) : filteredExercises.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                      <Activity className="h-12 w-12 text-slate-600 mb-4" />
                      <p className="text-slate-400 font-medium">No exercises found matching criteria.</p>
                      <Button variant="link" onClick={() => { setFilterEquipment('All'); }} className="text-primary mt-2">Clear Filters</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 pb-10">
                      {filteredExercises.map((ex, index) => {
                        return (
                        <div 
                          key={ex.id}
                          onClick={() => setActiveExercise(ex)}
                          className="bg-card/50 overflow-hidden rounded-2xl cursor-pointer hover:ring-2 hover:ring-primary/60 transition-all duration-300 border border-border group relative flex flex-col shadow-lg"
                        >
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleSaveExercise(ex.id); }}
                            className="absolute z-10 top-3 right-3 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/80 transition-all"
                          >
                            <Heart className={`h-4 w-4 transition-all ${savedExercises.includes(ex.id) ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'}`} />
                          </button>

                          <ExercisePhoto
                            exerciseName={ex.name}
                            targetMuscle={ex.target}
                            equipment={ex.equipment}
                            index={index}
                            className="h-44"
                          />
                      
                          <div className="p-4 flex-1 flex flex-col">
                            <h3 className="font-bold text-foreground capitalize text-[15px] leading-tight line-clamp-2">{ex.name}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-auto pt-4">
                              <Badge variant="secondary" className="text-[10px] capitalize bg-secondary text-slate-300 rounded-md py-0.5">{ex.equipment}</Badge>
                              <Badge variant="outline" className="text-[10px] capitalize border-primary/30 text-primary rounded-md py-0.5">{ex.target}</Badge>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

            </div>
          </div>
        )}

        {/* SAVED TAB RENDERER */}
        {activeTab === 'saved' && (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl">
               <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
                    My Saved Collection
                  </h2>
                  <p className="text-slate-400 mt-2 text-sm max-w-lg">Quick-access your favorite movements anytime. These are synced locally to your browser.</p>
               </div>
               <Badge className="bg-rose-500 text-white text-lg px-4 py-1">{savedExercises.length}</Badge>
             </div>

             {isLoading ? (
               <div className="flex items-center justify-center py-20">
                 <Loader2 className="h-10 w-10 text-rose-500 animate-spin" />
               </div>
             ) : exercises.length === 0 ? (
               <div className="text-center py-20 bg-secondary/20 rounded-3xl border border-white/5">
                 <Heart className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                 <h3 className="text-xl font-bold text-white mb-2">No saved exercises</h3>
                 <p className="text-slate-400 mb-6">Click the heart icon on any exercise to add it here.</p>
                 <Button onClick={() => setActiveTab('library')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                   Browse Library
                 </Button>
               </div>
             ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                   {exercises.map((ex, index) => {
                     return (
                     <div 
                        key={ex.id}
                        onClick={() => setActiveExercise(ex)}
                        className="bg-card/50 overflow-hidden rounded-2xl cursor-pointer hover:ring-2 hover:ring-primary/60 transition-all duration-300 border border-border group relative flex flex-col shadow-lg"
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleSaveExercise(ex.id); }}
                          className="absolute z-10 top-3 right-3 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/80 transition-all"
                        >
                          <Heart className={`h-4 w-4 transition-all fill-rose-500 text-rose-500`} />
                        </button>

                        <ExercisePhoto
                          exerciseName={ex.name}
                          targetMuscle={ex.target}
                          equipment={ex.equipment}
                          index={index}
                          className="h-44"
                        />
                    
                        <div className="p-4 flex-1 flex flex-col bg-background">
                          <h3 className="font-bold text-foreground capitalize text-[15px] leading-tight line-clamp-2">{ex.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-auto pt-4">
                            <Badge variant="secondary" className="text-[10px] capitalize">{ex.equipment}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize border-primary/30 text-primary">{ex.target}</Badge>
                          </div>
                        </div>
                      </div>
                      );
                   })}
                </div>
             )}
          </div>
        )}

      </div>

      {activeExercise && <ExerciseDetailModal exercise={activeExercise} onClose={() => setActiveExercise(null)} savedExercises={savedExercises} toggleSave={toggleSaveExercise} />}

    </div>
  );
}

// -------------------------------------------------------------
// EXERCISE DETAIL PORTAL MODAL 
// -------------------------------------------------------------
interface ModalProps {
  exercise: Exercise;
  onClose: () => void;
  savedExercises: string[];
  toggleSave: (id: string) => void;
}

const ExerciseDetailModal = ({ exercise, onClose, savedExercises, toggleSave }: ModalProps) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'stats'>('instructions');
  const [isGenerating, setIsGenerating] = useState(false);
  const [groqInstructions, setGroqInstructions] = useState<any>(null);
  const [addToWorkoutStatus, setAddToWorkoutStatus] = useState<string>("idle");

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const generateInstructions = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/api/exercises/instructions', {
        exerciseName: exercise.name,
        targetMuscle: exercise.target,
        equipment: exercise.equipment
      });
      setGroqInstructions(res.data);
    } catch (err: any) {
       toast.error(err.response?.data?.message || "Failed to generate AI insights.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!exercise.instructions || exercise.instructions.length === 0) {
       generateInstructions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  const handleAddToWorkoutDummy = () => {
    setAddToWorkoutStatus("loading");
    setTimeout(() => {
      setAddToWorkoutStatus("success");
      toast.success("Successfully added to your active workout plan.");
      setTimeout(() => setAddToWorkoutStatus("idle"), 3000);
    }, 1200);
  };

  const InstructionPayload = groqInstructions ? groqInstructions.instructions : exercise.instructions;

  const content = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Click outside bounds handler */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-3xl bg-background md:rounded-[2rem] border-0 md:border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        
        {/* Mobile Header (Sticky) */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-md z-10 shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="font-semibold px-4 truncate flex-1 text-center capitalize">{exercise.name}</div>
          <Button variant="ghost" size="icon" onClick={() => toggleSave(exercise.id)} className="rounded-full hover:bg-white/10">
             <Heart className={`h-5 w-5 transition-all ${savedExercises.includes(exercise.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Top Hero Section */}
          <div className="flex flex-col md:flex-row bg-slate-900 border-b border-white/5">
            <div className="w-full md:w-1/2 bg-black flex justify-center items-center p-8 relative min-h-[250px] md:min-h-[350px]">
               <div className="w-full h-full absolute inset-0">
                 <ExercisePhoto
                   exerciseName={exercise.name}
                   targetMuscle={exercise.target}
                   equipment={exercise.equipment}
                   className="h-full rounded-none"
                 />
               </div>
               <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                 Pexels Photo
               </Badge>
            </div>
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-background">
               <h1 className="text-2xl md:text-3xl font-bold text-white capitalize mb-4 leading-tight">{exercise.name}</h1>
               
               <div className="space-y-4">
                 <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <span className="text-slate-400 font-medium">Target Muscle</span>
                   <Badge variant="outline" className="capitalize text-primary border-primary/30 bg-primary/10">{exercise.target}</Badge>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <span className="text-slate-400 font-medium">Equipment</span>
                   <span className="text-white capitalize font-medium">{exercise.equipment}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-white/5">
                   <span className="text-slate-400 font-medium">Difficulty</span>
                   <span className="text-yellow-400 flex">{[...Array(groqInstructions ? (groqInstructions.difficulty === 'Advanced' ? 3 : groqInstructions.difficulty === 'Intermediate' ? 2 : 1) : 2)].map((_,i) => <Flame key={i} className="h-4 w-4 fill-yellow-400" />)}</span>
                 </div>
                 <div className="flex flex-col gap-2 pt-2">
                   <span className="text-slate-400 font-medium text-sm">Secondary Engagement</span>
                   <div className="flex flex-wrap gap-2">
                     {exercise.secondaryMuscles.map(sm => (
                       <Badge key={sm} variant="secondary" className="capitalize text-xs bg-secondary text-slate-300">{sm}</Badge>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/5 px-6">
            <button 
              onClick={() => setActiveTab('instructions')}
              className={`py-4 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'instructions' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              📋 Execution Guide
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-4 font-semibold text-sm border-b-2 transition-all ${activeTab === 'stats' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              📊 Optimal Stats
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 md:p-8">
            {activeTab === 'instructions' ? (
              <div className="space-y-6">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center p-10 bg-secondary/30 rounded-2xl border border-white/5 text-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <h3 className="font-bold text-white mb-2">Groq LLaMA-3.3 AI Generating Protocol...</h3>
                    <p className="text-sm text-slate-400">Our native certified PT bot is deeply analyzing this specific movement...</p>
                  </div>
                ) : InstructionPayload && InstructionPayload.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <CheckCircle2 className="h-5 w-5 text-green-500" /> Step-by-Step Instructions
                    </h3>
                    <ul className="space-y-4 mt-4">
                       {InstructionPayload.map((step: string, idx: number) => (
                         <li key={idx} className="flex gap-4 p-4 rounded-xl bg-secondary/40 border border-white/5 hover:bg-secondary/60 transition-colors">
                           <span className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/20 text-primary font-bold">{idx + 1}</span>
                           <span className="text-slate-200 leading-relaxed mt-1">{step}</span>
                         </li>
                       ))}
                    </ul>
                    
                    {groqInstructions?.tips && (
                      <div className="mt-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <h4 className="font-bold text-blue-400 flex items-center gap-2 mb-3">
                          <Info className="h-4 w-4" /> Pro Coaching Tips
                        </h4>
                        <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm">
                          {groqInstructions.tips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 p-6 bg-secondary/20 rounded-xl border border-white/5 text-center italic">
                    No strict instructions compiled. Watch the visualizer closely to mimic form perfectly.
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groqInstructions ? (
                  <>
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Recommended Sets</span>
                      <span className="text-4xl font-bold text-white">{groqInstructions.sets}</span>
                    </div>
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Rep Target</span>
                      <span className="text-4xl font-bold text-cyan-400">{groqInstructions.reps}</span>
                    </div>
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Rest Period</span>
                      <span className="text-4xl font-bold text-emerald-400">{groqInstructions.rest}</span>
                    </div>
                    <div className="bg-secondary/30 p-5 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Burn Factor</span>
                      <span className="text-4xl font-bold text-rose-400">~{groqInstructions.caloriesPerSet} <span className="text-lg">cal</span></span>
                    </div>
                  </>
                ) : (
                  <div className="col-span-full py-10 text-center text-slate-400 flex flex-col items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mb-3 text-primary" />
                    Analyzing optimal matrices via LLaMA models...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Fixed Action Area */}
        <div className="p-4 border-t border-white/5 bg-background shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex gap-3 shrink-0">
          <Button 
            className="flex-1 py-6 rounded-xl text-md font-bold transition-all relative overflow-hidden group"
            onClick={handleAddToWorkoutDummy}
            disabled={addToWorkoutStatus === "loading" || addToWorkoutStatus === "success"}
          >
            {addToWorkoutStatus === "loading" && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
            {addToWorkoutStatus === "success" && <CheckCircle2 className="h-5 w-5 mr-2 text-white" />}
            {addToWorkoutStatus === "idle" && <Plus className="h-5 w-5 mr-2" />}
            
            {addToWorkoutStatus === "success" ? "Added to Plan" : "Add to Workout Map"}
            
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 ease-out" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className={`h-auto w-16 shrink-0 rounded-xl border-white/10 transition-colors ${savedExercises.includes(exercise.id) ? 'bg-rose-500/10 border-rose-500/30' : 'hover:bg-white/10'}`}
            onClick={() => toggleSave(exercise.id)}
          >
            <Heart className={`h-6 w-6 transition-all ${savedExercises.includes(exercise.id) ? 'fill-rose-500 text-rose-500 scale-110' : 'text-slate-400'}`} />
          </Button>
        </div>

      </div>
    </div>
  );

  return createPortal(content, document.body);
};
