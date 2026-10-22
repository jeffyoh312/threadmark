import { AccountPanel } from "@/components/account-panel";
import { Contact, LegalPage } from "@/components/legal-page";
export const metadata = { title: "Account & deletion | Threadmark" };
export default function Account() {
  return (
    <LegalPage title="Account & deletion">
      <p>
        Threadmark uses Google sign-in through Firebase. It does not receive
        your Google password or request Gmail, Drive or Contacts access.
      </p>
      <AccountPanel />
      <h2>What remains after deletion</h2>
      <p>
        Usage counters keyed by a hash of your former account ID expire within
        48 hours of their last update. Temporary locks expire within 120
        seconds. Abuse-block records remain until an operator removes them
        following review. Provider security records and previously submitted AI
        content follow their own retention terms.
      </p>
      <p>
        Deleting an account does not recall text already sent to Gemini. There
        is no application report history. Refresh or close other open Threadmark
        tabs to clear displayed content.
      </p>
      <h2>Other data requests</h2>
      <p>
        Contact the operator for access, correction, withdrawal or deletion
        requests that cannot be completed here. Include your sign-in email,
        never a password, token, API key or private conversation. Identity may
        need to be verified before a request is fulfilled.
      </p>
      <Contact />
    </LegalPage>
  );
}
