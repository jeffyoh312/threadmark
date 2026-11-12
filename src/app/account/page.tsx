import { Contact, LegalPage } from "@/components/legal-page";
export const metadata = { title: "Data & deletion | Threadmark" };
export default function Account() {
  return (
    <LegalPage title="Data & deletion">
      <p>
        Threadmark no longer requires or creates accounts. Close or refresh the
        page to clear the conversation and brief from your browser workspace.
        Delete downloaded briefs from your device separately.
      </p>
      <h2>Previous Google sign-in accounts</h2>
      <p>
        If you used an earlier version with Google sign-in, removing that
        feature does not automatically delete the old Firebase account record.
        Contact the operator to request deletion. Do not send passwords, API
        keys or private conversations.
      </p>
      <h2>Usage and provider records</h2>
      <p>
        Usage counters expire within 48 hours of their last update. Temporary
        analysis locks expire within 120 seconds; shared concurrency records
        expire within 240 seconds. Existing abuse-block records require operator
        review. Closing the page does not recall text already sent to Gemini or
        delete providers’ own security records.
      </p>
      <Contact />
    </LegalPage>
  );
}
