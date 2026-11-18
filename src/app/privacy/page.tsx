import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy and terms | Threadmark" };

// Kept short on purpose: this is a public demo and the honest answer to
// "what happens to my text?" fits on one page.
export default function Privacy() {
  return (
    <article className="prose">
      <Link href="/" className="back-link">
        Back to Threadmark
      </Link>
      <h1>Privacy and terms</h1>
      <p className="prose-updated">Last updated 18 November 2026</p>

      <h2>What happens to your text</h2>
      <p>
        When you press <strong>Make brief</strong>, the conversation is sent to the Threadmark
        server and on to Google Gemini, which writes the brief. Threadmark uses Gemini&apos;s free
        tier, so Google may use what you send to improve its products and people at Google may
        review it. Please only paste conversations you&apos;re happy to share, and leave out
        personal, sensitive or confidential details.
      </p>
      <p>
        So that pressing the button twice doesn&apos;t use the AI twice, the finished brief is
        kept for 24 hours under a fingerprint (hash) of the text. It isn&apos;t linked to you, your
        IP address or anything else that identifies you. The example brief never leaves your
        browser.
      </p>

      <h2>Limits and bot checks</h2>
      <p>
        To keep the demo free and fair, each visitor gets a small number of briefs per day.
        Your IP address is turned into an anonymous code before it&apos;s used to count them, and
        the counts expire within two days. Cloudflare Turnstile checks that requests come from a
        real browser; it usually runs without you noticing.
      </p>

      <h2>No accounts, no tracking</h2>
      <p>
        There are no accounts, analytics or advertising cookies. Refreshing the page clears your
        conversation and brief. Download or copy a brief if you want to keep it.
      </p>

      <h2>Services used</h2>
      <ul>
        <li>
          <a href="https://ai.google.dev/gemini-api/terms">Google Gemini</a> writes the brief.
        </li>
        <li>
          <a href="https://vercel.com/legal/privacy-policy">Vercel</a> hosts the site.
        </li>
        <li>
          <a href="https://upstash.com/trust/privacy.pdf">Upstash</a> stores the usage counts and
          the 24-hour cache.
        </li>
        <li>
          <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> runs the bot check.
        </li>
      </ul>
      <p>Live analysis isn&apos;t offered in the EEA, UK or Switzerland, where Gemini&apos;s free tier can&apos;t be used.</p>

      <h2>Using the demo</h2>
      <p>
        Threadmark is a demo, offered as is. AI can miss context or misread an agreement, so check
        the marked lines before relying on a brief; it isn&apos;t legal or professional advice.
        Please don&apos;t use it to process other people&apos;s private messages without their
        permission, try to get around the limits, or load-test the site.
      </p>

      <h2>Questions</h2>
      <p>
        Open an issue on <a href="https://github.com/jeffyoh312/threadmarks/issues">GitHub</a>. Don&apos;t
        include private conversation text in it.
      </p>
    </article>
  );
}
