"use client";
import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
export function AccountPanel() {
  const auth = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      setDeleted(await auth.removeAccount());
    } finally {
      setBusy(false);
    }
  }
  if (deleted)
    return (
      <p role="status">
        Your Threadmark sign-in account has been deleted. Your Google account is
        unchanged. Temporary usage counters expire automatically.
      </p>
    );
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      {!auth.configured ? (
        <p>
          Sign-in is not configured on this deployment. Contact the operator
          below for existing account requests.
        </p>
      ) : auth.user ? (
        <>
          <p>
            Signed in as <strong>{auth.user.email}</strong>
          </p>
          <p className="mt-3">
            Deletion removes your Firebase sign-in record for Threadmark. Google
            will ask you to verify your identity again.
          </p>
          <label className="mt-4 flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-indigo-600"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I understand that this deletes my Threadmark sign-in account.
          </label>
          <button
            className="mt-4 rounded-lg bg-rose-700 px-4 py-2 font-medium text-white disabled:opacity-40"
            disabled={!confirmed || busy}
            onClick={() => void remove()}
          >
            {busy ? "Deleting…" : "Delete my Threadmark account"}
          </button>
        </>
      ) : (
        <button
          disabled={!auth.ready}
          onClick={() => void auth.login()}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {auth.ready ? "Sign in to manage your account" : "Loading sign-in…"}
        </button>
      )}
      {auth.authError && (
        <p role="alert" className="mt-3 text-rose-700">
          {auth.authError}
        </p>
      )}
    </section>
  );
}
