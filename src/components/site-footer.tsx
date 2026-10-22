import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500">
      <p>Threadmark · A conversation worth checking.</p>
      <nav aria-label="Legal and account" className="flex flex-wrap gap-4">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/account">Account & deletion</Link>
        <Link href="/accessibility">Accessibility</Link>
      </nav>
    </footer>
  );
}
