import { api } from "@/lib/api";

export type NotificationSettings = {
  enabled: boolean;
  timezone: string;
  meals: { enabled: boolean; breakfast: string; lunch: string; dinner: string };
  water: boolean;
  streak: boolean;
  deviceCount: number;
};

export type PushSupport = { supported: boolean; reason?: string };

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const getPushSupport = (): PushSupport => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    if (isIos() && !isStandalone()) {
      return {
        supported: false,
        reason: "On iPhone, add FitFuel Hub to your Home Screen first (Share → Add to Home Screen), then open it from there.",
      };
    }
    return { supported: false, reason: "This browser doesn't support push notifications." };
  }
  return { supported: true };
};

const urlBase64ToUint8Array = (base64: string) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

/** The PWA service worker, or null if none is active (e.g. local dev server). */
const getServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
};

export const getCurrentSubscription = async () => {
  if (!getPushSupport().supported) return null;
  const registration = await getServiceWorker();
  return registration ? registration.pushManager.getSubscription() : null;
};

export const fetchNotificationSettings = async () =>
  (await api.get<NotificationSettings>("/api/notifications/settings")).data;

export const updateNotificationSettings = async (changes: Partial<Omit<NotificationSettings, "deviceCount">>) =>
  (await api.put<NotificationSettings>("/api/notifications/settings", changes)).data;

/** Asks for permission, subscribes this device and registers it with the server. */
export const enablePushOnThisDevice = async (): Promise<NotificationSettings> => {
  const support = getPushSupport();
  if (!support.supported) throw new Error(support.reason || "Push notifications aren't supported here.");

  const { data: config } = await api.get<{ available: boolean; publicKey: string | null }>("/api/notifications/config");
  if (!config.available || !config.publicKey) {
    throw new Error("Notifications aren't set up on the server yet.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
        : "Notification permission wasn't granted.",
    );
  }

  const registration = await getServiceWorker();
  if (!registration) {
    throw new Error("The app's service worker isn't running. Reload the page and try again.");
  }

  const subscription = (await registration.pushManager.getSubscription())
    ?? (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey),
    }));

  const { data } = await api.post<NotificationSettings>("/api/notifications/subscribe", {
    subscription: subscription.toJSON(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return data;
};

export const disablePushOnThisDevice = async (): Promise<NotificationSettings> => {
  const subscription = await getCurrentSubscription();
  const endpoint = subscription?.endpoint;
  if (subscription) await subscription.unsubscribe();
  const { data } = await api.post<NotificationSettings>("/api/notifications/unsubscribe", { endpoint });
  return data;
};

export const sendTestNotification = async () => {
  await api.post("/api/notifications/test");
};
