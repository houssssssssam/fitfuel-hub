import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Dumbbell, Heart, ArrowLeft, Loader2, CheckCircle2, ListFilter, PlayCircle, Flame, Activity, Info, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import axios from 'axios';

type ViewMode = 'front' | 'back';
type TabMode = 'library' | 'saved';

interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl?: string;
  gif_url?: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

const fetchFromExerciseDB = async (endpoint: string) => {
  const hasParams = endpoint.includes('?');
  const query = hasParams ? '&limit=20&offset=0' : '?limit=20&offset=0';
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

const ExerciseGif = ({ src, name, equipment }: { 
  src: string; name: string; equipment: string 
}) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  const gradientMap: Record<string, string> = {
    'barbell': 'from-orange-500/20 to-orange-900/40',
    'dumbbell': 'from-cyan-500/20 to-cyan-900/40',
    'body weight': 'from-green-500/20 to-green-900/40',
    'cable': 'from-purple-500/20 to-purple-900/40',
    'machine': 'from-red-500/20 to-red-900/40',
    'leverage machine': 'from-yellow-500/20 to-yellow-900/40',
    'assisted': 'from-blue-500/20 to-blue-900/40',
  };
  const gradient = gradientMap[equipment?.toLowerCase()] || 'from-slate-500/20 to-slate-900/40';

  return (
    <div className="relative w-full h-full bg-secondary overflow-hidden rounded-xl">
      <img
        src={src}
        alt={name}
        crossOrigin="anonymous"
        className={`w-full h-full object-contain mix-blend-screen transition-opacity duration-500 group-hover:scale-105 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        style={{ position: 'absolute', inset: 0 }}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        loading="lazy"
      />
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin"/>
        </div>
      )}
      {status === 'error' && (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-3 p-4`}>
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <Dumbbell className="h-6 w-6 text-white/40"/>
          </div>
          <p className="text-xs text-white/60 text-center capitalize leading-tight px-2">{name}</p>
        </div>
      )}
    </div>
  );
};

const BodyOutline = ({ view }: { view: 'front' | 'back' }) => (
  <g fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinejoin="round" className="pointer-events-none">
    <ellipse cx="200" cy="55" rx="32" ry="38"/>
    <path d="M187,88 Q184,105 183,115 L217,115 Q216,105 213,88 Z"/>
    <path d="M183,115 Q160,112 138,122 Q118,132 112,148 L108,200 Q106,215 110,228 L115,310 Q116,325 120,332 L180,340 L220,340 L280,332 Q284,325 285,310 L290,228 Q294,215 292,200 L288,148 Q282,132 262,122 Q240,112 217,115 Z"/>
    <path d="M112,148 Q100,152 90,165 L78,225 Q74,240 78,252 L95,258 Q108,260 114,248 L120,190 Q118,165 112,148 Z"/>
    <path d="M288,148 Q300,152 310,165 L322,225 Q326,240 322,252 L305,258 Q292,260 286,248 L280,190 Q282,165 288,148 Z"/>
    <path d="M78,255 Q68,265 64,282 L66,328 Q68,345 78,352 L94,354 Q106,352 110,338 L114,295 L95,258 Z"/>
    <path d="M322,255 Q332,265 336,282 L334,328 Q332,345 322,352 L306,354 Q294,352 290,338 L286,295 L305,258 Z"/>
    <path d="M64,330 Q58,345 60,358 Q65,368 75,370 Q85,368 92,360 Q98,352 94,342 Z"/>
    <path d="M336,330 Q342,345 340,358 Q335,368 325,370 Q315,368 308,360 Q302,352 306,342 Z"/>
    <path d="M120,332 Q112,345 115,362 L185,372 L215,372 L285,362 Q288,345 280,332 Z"/>
    <path d="M118,360 Q108,375 108,398 L112,445 Q115,462 128,468 L150,468 Q164,464 166,448 L162,398 L175,368 Z"/>
    <path d="M282,360 Q292,375 292,398 L288,445 Q285,462 272,468 L250,468 Q236,464 234,448 L238,398 L225,368 Z"/>
    <path d="M110,466 Q103,480 103,500 L106,540 Q109,556 122,560 L142,560 Q154,556 156,540 L155,498 L150,466 Z"/>
    <path d="M290,466 Q297,480 297,500 L294,540 Q291,556 278,560 L258,560 Q246,556 244,540 L245,498 L250,466 Z"/>
    <path d="M103,558 Q98,568 100,575 Q108,582 135,580 Q148,576 150,568 L148,558 Z"/>
    <path d="M297,558 Q302,568 300,575 Q292,582 265,580 Q252,576 250,568 L252,558 Z"/>
    {view === 'front' && <>
      <line x1="200" y1="230" x2="200" y2="330" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="168" y1="255" x2="232" y2="255" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="168" y1="280" x2="232" y2="280" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <line x1="168" y1="305" x2="232" y2="305" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      <path d="M145,160 Q175,185 200,188 Q225,185 255,160" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
    </>}
    {view === 'back' && <line x1="200" y1="120" x2="200" y2="335" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>}
  </g>
);

const HumanBodySVG = ({ view, selectedMuscle, hoveredMuscle, onMuscleClick, onMuscleHover }: any) => {
  const frontPaths = {
    chest: "M155,155 C155,140 165,130 200,128 C235,130 245,140 245,155 L248,195 C245,210 230,218 200,220 C170,218 155,210 152,195 Z",
    leftShoulder: "M115,138 C100,135 88,145 85,160 C82,175 90,188 105,192 L125,185 C138,178 142,165 138,150 Z",
    rightShoulder: "M285,138 C300,135 312,145 315,160 C318,175 310,188 295,192 L275,185 C262,178 258,165 262,150 Z",
    leftBicep: "M88,195 C78,198 70,210 72,228 L78,260 C80,272 90,278 102,275 L115,268 C125,262 126,250 122,238 L108,200 Z",
    rightBicep: "M312,195 C322,198 330,210 328,228 L322,260 C320,272 310,278 298,275 L285,268 C275,262 274,250 278,238 L292,200 Z",
    leftForearm: "M72,262 C62,268 56,282 58,300 L62,338 C64,352 74,358 86,355 L100,348 C110,342 112,328 108,315 L95,270 Z",
    rightForearm: "M328,262 C338,268 344,282 342,300 L338,338 C336,352 326,358 314,355 L300,348 C290,342 288,328 292,315 L305,270 Z",
    abs: "M165,222 C162,238 160,258 162,278 L165,308 C167,320 175,326 200,328 C225,326 233,320 235,308 L238,278 C240,258 238,238 235,222 C225,218 175,218 165,222 Z",
    leftQuad: "M158,335 C145,342 138,360 140,382 L145,425 C148,440 160,448 175,445 L192,440 C205,435 208,420 205,405 L198,362 L175,332 Z",
    rightQuad: "M242,335 C255,342 262,360 260,382 L255,425 C252,440 240,448 225,445 L208,440 C195,435 192,420 195,405 L202,362 L225,332 Z",
    leftCalf: "M142,448 C133,458 130,475 133,495 L138,530 C140,543 150,550 163,547 L178,542 C188,537 190,523 187,510 L178,468 L160,445 Z",
    rightCalf: "M258,448 C267,458 270,475 267,495 L262,530 C260,543 250,550 237,547 L222,542 C212,537 210,523 213,510 L222,468 L240,445 Z",
  };

  const backPaths = {
    traps: "M155,130 C155,118 165,110 200,108 C235,110 245,118 245,130 L248,155 C240,165 225,170 200,172 C175,170 160,165 152,155 Z",
    back: "M148,172 C138,185 132,205 135,230 L140,285 C143,305 158,318 200,322 C242,318 257,305 260,285 L265,230 C268,205 262,185 252,172 C235,168 175,168 148,172 Z",
    leftTricep: "M88,195 C78,198 70,210 72,228 L78,260 C80,272 90,278 102,275 L115,268 C125,262 126,250 122,238 L108,200 Z",
    rightTricep: "M312,195 C322,198 330,210 328,228 L322,260 C320,272 310,278 298,275 L285,268 C275,262 274,250 278,238 L292,200 Z",
    glutes: "M150,325 C145,338 143,355 148,370 L158,395 C163,408 178,415 200,416 C222,415 237,408 242,395 L252,370 C257,355 255,338 250,325 C235,318 165,318 150,325 Z",
    leftHamstring: "M150,372 C140,382 135,400 138,422 L143,458 C146,472 158,480 172,477 L188,472 C200,466 202,452 199,438 L190,395 L168,368 Z",
    rightHamstring: "M250,372 C260,382 265,400 262,422 L257,458 C254,472 242,480 228,477 L212,472 C200,466 198,452 201,438 L210,395 L232,368 Z",
  };

  const paths = view === 'front' ? frontPaths : backPaths;
  const muscleNames: Record<string, string> = {
    chest: 'Chest', leftShoulder: 'L. Shoulder', rightShoulder: 'R. Shoulder',
    leftBicep: 'L. Bicep', rightBicep: 'R. Bicep',
    leftForearm: 'L. Forearm', rightForearm: 'R. Forearm',
    abs: 'Abs', leftQuad: 'L. Quad', rightQuad: 'R. Quad',
    leftCalf: 'L. Calf', rightCalf: 'R. Calf',
    traps: 'Traps', back: 'Back', leftTricep: 'L. Tricep', rightTricep: 'R. Tricep',
    glutes: 'Glutes', leftHamstring: 'L. Hamstring', rightHamstring: 'R. Hamstring',
  };

  const muscleToBodyPart: Record<string, string> = {
    chest: 'chest', leftShoulder: 'shoulders', rightShoulder: 'shoulders',
    leftBicep: 'upper arms', rightBicep: 'upper arms',
    leftForearm: 'lower arms', rightForearm: 'lower arms',
    abs: 'waist', leftQuad: 'upper legs', rightQuad: 'upper legs',
    leftCalf: 'lower legs', rightCalf: 'lower legs',
    traps: 'neck', back: 'back', leftTricep: 'upper arms', rightTricep: 'upper arms',
    glutes: 'upper legs', leftHamstring: 'upper legs', rightHamstring: 'upper legs',
  };

  return (
    <div className="relative w-full max-w-[400px] aspect-[1/1.5] bg-secondary/10 rounded-3xl border border-white/5 p-4 flex justify-center items-center overflow-hidden">
      <svg viewBox="0 0 400 600" className="w-full h-full drop-shadow-2xl relative z-10">
        <defs>
          <filter id="muscleGlow">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feComposite in="SourceGraphic" in2="blur" operator="over"/>
          </filter>
        </defs>

        <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="0.8" fill="white" fillOpacity="0.08"/>
        </pattern>
        <rect width="400" height="600" fill="url(#grid)" rx="12"/>

        <BodyOutline view={view} />

        {Object.entries(paths).map(([muscleId, pathData]) => {
          const bodyPart = muscleToBodyPart[muscleId];
          const isSelected = selectedMuscle === bodyPart;
          const isHovered = hoveredMuscle === muscleId;
          
          return (
            <path
              key={muscleId}
              d={pathData as string}
              fill={isSelected ? 'rgba(6,182,212,0.55)' : isHovered ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.05)'}
              stroke={isSelected ? 'rgba(6,182,212,0.9)' : isHovered ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.15)'}
              strokeWidth={isSelected ? 2 : 1}
              filter={isSelected ? 'url(#muscleGlow)' : undefined}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onMuscleHover(muscleId)}
              onMouseLeave={() => onMuscleHover(null)}
              onClick={() => onMuscleClick(bodyPart)}
            />
          );
        })}

        {hoveredMuscle && (() => {
          const centers: Record<string, number[]> = {
            chest: [200, 175], leftShoulder: [105, 162], rightShoulder: [295, 162],
            leftBicep: [97, 230], rightBicep: [303, 230], leftForearm: [80, 308], rightForearm: [320, 308],
            abs: [200, 272], leftQuad: [168, 388], rightQuad: [232, 388], leftCalf: [158, 492], rightCalf: [242, 492],
            traps: [200, 140], back: [200, 245], leftTricep: [97, 230], rightTricep: [303, 230],
            glutes: [200, 368], leftHamstring: [168, 422], rightHamstring: [232, 422],
          };
          const [cx, cy] = centers[hoveredMuscle] || [200, 300];
          const name = muscleNames[hoveredMuscle];
          return (
            <g className="pointer-events-none animate-in fade-in zoom-in-95 duration-200">
              <rect x={cx-45} y={cy-34} width="90" height="22" rx="10" fill="rgba(0,0,0,0.85)" stroke="rgba(6,182,212,0.4)" strokeWidth="1"/>
              <text x={cx} y={cy-19} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">{name}</text>
            </g>
          );
        })()}
      </svg>
      {!selectedMuscle && (
        <div className="absolute bottom-6 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-semibold text-slate-300 animate-pulse flex items-center gap-2 pointer-events-none">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Select a muscle group
        </div>
      )}
    </div>
  );
};
