import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Bot, Copy, Trash2, ChevronDown, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";
import DOMPurify from "dompurify";

type ChatMessageType = "text" | "FOOD_LOG";

type FoodLogged = {
  name: string;
  quantity: number;
  unit: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: ChatMessageType;
  foodLogged?: FoodLogged | null;
  imageUrl?: string | null;
}

type UserStats = {
  caloriesRemaining: number;
  proteinPercent: number;
  streak: number;
  workoutsThisWeek: number;
  calorieTarget: number;
  proteinTarget: number;
};

type StoredUser = {
  id?: string;
  name?: string;
};

type ProfileResponse = {
  nutritionTargets?: {
    calories?: number;
    protein?: number;
  };
  dailyIntake?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  workouts?: Array<{
    date: string;
  }>;
  currentStreak?: number;
};

type ChatResponse = {
  reply?: string;
  type?: ChatMessageType;
  foodLogged?: FoodLogged | null;
  updatedIntake?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  } | null;
};

const FALLBACK_WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hey! I'm FuelBot 🤖 How can I help?",
  type: "text",
  foodLogged: null,
  imageUrl: null,
};

const getStoredUser = (): StoredUser | null => {
  try {
    const user = localStorage.getItem("user");
    return user ? (JSON.parse(user) as StoredUser) : null;
  } catch {
    return null;
  }
};

const getUserId = (): string => getStoredUser()?.id ?? "guest";

const getChatHistoryKey = (): string => `fuelbot_history_${getUserId()}`;

const isFoodLogged = (value: unknown): value is FoodLogged => {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<FoodLogged>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.quantity === "number" &&
    typeof candidate.unit === "string" &&
    typeof candidate.mealType === "string" &&
    typeof candidate.calories === "number" &&
    typeof candidate.protein === "number" &&
    typeof candidate.carbs === "number" &&
    typeof candidate.fats === "number"
  );
};

const getStoredMessages = (): Message[] => {
  try {
    const saved = localStorage.getItem(getChatHistoryKey());
    const parsed = saved ? JSON.parse(saved) : null;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [FALLBACK_WELCOME_MESSAGE];
    }

    const normalized = parsed
      .map((entry): Message | null => {
        if (!entry || typeof entry !== "object") return null;
        if (entry.role !== "user" && entry.role !== "assistant") return null;
        if (typeof entry.content !== "string") return null;

        return {
          role: entry.role,
          content: entry.content,
          type: entry.type === "FOOD_LOG" ? "FOOD_LOG" : "text",
          foodLogged: entry.role === "assistant" && isFoodLogged(entry.foodLogged) ? entry.foodLogged : null,
          imageUrl: typeof entry.imageUrl === "string" && entry.imageUrl.trim() ? entry.imageUrl : null,
        };
      })
      .filter((entry): entry is Message => Boolean(entry));

    return normalized.length > 0 ? normalized.slice(-20) : [FALLBACK_WELCOME_MESSAGE];
  } catch {
    return [FALLBACK_WELCOME_MESSAGE];
  }
};

const renderMarkdown = (text: string) => {
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-4 space-y-1 my-2">$1</ul>')
    .replace(/\n/g, "<br/>");

  return DOMPurify.sanitize(html);
};

const getDynamicSuggestions = (userStats: UserStats) => {
  const suggestions: string[] = [];

  if (userStats.caloriesRemaining > 500) {
    suggestions.push("What should I eat to hit my calories?");
  }
  if (userStats.proteinPercent < 50) {
    suggestions.push("How can I increase my protein today?");
  }
  if (userStats.streak === 0) {
    suggestions.push("How do I start a good streak?");
  }
  if (userStats.workoutsThisWeek < 3) {
    suggestions.push("What workout should I do today?");
  }

  suggestions.push("Give me a high-protein snack idea");
  suggestions.push("Am I on track with my goals today?");

  return suggestions.slice(0, 4);
};

const getFoodLogSuggestions = () => [
  "Log 2 eggs for breakfast",
  "Add 150g chicken breast to lunch",
  "I had a banana as a snack",
  "Log 200g greek yogurt",
];

const interleaveSuggestions = (primary: string[], secondary: string[], limit = 6) => {
  const merged: string[] = [];
  const maxLength = Math.max(primary.length, secondary.length);

  for (let index = 0; index < maxLength && merged.length < limit; index += 1) {
    if (primary[index]) merged.push(primary[index]);
    if (merged.length >= limit) break;
    if (secondary[index]) merged.push(secondary[index]);
  }

  return Array.from(new Set(merged)).slice(0, limit);
};

const getWelcomeMessage = (userName: string, caloriesRemaining: number) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${greeting} **${userName}**! 💪 You have **${caloriesRemaining}** calories remaining today. What can I help you with?`;
};

const MAX_VISION_IMAGE_BYTES = Math.floor(2.8 * 1024 * 1024);
const MAX_VISION_IMAGE_DIMENSION = 1600;

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("FuelBot couldn't prepare that image."));
      },
      "image/jpeg",
      quality,
    );
  });

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("FuelBot couldn't read that image."));
    };

    image.src = objectUrl;
  });

const getPreparedImageName = (fileName: string) => {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim();
  return `${baseName || "fuelbot-image"}.jpg`;
};

const prepareVisionImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const image = await loadImageElement(file);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_VISION_IMAGE_DIMENSION ? MAX_VISION_IMAGE_DIMENSION / longestSide : 1;
  const shouldCompress = file.size > MAX_VISION_IMAGE_BYTES || scale < 1 || file.type === "image/gif";

  if (!shouldCompress) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("FuelBot couldn't prepare that image.");
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let bestBlob: Blob | null = null;

  for (const quality of [0.92, 0.84, 0.76, 0.68, 0.6]) {
    const blob = await canvasToBlob(canvas, quality);
    if (!bestBlob || blob.size < bestBlob.size) {
      bestBlob = blob;
    }

    if (blob.size <= MAX_VISION_IMAGE_BYTES) {
      bestBlob = blob;
      break;
    }
  }

  if (!bestBlob || bestBlob.size > MAX_VISION_IMAGE_BYTES) {
    throw new Error("That photo is still too large. Try a closer crop or a lower-resolution image.");
  }

  return new File([bestBlob], getPreparedImageName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
};

const TypingIndicator = () => (
  <div className="flex items-center gap-2 p-1">
    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 border border-green-500/30 flex items-center justify-center shrink-0">
      <Bot className="h-4 w-4" />
    </div>
    <div className="flex items-center gap-1.5 bg-secondary border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 min-w-[60px] h-[38px]">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
          style={{ animationDelay: `${index * 150}ms` }}
        />
      ))}
    </div>
  </div>
);

const FoodLogBubble = ({
  foodLogged,
  content,
}: {
  foodLogged: Message["foodLogged"];
  content: string;
}) => {
  if (!foodLogged) return null;

  const mealIcons: Record<string, string> = {
    breakfast: "🌅",
    lunch: "☀️",
    dinner: "🌙",
    snacks: "🍎",
    morning_snack: "☕",
    afternoon_snack: "🍎",
    evening_snack: "🌆",
    late_snack: "🌙",
    late_night_snack: "🌙",
  };

  return (
    <div className="flex w-full justify-start">
      <div className="flex gap-2.5 max-w-[92%] sm:max-w-[88%]">
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-500 flex items-center justify-center">
          <Bot className="h-4 w-4" />
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div className="bg-green-950/40 border border-green-500/30 rounded-2xl rounded-tl-sm px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300 mb-1">
              Food logged successfully
            </p>
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              className="prose prose-sm prose-invert max-w-none text-green-100 prose-strong:text-white prose-p:leading-snug"
            />
          </div>

          <div className="bg-secondary/90 border border-primary/20 rounded-2xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{mealIcons[foodLogged.mealType] || "🍽️"}</span>
                <span className="text-xs text-muted-foreground capitalize truncate">
                  {foodLogged.mealType.replace(/_/g, " ")}
                </span>
              </div>
              <span className="text-[10px] font-medium bg-primary/15 text-primary px-2 py-1 rounded-full shrink-0">
                Added by AI
              </span>
            </div>

            <p className="font-semibold text-foreground text-sm sm:text-base capitalize mb-1 break-words">
              {foodLogged.name}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {foodLogged.quantity}
              {foodLogged.unit}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="text-center bg-background/60 rounded-xl py-2 px-2">
                <p className="text-sm font-bold text-primary">{foodLogged.calories}</p>
                <p className="text-[10px] text-muted-foreground">cal</p>
              </div>
              <div className="text-center bg-background/60 rounded-xl py-2 px-2">
                <p className="text-sm font-bold text-green-400">{foodLogged.protein}g</p>
                <p className="text-[10px] text-muted-foreground">protein</p>
              </div>
              <div className="text-center bg-background/60 rounded-xl py-2 px-2">
                <p className="text-sm font-bold text-yellow-400">{foodLogged.carbs}g</p>
                <p className="text-[10px] text-muted-foreground">carbs</p>
              </div>
              <div className="text-center bg-background/60 rounded-xl py-2 px-2">
                <p className="text-sm font-bold text-red-400">{foodLogged.fats}g</p>
                <p className="text-[10px] text-muted-foreground">fats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => getStoredMessages());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageUrlRef = useRef<string | null>(null);
  const messageImageUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const initChat = async () => {
      const userObj = getStoredUser();
      if (!userObj?.id) return;

      try {
        const res = await api.get<ProfileResponse>(`/api/profile/${userObj.id}`);
        const data = res.data;

        const calorieTarget = data.nutritionTargets?.calories || 2500;
        const caloriesConsumed = data.dailyIntake?.calories || 0;
        const proteinTarget = data.nutritionTargets?.protein || 180;
        const proteinConsumed = data.dailyIntake?.protein || 0;
        const workoutsThisWeek = data.workouts?.filter((workout) => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(workout.date) > weekAgo;
        }).length || 0;

        setUserStats({
          caloriesRemaining: calorieTarget - caloriesConsumed,
          proteinPercent: Math.min((proteinConsumed / proteinTarget) * 100, 100),
          streak: data.currentStreak || 0,
          workoutsThisWeek,
          calorieTarget,
          proteinTarget,
        });

        const savedMessages = getStoredMessages();
        const hasStoredHistory = savedMessages.some(
          (message) =>
            message.role === "user" ||
            message.type === "FOOD_LOG" ||
            message.content !== FALLBACK_WELCOME_MESSAGE.content,
        );

        if (hasStoredHistory) {
          setMessages(savedMessages);
        } else {
          setMessages([
            {
              role: "assistant",
              content: getWelcomeMessage(userObj.name?.split(" ")[0] || "there", calorieTarget - caloriesConsumed),
              type: "text",
              foodLogged: null,
              imageUrl: null,
            },
          ]);
        }
      } catch (err) {
        console.error("Error fetching stats for Chatbot", err);
      }
    };

    if (isOpen && userStats === null) {
      void initChat();
    }
  }, [isOpen, userStats]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        getChatHistoryKey(),
        JSON.stringify(
          messages.slice(-20).map((message) => ({
            ...message,
            imageUrl: message.imageUrl?.startsWith("blob:") ? null : message.imageUrl ?? null,
          })),
        ),
      );
    }
  }, [messages]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 80)}px`;
    }
  }, [input]);

  useEffect(() => () => {
    if (pendingImageUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImageUrlRef.current);
    }

    messageImageUrlsRef.current.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    messageImageUrlsRef.current.clear();
  }, []);

  const clearSelectedImage = ({ preservePreview = false } = {}) => {
    const pendingUrl = pendingImageUrlRef.current;
    pendingImageUrlRef.current = null;

    if (!preservePreview && pendingUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingUrl);
    }

    setSelectedImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const releaseChatImageUrls = () => {
    messageImageUrlsRef.current.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
    messageImageUrlsRef.current.clear();
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearSelectedImage();
    setIsPreparingImage(true);

    try {
      const preparedImage = await prepareVisionImage(file);
      const previewUrl = URL.createObjectURL(preparedImage);

      pendingImageUrlRef.current = previewUrl;
      setSelectedImage(preparedImage);
      setImagePreview(previewUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to prepare image.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } finally {
      setIsPreparingImage(false);
    }
  };

  const sendMessage = async (content: string) => {
    const trimmedContent = content.trim();
    const attachedImage = selectedImage;
    const attachedImagePreview = imagePreview;

    if ((!trimmedContent && !attachedImage) || isTyping || isPreparingImage) return;

    const userId = getStoredUser()?.id;
    if (!userId) return;

    const userMessage: Message = {
      role: "user",
      content: trimmedContent || "What do you see in this image?",
      type: "text",
      foodLogged: null,
      imageUrl: attachedImagePreview,
    };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    if (attachedImagePreview) {
      messageImageUrlsRef.current.add(attachedImagePreview);
    }
    clearSelectedImage({ preservePreview: Boolean(attachedImagePreview) });
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }

    try {
      const res = attachedImage
        ? await api.post<ChatResponse>(
            "/api/chat/vision",
            (() => {
              const formData = new FormData();
              formData.append("image", attachedImage);
              formData.append("message", trimmedContent);

              if (userStats) {
                formData.append(
                  "userContext",
                  JSON.stringify({
                    calorieTarget: userStats.calorieTarget,
                    caloriesRemaining: userStats.caloriesRemaining,
                    proteinTarget: userStats.proteinTarget,
                    streak: userStats.streak,
                    workoutsThisWeek: userStats.workoutsThisWeek,
                  }),
                );
              }

              return formData;
            })(),
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          )
        : await api.post<ChatResponse>("/api/chat", {
            messages: updatedMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })).slice(-10),
          });

      const { reply, type, foodLogged, updatedIntake } = res.data;
      const safeType: ChatMessageType = type === "FOOD_LOG" ? "FOOD_LOG" : "text";
      const botMessage: Message = {
        role: "assistant",
        content: reply || "I'm currently resting my circuits. Ask again later!",
        type: safeType,
        foodLogged: safeType === "FOOD_LOG" ? foodLogged ?? null : null,
        imageUrl: null,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (safeType === "FOOD_LOG" && foodLogged) {
        window.dispatchEvent(
          new CustomEvent("foodLoggedByAI", {
            detail: { foodLogged, updatedIntake: updatedIntake ?? null },
          }),
        );

        if (updatedIntake) {
          setUserStats((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              caloriesRemaining: prev.calorieTarget - updatedIntake.calories,
              proteinPercent: prev.proteinTarget > 0
                ? Math.min((updatedIntake.protein / prev.proteinTarget) * 100, 100)
                : prev.proteinPercent,
            };
          });
        }
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message
        || (attachedImage
          ? "Sorry, I couldn't analyze that image. Please try a clearer or smaller photo."
          : "Sorry, I had trouble with that. Please try again.");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          type: "text",
          foodLogged: null,
          imageUrl: null,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const handleClear = () => {
    clearSelectedImage();
    releaseChatImageUrls();

    const defaultMessage: Message = {
      role: "assistant",
      content: "Chat history cleared. What's on your mind?",
      type: "text",
      foodLogged: null,
      imageUrl: null,
    };

    setMessages([defaultMessage]);
    localStorage.removeItem(getChatHistoryKey());
  };

  const dynamicSuggestions = interleaveSuggestions(
    getDynamicSuggestions(userStats ?? {
      caloriesRemaining: 0,
      proteinPercent: 100,
      streak: 1,
      workoutsThisWeek: 3,
      calorieTarget: 2500,
      proteinTarget: 180,
    }),
    getFoodLogSuggestions(),
  );
  const canSendMessage = Boolean(input.trim() || selectedImage);

  return (
    <div ref={chatRef} className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end pointer-events-none">
      <div
        className={`bg-background border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-right flex flex-col ${
          isOpen
            ? "w-[95vw] sm:w-[380px] h-[75vh] sm:h-[520px] scale-100 opacity-100 mb-4 pointer-events-auto"
            : "w-[380px] h-[520px] scale-50 opacity-0 absolute bottom-16 right-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-r from-green-900/90 to-green-800/80 p-4 flex justify-between items-center border-b border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 bg-green-500/20 rounded-full flex justify-center items-center border border-green-400/40">
              <Bot className="h-5 w-5 text-green-400" />
              {isTyping && (
                <span className="absolute inset-0 rounded-full animate-ping border-2 border-green-400 opacity-50"></span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-wide">FuelBot</h3>
              <p className="text-[11px] text-green-300 font-medium flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_#4ade80]" />
                {isTyping ? "Typing..." : userStats ? `${userStats.caloriesRemaining} cal left today` : "Online & Ready"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleClear} className="text-green-300 hover:bg-black/20 hover:text-white h-8 w-8 rounded-full">
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-green-300 hover:bg-black/20 hover:text-white h-8 w-8 rounded-full">
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {messages.map((message, index) => (
            <div key={index}>
              {message.role === "assistant" ? (
                message.type === "FOOD_LOG" && message.foodLogged ? (
                  <FoodLogBubble foodLogged={message.foodLogged} content={message.content} />
                ) : (
                  <div className="flex w-full justify-start">
                    <div className="flex gap-2.5 max-w-[90%] group">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-green-500/20 border border-green-500/30 text-green-500 flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col gap-1 relative max-w-full">
                        <div className="relative px-4 py-2.5 text-sm leading-relaxed overflow-hidden break-words whitespace-pre-wrap bg-secondary border border-border/50 text-foreground rounded-2xl rounded-tl-sm">
                          <div
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
                            className="prose prose-sm prose-invert max-w-none text-foreground prose-strong:text-foreground prose-em:text-muted-foreground prose-p:leading-snug"
                          />

                          <button
                            onClick={() => {
                              void navigator.clipboard.writeText(message.content);
                              toast.success("Copied!");
                            }}
                            className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/10 z-10"
                            title="Copy text"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex w-full justify-end">
                  <div className="flex gap-2.5 max-w-[90%] group flex-row-reverse">
                    <div className="flex-shrink-0 h-6 w-6 mt-1 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center text-[10px] font-bold">
                      ME
                    </div>

                    <div className="flex flex-col gap-2 items-end relative max-w-full">
                      {message.imageUrl && (
                        <img
                          src={message.imageUrl}
                          alt="Uploaded by user"
                          className="max-w-[220px] sm:max-w-[240px] max-h-56 object-cover rounded-2xl border border-primary/25 shadow-sm"
                        />
                      )}

                      <div className="relative px-4 py-2.5 text-sm leading-relaxed overflow-hidden break-words whitespace-pre-wrap bg-primary/20 border border-primary/30 text-foreground rounded-2xl rounded-tr-sm">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex w-full justify-start">
              <TypingIndicator />
            </div>
          )}
          <div ref={bottomRef} className="h-px" />
        </div>

        {!isTyping && (messages[messages.length - 1]?.role === "assistant" || messages.length === 1) && (
          <div className="px-4 pb-3 flex overflow-x-auto gap-2 no-scrollbar shrink-0">
            {dynamicSuggestions.map((chip, index) => (
              <button
                key={index}
                onClick={() => void sendMessage(chip)}
                className="text-[11px] font-medium bg-secondary hover:bg-green-500/20 text-muted-foreground hover:text-green-500 border border-border/50 hover:border-green-500/30 px-3 py-1.5 rounded-full transition-all whitespace-nowrap shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div className="p-3 relative bg-card">
          {(imagePreview || isPreparingImage) && (
            <div className="mb-3 rounded-2xl border border-border/60 bg-secondary/40 p-3">
              {imagePreview ? (
                <div className="flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Selected for FuelBot"
                    className="h-16 w-16 rounded-xl object-cover border border-border/60"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Photo attached</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      FuelBot can estimate meals, read labels, or review progress photos.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => clearSelectedImage()}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Preparing your image for FuelBot...</p>
              )}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
            className="flex gap-2 items-end bg-secondary/30 border border-border/50 rounded-2xl p-1 pr-1.5 focus-within:ring-1 focus-within:ring-green-400/50 focus-within:border-green-400/50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                void handleImageSelect(event);
              }}
              disabled={isTyping || isPreparingImage}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isPreparingImage}
              className="shrink-0 h-9 w-9 rounded-xl mb-0.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              disabled={isTyping || isPreparingImage}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask FuelBot or attach a photo..."
              className="flex-1 max-h-[80px] min-h-[40px] bg-transparent resize-none py-2.5 px-3 focus:outline-none text-sm leading-tight text-foreground disabled:opacity-50 scrollbar-thin scrollbar-thumb-white/10"
              rows={1}
            />
            <Button
              type="submit"
              disabled={isTyping || isPreparingImage || !canSendMessage}
              size="icon"
              className={`shrink-0 h-9 w-9 rounded-xl mb-0.5 ml-1 transition-all flex items-center justify-center font-bold relative ${
                canSendMessage ? "bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-900/20" : "bg-white/5 text-muted-foreground"
              }`}
            >
              <Send className={`h-4 w-4 ${canSendMessage ? "translate-x-[1px] translate-y-[-1px]" : ""}`} />
            </Button>
          </form>
          {input.length > 200 && (
            <div className="absolute -top-5 right-4 text-[10px] text-muted-foreground font-medium">
              {input.length} chars
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-14 w-14 rounded-full flex justify-center items-center shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-300 transform hover:scale-110 z-50 ${
          isOpen ? "bg-secondary text-muted-foreground opacity-0 scale-50 pointer-events-none absolute" : "bg-gradient-to-br from-green-500 to-green-700 text-white"
        }`}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-background"></span>
        </span>
      </button>
    </div>
  );
}
