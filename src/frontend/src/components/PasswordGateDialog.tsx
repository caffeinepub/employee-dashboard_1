import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { cloneElement, isValidElement, useState } from "react";

const CORRECT_PASSWORD = "FIPL@2016";
const SESSION_KEY = "dash_pw_unlocked";

interface PasswordGateDialogProps {
  onSuccess: () => void;
  children: React.ReactNode;
  title?: string;
}

export function PasswordGateDialog({
  onSuccess,
  children,
  title = "Enter Password",
}: PasswordGateDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleTriggerClick = () => {
    // If already unlocked in this session, bypass
    if (sessionStorage.getItem(SESSION_KEY) === "true") {
      onSuccess();
      return;
    }
    setPassword("");
    setError("");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setOpen(false);
      setPassword("");
      setError("");
      onSuccess();
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  // Clone child to intercept click
  const trigger = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: handleTriggerClick,
      })
    : children;

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm" data-ocid="password_gate.dialog">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-primary" />
              </div>
              <DialogTitle>{title}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="pw-input" className="text-sm">
                Password
              </Label>
              <Input
                id="pw-input"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") setOpen(false);
                }}
                placeholder="Enter password"
                autoFocus
                data-ocid="password_gate.input"
              />
              {error && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="password_gate.error_state"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                data-ocid="password_gate.confirm_button"
              >
                Unlock
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                data-ocid="password_gate.cancel_button"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
