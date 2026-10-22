import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { publicSettings } from "@/lib/server/release";
import { POLICY_VERSION } from "@/lib/policy";
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 text-slate-700 sm:py-16">
      <Link href="/" className="text-sm font-medium text-indigo-700">
        ← Back to Threadmark
      </Link>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-3 text-xs text-slate-500">
        Last updated {POLICY_VERSION}
      </p>
      <article className="mt-8 space-y-6 text-sm leading-7 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_a]:text-indigo-700 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}
export function Contact() {
  const settings = publicSettings();
  return (
    <p>
      Operator: {settings.operator}, Malaysia.{" "}
      {settings.contact ? (
        <>
          Contact: <a href={`mailto:${settings.contact}`}>{settings.contact}</a>
          .
        </>
      ) : (
        "Live analysis is unavailable until an operator contact address has been published."
      )}
    </p>
  );
}
