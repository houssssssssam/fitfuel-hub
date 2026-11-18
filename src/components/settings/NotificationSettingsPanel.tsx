import { useEffect, useState } from "react";
import { BellOff, BellRing, Droplets, Flame, Loader2, Send, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type NotificationSettings,
  disablePushOnThisDevice,
  enablePushOnThisDevice,
  fetchNotificationSettings,
  getCurrentSubscription,
  getPushSupport,
  sendTestNotification,
  updateNotificationSettings,
} from "@/lib/pushNotifications";

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message
  || (error instanceof Error ? error.message : fallback);

const MEAL_SLOTS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
] as const;

const Row = ({
  icon: Icon,
  title,
  description,
  checked,
  disabled,
  onChange,
  children,
}: {
  icon: typeof Utensils;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="py-4 border-b border-border/50 last:border-b-0">
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
    {children}
  </div>
);

export default function NotificationSettingsPanel() {
  const support = getPushSupport();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [thisDeviceOn, setThisDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([fetchNotificationSettings(), getCurrentSubscription().catch(() => null)])
      .then(([serverSettings, subscription]) => {
        setSettings(serverSettings);
        setThisDeviceOn(Boolean(subscription) && serverSettings.enabled);
      })
      .catch(() => toast.error("Couldn't load notification settings"))
      .finally(() => setLoading(false));
  }, []);

  const toggleThisDevice = async (enable: boolean) => {
    setBusy(true);
    try {
      const next = enable ? await enablePushOnThisDevice() : await disablePushOnThisDevice();
      setSettings(next);
      setThisDeviceOn(enable);
      toast.success(enable ? "Notifications turned on for this device" : "Notifications turned off for this device");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't change notifications"));
    } finally {
      setBusy(false);
    }
  };

  const save = async (changes: Parameters<typeof updateNotificationSettings>[0]) => {
    if (!settings) return;
    const previous = settings;
    setSettings({ ...settings, ...changes, meals: { ...settings.meals, ...(changes.meals || {}) } });
    try {
      setSettings(await updateNotificationSettings(changes));
    } catch (error) {
      setSettings(previous);
      toast.error(getErrorMessage(error, "Couldn't save"));
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      await sendTestNotification();
      toast.success("Test notification sent");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't send the test"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const remindersDisabled = !settings?.enabled;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-xl p-5">
        {support.supported ? (
          <div className="flex items-start gap-3">
            {thisDeviceOn ? (
              <BellRing className="h-6 w-6 text-primary shrink-0" />
            ) : (
              <BellOff className="h-6 w-6 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">Notifications on this device</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {thisDeviceOn
                  ? `On. ${settings?.deviceCount || 1} device${(settings?.deviceCount || 1) === 1 ? "" : "s"} will get reminders.`
                  : "Turn on to get reminders here, even when FitFuel Hub is closed."}
              </p>
            </div>
            {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : (
              <Switch checked={thisDeviceOn} onCheckedChange={(checked) => void toggleThisDevice(checked)} />
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <BellOff className="h-6 w-6 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium text-foreground">Notifications aren't available here</p>
              <p className="text-xs text-muted-foreground mt-0.5">{support.reason}</p>
            </div>
          </div>
        )}
        {thisDeviceOn && (
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => void handleTest()} disabled={busy}>
            <Send className="h-3.5 w-3.5" /> Send a test notification
          </Button>
        )}
      </div>

      {settings && (
        <div className={`bg-card border border-border/50 rounded-xl px-5 ${remindersDisabled ? "opacity-60" : ""}`}>
          <Row
            icon={Utensils}
            title="Meal reminders"
            description="Only sent if you haven't logged that meal yet."
            checked={settings.meals.enabled}
            disabled={remindersDisabled}
            onChange={(enabled) => void save({ meals: { ...settings.meals, enabled } })}
          >
            {settings.meals.enabled && (
              <div className="grid grid-cols-3 gap-3 mt-3 pl-8">
                {MEAL_SLOTS.map((slot) => (
                  <label key={slot.key} className="space-y-1">
                    <span className="text-[11px] text-muted-foreground">{slot.label}</span>
                    <Input
                      type="time"
                      value={settings.meals[slot.key]}
                      disabled={remindersDisabled}
                      onChange={(event) => {
                        if (event.target.value) void save({ meals: { ...settings.meals, [slot.key]: event.target.value } });
                      }}
                      className="bg-secondary border-border h-9 text-sm"
                    />
                  </label>
                ))}
              </div>
            )}
          </Row>
          <Row
            icon={Droplets}
            title="Water reminders"
            description="Around 11:00, 15:00 and 18:30, only if you're behind on water."
            checked={settings.water}
            disabled={remindersDisabled}
            onChange={(water) => void save({ water })}
          />
          <Row
            icon={Flame}
            title="Streak protection"
            description="At 21:00 if you haven't logged anything today and have a streak going."
            checked={settings.streak}
            disabled={remindersDisabled}
            onChange={(streak) => void save({ streak })}
          />
          <p className="text-[11px] text-muted-foreground py-3">
            Times use your device's time zone ({settings.timezone}).
          </p>
        </div>
      )}
    </div>
  );
}
