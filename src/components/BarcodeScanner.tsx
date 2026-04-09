import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  X,
  Keyboard,
  Loader2,
  Check,
  RefreshCw,
  ScanBarcode,
  AlertCircle,
  ImageOff,
  PencilLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScannedFoodData {
  name: string;
  barcode: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  servingSize: string;
  brand?: string;
  imageUrl?: string;
}

export interface PartialProductInfo {
  name: string;
  brand: string;
  barcode: string;
}

interface BarcodeScannerProps {
  onScanSuccess: (foodData: ScannedFoodData) => void;
  onClose: () => void;
  onManualEntry?: (product: PartialProductInfo) => void;
}

// ── Scanner States ────────────────────────────────────────────────────────────

type ScannerState =
  | "initializing"
  | "scanning"
  | "manual"
  | "fetching"
  | "result"
  | "error"
  | "no-camera";

// ── OpenFoodFacts API ─────────────────────────────────────────────────────────

const fetchFoodData = async (barcode: string): Promise<ScannedFoodData> => {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );

  if (!response.ok) {
    throw new Error("Network error — unable to reach food database.");
  }

  const data = await response.json();

  if (data.status === 0 || !data.product) {
    throw new Error("Product not found in database.");
  }

  const product = data.product;
  const n = product.nutriments || {};

  // Try multiple possible field names — OpenFoodFacts is inconsistent across products
  const pick = (...fields: string[]): number => {
    for (const f of fields) {
      const v = n[f];
      if (v !== undefined && v !== null && !isNaN(Number(v))) return parseFloat(v);
    }
    return 0;
  };

  let calories = pick(
    "energy-kcal_100g", "energy_kcal_100g",
    "energy-kcal",      "energy_kcal",
  );

  // Fall back to kJ → kcal conversion when kcal field is absent
  if (calories === 0) {
    const kj = pick("energy-kj_100g", "energy_kj_100g", "energy-kj", "energy_kj", "energy_100g", "energy");
    if (kj > 0) calories = kj / 4.184;
  }

  const protein = pick("proteins_100g", "proteins", "protein_100g", "protein");
  const carbs   = pick("carbohydrates_100g", "carbohydrates", "carbohydrate_100g", "carbohydrate");
  const fats    = pick("fat_100g", "fat", "fats_100g", "fats", "lipids_100g", "lipids");

  if (calories === 0 && protein === 0 && carbs === 0 && fats === 0) {
    const err = new Error("Product found but has no nutrition data in OpenFoodFacts.") as any;
    err.partialProduct = {
      name:    product.product_name || product.product_name_en || "Unknown Product",
      brand:   product.brands || "",
      barcode,
    };
    throw err;
  }

  return {
    name: product.product_name || product.product_name_en || "Unknown Product",
    barcode,
    brand: product.brands || "",
    calories: Math.round(calories),
    protein:  Math.round(protein  * 10) / 10,
    carbs:    Math.round(carbs    * 10) / 10,
    fats:     Math.round(fats     * 10) / 10,
    servingSize: product.serving_size || product.serving_quantity || "100g",
    imageUrl: product.image_front_small_url || product.image_front_url || product.image_url || "",
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function BarcodeScanner({ onScanSuccess, onClose, onManualEntry }: BarcodeScannerProps) {
  const [state, setState] = useState<ScannerState>("initializing");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [scannedData, setScannedData] = useState<ScannedFoodData | null>(null);
  const [partialProduct, setPartialProduct] = useState<PartialProductInfo | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const scannerRef = useRef<any>(null);
  const containerIdRef = useRef(`barcode-reader-${Date.now()}`);
  const isStoppedRef = useRef(false);

  // ── Cleanup scanner ────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    if (isStoppedRef.current) return;
    isStoppedRef.current = true;
    try {
      if (scannerRef.current) {
        const scannerState = scannerRef.current.getState?.();
        if (scannerState === 2 /* SCANNING */ || scannerState === 3 /* PAUSED */) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      }
    } catch {
      // Scanner already stopped or cleared
    }
    scannerRef.current = null;

    // Force-release the camera hardware — html5-qrcode doesn't always stop
    // the underlying MediaStream, which keeps the camera light on.
    const container = document.getElementById(containerIdRef.current);
    if (container) {
      container.querySelectorAll("video").forEach((video) => {
        const stream = video.srcObject as MediaStream | null;
        stream?.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      });
    }
  }, []);

  // ── Lock body scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleEsc);
      stopScanner();
    };
  }, [onClose, stopScanner]);

  // ── Initialize camera scanner ──────────────────────────────────────────────
  useEffect(() => {
    if (state !== "initializing" && state !== "scanning") return;

    // Check camera availability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setState("no-camera");
      setErrorMsg("Camera not available on this device.");
      return;
    }

    let cancelled = false;

    const initScanner = async () => {
      // Dynamic import to avoid SSR reference issues
      const { Html5Qrcode } = await import("html5-qrcode");

      if (cancelled) return;

      // Stop previous instance if any
      await stopScanner();
      isStoppedRef.current = false;

      const containerId = containerIdRef.current;
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = "";

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.333,
            disableFlip: false,
          },
          async (decodedText) => {
            // Successfully scanned
            await stopScanner();
            handleBarcode(decodedText);
          },
          () => {
            // Scan failure (normal — just means no barcode detected yet)
          }
        );

        if (!cancelled) {
          setState("scanning");
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message || err || "");
        if (
          msg.includes("NotAllowedError") ||
          msg.includes("Permission") ||
          msg.includes("denied")
        ) {
          setState("error");
          setErrorMsg(
            "Camera access denied. Please allow camera permission in your browser settings and reload."
          );
        } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
          setState("no-camera");
          setErrorMsg("No camera found on this device.");
        } else {
          setState("error");
          setErrorMsg("Failed to start camera. Try manual entry instead.");
        }
      }
    };

    initScanner();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ── Handle barcode (from scanning or manual entry) ─────────────────────────
  const handleBarcode = async (code: string) => {
    const cleaned = code.replace(/\D/g, "");
    if (!cleaned || cleaned.length < 6) {
      setState("error");
      setErrorMsg("Invalid barcode format. Please try again.");
      return;
    }

    setState("fetching");
    try {
      const data = await fetchFoodData(cleaned);
      setScannedData(data);
      setState("result");
    } catch (err: any) {
      const msg: string = err?.message || "";
      setState("error");
      if (msg.includes("no nutrition data")) {
        setPartialProduct(err.partialProduct ?? null);
        setErrorMsg("Product found but has no nutrition info in OpenFoodFacts.");
      } else {
        setPartialProduct(null);
        if (msg.includes("not found")) {
          setErrorMsg("Product not found in the database. Try manual entry.");
        } else if (msg.includes("Network")) {
          setErrorMsg("No internet connection. Check your network and try again.");
        } else {
          setErrorMsg("Failed to fetch product data. Try again or enter manually.");
        }
      }
    }
  };

  // ── Switch camera ──────────────────────────────────────────────────────────
  const switchCamera = async () => {
    await stopScanner();
    isStoppedRef.current = false;
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setState("initializing");
  };

  // ── Retry after error ──────────────────────────────────────────────────────
  const retry = async () => {
    setErrorMsg("");
    setPartialProduct(null);
    isStoppedRef.current = false;
    setState("initializing");
  };

  // ── Use scanned product ────────────────────────────────────────────────────
  const useProduct = () => {
    if (scannedData) {
      onScanSuccess(scannedData);
    }
  };

  // ── Portal Content ─────────────────────────────────────────────────────────
  const content = (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg bg-[#0B0F19] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ScanBarcode className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Scan Barcode
              </h2>
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold">
                {state === "scanning" && "Point at a barcode"}
                {state === "initializing" && "Starting camera..."}
                {state === "manual" && "Enter barcode number"}
                {state === "fetching" && "Looking up product..."}
                {state === "result" && "Product found!"}
                {(state === "error" || state === "no-camera") && "Something went wrong"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
          {/* INITIALIZING / SCANNING */}
          {(state === "initializing" || state === "scanning") && (
            <div className="w-full space-y-6">
              {/* Camera viewfinder */}
              <div className="relative w-full aspect-[4/3] max-w-[400px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-white/10">
                <div
                  id={containerIdRef.current}
                  className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover [&_video]:![transform:none]"
                />

                {/* Scanning overlay corners */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />

                  {/* Scanning line */}
                  <div className="absolute left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>

                {/* Initializing overlay */}
                {state === "initializing" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-white/60 font-medium">
                        Starting camera...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-center text-sm text-white/50">
                Hold the barcode steady inside the frame
              </p>

              {/* Camera controls */}
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={switchCamera}
                  className="gap-2 border-white/10 text-white/70 hover:bg-white/5"
                >
                  <RefreshCw className="h-4 w-4" />
                  Switch Camera
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    await stopScanner();
                    setState("manual");
                  }}
                  className="gap-2 border-white/10 text-white/70 hover:bg-white/5"
                >
                  <Keyboard className="h-4 w-4" />
                  Enter Code
                </Button>
              </div>
            </div>
          )}

          {/* MANUAL ENTRY */}
          {state === "manual" && (
            <div className="w-full max-w-sm space-y-6 text-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Keyboard className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Enter Barcode</h3>
                <p className="text-sm text-white/40">
                  Type the barcode number printed below the barcode lines
                </p>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 3017620422003"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCode.length >= 6) {
                      handleBarcode(manualCode);
                    }
                  }}
                  className="bg-secondary border-white/10 text-center text-lg font-mono tracking-widest h-14"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={retry}
                  className="gap-2 border-white/10"
                >
                  <Camera className="h-4 w-4" />
                  Use Camera
                </Button>
                <Button
                  onClick={() => handleBarcode(manualCode)}
                  disabled={manualCode.length < 6}
                  className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <ScanBarcode className="h-4 w-4" />
                  Look Up
                </Button>
              </div>
            </div>
          )}

          {/* FETCHING */}
          {state === "fetching" && (
            <div className="text-center space-y-6 py-12">
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative h-full w-full rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Looking up product...</h3>
                <p className="text-sm text-white/40 mt-1">
                  Searching OpenFoodFacts database
                </p>
              </div>
            </div>
          )}

          {/* RESULT */}
          {state === "result" && scannedData && (
            <div className="w-full max-w-sm space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              {/* Success badge */}
              <div className="flex items-center gap-2 justify-center">
                <div className="h-8 w-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-sm font-bold text-green-400 uppercase tracking-wider">
                  Product Found
                </span>
              </div>

              {/* Product card */}
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
                {/* Image */}
                {scannedData.imageUrl ? (
                  <div className="h-48 bg-secondary flex items-center justify-center overflow-hidden">
                    <img
                      src={scannedData.imageUrl}
                      alt={scannedData.name}
                      className="max-h-full max-w-full object-contain p-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-32 bg-secondary/50 flex items-center justify-center">
                    <ImageOff className="h-10 w-10 text-white/20" />
                  </div>
                )}

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {scannedData.name}
                    </h3>
                    {scannedData.brand && (
                      <p className="text-sm text-white/50 mt-1">{scannedData.brand}</p>
                    )}
                    <p className="text-xs text-white/30 mt-1 font-mono">
                      {scannedData.barcode}
                    </p>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                      <div className="text-red-400 font-bold text-lg">
                        {scannedData.calories}
                      </div>
                      <div className="text-[9px] text-red-500/60 uppercase font-bold tracking-wider mt-0.5">
                        Kcal
                      </div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                      <div className="text-blue-400 font-bold text-lg">
                        {scannedData.protein}g
                      </div>
                      <div className="text-[9px] text-blue-500/60 uppercase font-bold tracking-wider mt-0.5">
                        Prot
                      </div>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-center">
                      <div className="text-yellow-400 font-bold text-lg">
                        {scannedData.carbs}g
                      </div>
                      <div className="text-[9px] text-yellow-500/60 uppercase font-bold tracking-wider mt-0.5">
                        Carb
                      </div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
                      <div className="text-purple-400 font-bold text-lg">
                        {scannedData.fats}g
                      </div>
                      <div className="text-[9px] text-purple-500/60 uppercase font-bold tracking-wider mt-0.5">
                        Fat
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-white/30 text-center">
                    Per {scannedData.servingSize}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={retry}
                  className="flex-1 gap-2 border-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan Again
                </Button>
                <Button
                  onClick={useProduct}
                  className="flex-1 gap-2 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                >
                  <Check className="h-4 w-4" />
                  Use This
                </Button>
              </div>
            </div>
          )}

          {/* ERROR / NO-CAMERA */}
          {(state === "error" || state === "no-camera") && (
            <div className="w-full max-w-sm text-center space-y-6 py-8">
              <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="h-10 w-10 text-red-400" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {state === "no-camera" ? "No Camera Available" : "Scan Failed"}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">{errorMsg}</p>
              </div>

              {/* Product info card — shown only when product was found but had no nutrition */}
              {partialProduct && (
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-left space-y-1">
                  <p className="text-sm font-semibold text-white leading-snug">{partialProduct.name}</p>
                  {partialProduct.brand && (
                    <p className="text-xs text-white/50">{partialProduct.brand}</p>
                  )}
                  <p className="text-[11px] text-white/30 font-mono">{partialProduct.barcode}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {state !== "no-camera" && (
                  <Button onClick={retry} className="gap-2 bg-primary hover:bg-primary/90">
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}

                {/* "Fill Nutrition Manually" — only when we have partial product info */}
                {partialProduct && onManualEntry && (
                  <Button
                    onClick={() => {
                      onManualEntry(partialProduct);
                      onClose();
                    }}
                    className="gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                    variant="outline"
                  >
                    <PencilLine className="h-4 w-4" />
                    Fill Nutrition Manually
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => {
                    setErrorMsg("");
                    setPartialProduct(null);
                    setState("manual");
                  }}
                  className="gap-2 border-white/10"
                >
                  <Keyboard className="h-4 w-4" />
                  Enter Barcode Manually
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scanning line animation style (injected inline) */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { top: 25%; }
          50% { top: 70%; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}
