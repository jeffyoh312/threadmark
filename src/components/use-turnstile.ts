"use client";

import { useCallback, useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | undefined;

function loadScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = undefined; // Let the next click try again.
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Invisible bot check. Nothing shows until the visitor presses the button;
 * Cloudflare only asks for a click in the rare case it isn't sure.
 *
 * Returns a ref for the (usually empty) container and `getToken()`, which
 * resolves with a fresh single-use token. Without a site key (local dev) it
 * resolves immediately with an empty token.
 */
export function useTurnstile() {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>(undefined);
  const pending = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void }>(undefined);

  useEffect(() => {
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    if (!SITE_KEY) return "";

    try {
      await loadScript();
    } catch {
      throw new Error("The bot check couldn't load. If you use a content blocker, allow challenges.cloudflare.com and try again.");
    }
    const turnstile = window.turnstile;
    if (!turnstile || !container.current) throw new Error("The bot check isn't ready yet. Try again.");

    return new Promise<string>((resolve, reject) => {
      pending.current = { resolve, reject };

      if (!widgetId.current) {
        widgetId.current = turnstile.render(container.current!, {
          sitekey: SITE_KEY,
          action: "analyze",
          execution: "execute",
          appearance: "interaction-only",
          callback: (token: string) => pending.current?.resolve(token),
          "error-callback": () => {
            pending.current?.reject(new Error("The bot check failed. Refresh the page and try again."));
            return true; // We handled it, so Turnstile doesn't log to the console.
          },
        });
      } else {
        // Tokens are single use, so each brief needs a fresh one.
        turnstile.reset(widgetId.current);
      }
      turnstile.execute(widgetId.current);
    });
  }, []);

  return { container, getToken };
}
