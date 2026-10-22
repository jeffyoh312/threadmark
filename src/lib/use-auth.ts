"use client";

import { useEffect, useState } from "react";
import { getApps, initializeApp } from "firebase/app";
import {
  deleteUser,
  reauthenticateWithPopup,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

// Firebase's browser configuration is public. Gemini credentials remain server-only.
const configuration = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const configured = Object.values(configuration).every(Boolean);
let initialization: Promise<Auth> | undefined;
function initializeAuth() {
  if (!initialization)
    initialization = (async () => {
      const app = getApps()[0] || initializeApp(configuration);
      const auth = getAuth(app);
      // Avoid retaining identity tokens on shared devices after the tab closes.
      await setPersistence(auth, inMemoryPersistence);
      return auth;
    })();
  return initialization;
}

export function useAuth(enabled = true) {
  const available = configured && enabled;
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState("");
  useEffect(() => {
    if (!available) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void initializeAuth()
      .then((auth) => {
        if (!active) return;
        unsubscribe = onAuthStateChanged(auth, (value) => {
          setUser(value);
          setReady(true);
        });
      })
      .catch(() => {
        if (active)
          setAuthError("Sign-in could not load. Please refresh and try again.");
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [available]);
  async function login() {
    setAuthError("");
    try {
      await signInWithPopup(await initializeAuth(), new GoogleAuthProvider());
    } catch {
      setAuthError(
        "Sign-in was not completed. Allow the Google popup and try again.",
      );
    }
  }
  async function logout() {
    setAuthError("");
    try {
      await signOut(await initializeAuth());
    } catch {
      setAuthError("Sign-out failed. Close this tab to clear the session.");
    }
  }
  async function token() {
    if (!configured || !user)
      throw new Error("Sign in with Google before running live analysis.");
    return user.getIdToken();
  }
  async function removeAccount() {
    if (!user) return false;
    setAuthError("");
    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      await deleteUser(user);
      return true;
    } catch {
      setAuthError(
        "Deletion was not completed. Allow the sign-in popup and try again, or contact the operator.",
      );
      return false;
    }
  }
  return {
    user,
    ready,
    configured: available,
    authError,
    login,
    logout,
    token,
    removeAccount,
  };
}
