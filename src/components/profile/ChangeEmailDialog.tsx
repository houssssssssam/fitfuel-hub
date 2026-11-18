import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  currentEmail: string;
  onOpenChange: (open: boolean) => void;
  onChanged: (email: string) => void;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;

export default function ChangeEmailDialog({ open, currentEmail, onOpenChange, onChanged }: Props) {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setStep("request");
    setNewEmail("");
    setPassword("");
    setCode("");
    setBusy(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const requestCode = async () => {
    if (!newEmail.trim() || !password) {
      toast.error("Enter your new email and current password.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ message: string }>("/api/auth/change-email/request", {
        newEmail: newEmail.trim(),
        password,
      });
      toast.success(data.message);
      setStep("confirm");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't send the code."));
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error("Enter the 6-digit code from the email.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<{ email: string }>("/api/auth/change-email/confirm", { code: code.trim() });
      toast.success("Email updated");
      onChanged(data.email);
      handleOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't confirm the code."));
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Change email
          </DialogTitle>
          <DialogDescription>
            {step === "request"
              ? `Your current email is ${currentEmail}. We'll send a code to the new address to confirm it's yours.`
              : `Enter the 6-digit code we sent to ${newEmail.trim()}.`}
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email</Label>
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-password">Current password</Label>
              <Input
                id="email-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void requestCode()}
                className="bg-secondary border-border"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="email-code">Verification code</Label>
            <Input
              id="email-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              onKeyDown={(event) => event.key === "Enter" && void confirmCode()}
              className="bg-secondary border-border text-center text-2xl tracking-[0.5em] font-mono"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setStep("request")}
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Use a different email
            </button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void (step === "request" ? requestCode() : confirmCode())} disabled={busy} className="gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {step === "request" ? "Send code" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
