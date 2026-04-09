import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Camera, Image as ImageIcon, Loader2, Plus, SplitSquareHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Photo = {
  _id: string;
  url: string;
  thumbnailUrl?: string;
  date: string;
  note: string;
  category: "front" | "side" | "back";
};

export default function ProgressPhotos() {
  const queryClient = useQueryClient();
  const userStr = localStorage.getItem("user");
  const userId = userStr ? JSON.parse(userStr).id : null;

  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<"front" | "side" | "back">("front");
  
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelect, setCompareSelect] = useState<Photo[]>([]);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ["photos", userId],
    queryFn: async () => {
      const res = await api.get(`/api/photos/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });

  const uploadPhoto = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const formData = new FormData();
      formData.append("photo", file);
      formData.append("date", date);
      formData.append("note", note);
      formData.append("category", category);

      await api.post(`/api/photos/${userId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", userId] });
      toast.success("Photo uploaded successfully!");
      setFile(null);
      setNote("");
    },
    onError: () => toast.error("Failed to upload photo"),
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: string) => {
      await api.delete(`/api/photos/${userId}/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["photos", userId] });
      toast.success("Photo deleted");
      if (lightboxPhoto) setLightboxPhoto(null);
    },
  });

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleCompareToggle = (p: Photo) => {
    if (compareSelect.find(x => x._id === p._id)) {
      setCompareSelect(compareSelect.filter(x => x._id !== p._id));
    } else {
      if (compareSelect.length < 2) {
        setCompareSelect([...compareSelect, p]);
      } else {
        toast.error("Can only compare 2 photos at a time.");
      }
    }
  };

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  // Group photos by date
  const grouped = photos.reduce((acc, p) => {
    if (!acc[p.date]) acc[p.date] = [];
    acc[p.date].push(p);
    return acc;
  }, {} as Record<string, Photo[]>);
  
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Use base URL for local fetching if necessary, assuming proxy handles /uploads
  const getImageUrl = (url: string) => `http://localhost:5000${url}`;
  const getGalleryImageUrl = (photo: Photo) => getImageUrl(photo.thumbnailUrl || photo.url);

  if (isLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto pb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 data-page-title-anchor className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" />
            Visual Progress
          </h2>
          <p className="text-muted-foreground mt-1">Track your physical transformation securely.</p>
        </div>
        
        {photos.length > 1 && (
          <Button 
            onClick={() => { setCompareMode(!compareMode); setCompareSelect([]); }} 
            variant={compareMode ? "default" : "outline"}
            className="gap-2"
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            {compareMode ? "Cancel Comparison" : "Compare (Before / After)"}
          </Button>
        )}
      </div>

      {/* BEFORE / AFTER SLIDER MODE */}
      {compareMode && (
        <div className="stat-card border-primary/50 bg-primary/5 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-display text-foreground">Comparison Mode</h3>
            <span className="text-sm text-muted-foreground font-medium bg-background px-3 py-1 rounded-full border border-border">
              {compareSelect.length} / 2 Selected
            </span>
          </div>
          
          {compareSelect.length === 2 ? (
            <div className="relative w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden bg-black/50 border-2 border-primary/30 select-none group">
              <div 
                ref={sliderRef}
                className="absolute inset-0 cursor-ew-resize touch-none"
                onMouseMove={(e) => e.buttons === 1 && handleSliderMove(e)}
                onMouseDown={handleSliderMove}
                onTouchMove={handleSliderMove}
              >
                {/* AFTER IMAGE (BOTTOM) */}
                <img src={getImageUrl(compareSelect[1].url)} alt="After" className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none" draggable={false} />
                
                {/* BEFORE IMAGE (TOP CLIPPED) */}
                <div 
                  className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none"
                  style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                >
                  <img src={getImageUrl(compareSelect[0].url)} alt="Before" className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-10" draggable={false} />
                </div>
                
                {/* SLIDER HANDLE */}
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
                  style={{ left: `calc(${sliderPosition}% - 2px)` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 bg-white border-2 border-primary rounded-full shadow-lg flex items-center justify-center">
                    <SplitSquareHorizontal className="h-4 w-4 text-primary" />
                  </div>
                </div>
                
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold pointer-events-none shadow-lg z-30">
                  {new Date(compareSelect[0].date).toLocaleDateString()}
                </div>
                <div className="absolute top-4 right-4 bg-primary/80 backdrop-blur px-3 py-1 rounded-full text-white text-xs font-bold pointer-events-none shadow-lg z-30">
                  {new Date(compareSelect[1].date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-32 rounded-2xl border-2 border-dashed border-primary/30 bg-background/50 flex items-center justify-center text-muted-foreground">
              Select exactly two photos from your gallery below to begin overlay comparison.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* UPLOAD FORM */}
        <div className="lg:col-span-1">
          <div className="stat-card space-y-6 sticky top-24">
            <h3 className="text-xl font-bold text-foreground">Log New Photo</h3>
            
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'}`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <>
                  <ImageIcon className="h-10 w-10 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground text-sm truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Click to change selection</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">Drag & drop image here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Date Taken</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary/50" />
              </div>
              
              <div className="space-y-2">
                <Label>Category View</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["front", "side", "back"] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border ${category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-secondary"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input type="text" placeholder="e.g. End of 12 week cut" value={note} onChange={e => setNote(e.target.value)} className="bg-secondary/50" />
              </div>

              <Button 
                onClick={() => uploadPhoto.mutate()} 
                disabled={!file || uploadPhoto.isPending}
                className="w-full gap-2"
              >
                {uploadPhoto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Upload to Vault
              </Button>
            </div>
          </div>
        </div>

        {/* GALLERIES */}
        <div className="lg:col-span-2 space-y-8">
          {sortedDates.length === 0 ? (
            <div className="stat-card flex flex-col items-center justify-center py-20 text-center border-dashed">
              <ImageIcon className="h-16 w-16 text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-xl font-bold text-foreground">No Photos Found</h3>
              <p className="text-muted-foreground">Start uploading your physical journey to unlock AI visual comparisons.</p>
            </div>
          ) : (
            sortedDates.map(dateStr => (
              <div key={dateStr} className="space-y-4">
                <h4 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h4>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {grouped[dateStr].map(photo => {
                    const isSelected = compareSelect.find(p => p._id === photo._id);
                    
                    return (
                      <div 
                        key={photo._id} 
                        className={`group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 bg-black ${isSelected ? 'border-primary ring-4 ring-primary/20 scale-95' : 'border-transparent hover:border-primary/50 shadow-lg'}`}
                        onClick={() => compareMode ? handleCompareToggle(photo) : setLightboxPhoto(photo)}
                      >
                        <img 
                          src={getGalleryImageUrl(photo)} 
                          alt={photo.note}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/20 w-max px-2 py-0.5 rounded-md mb-1">{photo.category}</span>
                          {photo.note && <span className="text-sm text-white font-medium truncate">{photo.note}</span>}
                        </div>
                        
                        {isSelected && (
                          <div className="absolute top-3 right-3 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                            {compareSelect.findIndex(p => p._id === photo._id) + 1}
                          </div>
                        )}
                        
                        {!compareMode && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deletePhoto.mutate(photo._id); }}
                            className="absolute top-3 right-3 bg-black/50 text-white/50 hover:text-red-400 hover:bg-black/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && !compareMode && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in duration-300" onClick={() => setLightboxPhoto(null)}>
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full" onClick={() => setLightboxPhoto(null)}>
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-5xl w-full max-h-full flex flex-col md:flex-row bg-background/5 border border-white/10 rounded-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex-1 bg-black flex items-center justify-center p-4">
              <img src={getImageUrl(lightboxPhoto.url)} alt="" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
            </div>
            <div className="w-full md:w-80 bg-background/80 backdrop-blur-md p-6 flex flex-col justify-between border-l border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{new Date(lightboxPhoto.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{lightboxPhoto.category} VIEW</p>
                  </div>
                </div>
                
                {lightboxPhoto.note && (
                  <div className="bg-secondary/50 p-4 rounded-xl border border-border/50">
                    <p className="text-sm text-foreground italic">"{lightboxPhoto.note}"</p>
                  </div>
                )}
              </div>
              
              <Button variant="destructive" className="w-full gap-2 mt-8" onClick={() => deletePhoto.mutate(lightboxPhoto._id)}>
                <Trash2 className="h-4 w-4" /> Delete Photo permanently
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
