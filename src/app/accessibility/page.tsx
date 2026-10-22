import { Contact, LegalPage } from "@/components/legal-page";
export const metadata = { title: "Accessibility | Threadmark" };
export default function Accessibility() {
  return (
    <LegalPage title="Accessibility">
      <p>
        Threadmark aims to support keyboard navigation, labelled controls,
        readable contrast and reduced-motion preferences. Findings link to
        original source lines, and status/error messages are exposed to
        assistive technology.
      </p>
      <p>
        Google sign-in and Cloudflare verification are third-party services. If
        a popup, challenge, report or control prevents access, contact the
        operator with the page, browser and issue. Do not include private
        conversation content.
      </p>
      <p>
        No formal accessibility certification or full WCAG conformance audit is
        claimed.
      </p>
      <Contact />
    </LegalPage>
  );
}
