"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, logoutAction } from "@/lib/actions/auth";
import { DEFAULT_USERNAME } from "@/lib/auth/constants";
import type {
  LogGameLocation,
  LogGamePlayer,
} from "@/lib/log-game-options";
import { LogGameForm } from "@/components/leaderboard/log-game-form";

type Props = {
  isAuthenticated: boolean;
  players: LogGamePlayer[];
  locations: LogGameLocation[];
};

export function LogGameFlow({
  isAuthenticated: initialAuthenticated,
  players,
  locations,
}: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [authOpen, setAuthOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openLogFlow() {
    if (isAuthenticated) {
      setLogOpen(true);
      return;
    }

    setAuthError(null);
    setPassword("");
    setAuthOpen(true);
  }

  function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthError(null);

    startTransition(async () => {
      const result = await loginAction(DEFAULT_USERNAME, password);
      if (!result.ok) {
        setAuthError(result.error);
        return;
      }

      setIsAuthenticated(true);
      setAuthOpen(false);
      setPassword("");
      setLogOpen(true);
    });
  }

  function handleLogSuccess() {
    router.refresh();
  }

  function handleSignOut() {
    startTransition(async () => {
      await logoutAction();
      setIsAuthenticated(false);
      setLogOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" className="text-xs" onClick={openLogFlow}>
        Log Game
      </Button>

      <Dialog
        open={authOpen}
        onOpenChange={(nextOpen) => {
          setAuthOpen(nextOpen);
          if (!nextOpen) {
            setPassword("");
            setAuthError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <form onSubmit={handleAuthSubmit}>
            <DialogHeader>
              <DialogTitle>Sign in to log a game</DialogTitle>
              <DialogDescription>
                Enter the shared password to continue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="auth-username">Username</Label>
                <Input
                  id="auth-username"
                  value={DEFAULT_USERNAME}
                  readOnly
                  className="h-8 bg-muted/40 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-8 text-xs"
                  autoFocus
                />
              </div>

              {authError ? (
                <p className="text-xs text-destructive">{authError}</p>
              ) : null}
            </div>

            <DialogFooter className="pt-2">
              <Button type="submit" disabled={isPending || !password}>
                {isPending ? "Signing in…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <LogGameForm
        open={logOpen}
        onOpenChange={setLogOpen}
        players={players}
        locations={locations}
        onSuccess={handleLogSuccess}
        onSignOut={handleSignOut}
      />
    </>
  );
}
