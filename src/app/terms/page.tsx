import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";
export const metadata = { title: "Terms of Use | Threadmark" };
export default function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        Threadmark is an experimental demonstration for reviewing fictional or
        fully anonymised business conversations. These terms apply to the hosted
        application. Live analysis requires affirmative acceptance before
        submission.
      </p>
      <h2>Eligibility and access</h2>
      <p>
        Live analysis is for adults aged 18 or older in supported regions. It is
        not intended for children. Do not misrepresent your age or location or
        bypass regional restrictions. Access may be limited to invited accounts.
        The example is available without submitting text or signing in.
      </p>
      <h2>Permitted content</h2>
      <p>
        Submit only fictional or fully anonymised text that you have permission
        to use. Do not submit personal, sensitive, confidential, proprietary or
        regulated information, private customer records, credentials, or real
        conversations without effective anonymisation and the necessary
        permissions. Replacing names alone may not remove identifying details.
      </p>
      <h2>AI output</h2>
      <p>
        Reports may omit context, misunderstand agreements, misclassify
        proposals or cite lines that do not support a conclusion. Check every
        finding against the original text. A citation identifies a source line;
        it does not prove that the model interpreted it correctly. Reports do
        not establish contracts, legal obligations, verified completion or
        professional advice. Do not use them for medical, legal, financial or
        other consequential decisions.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not attack the service, automate bulk submissions, evade quotas with
        multiple accounts, attempt unauthorised access, extract credentials,
        submit unlawful content or interfere with other users. Public
        source-code review is welcome. Report security issues privately rather
        than running disruptive tests against the live demo.
      </p>
      <h2>Processing permission</h2>
      <p>
        You retain any rights you hold in submitted content. By requesting
        analysis, you permit the transmission and processing needed to produce
        the report, as described in the{" "}
        <Link href="/privacy">Privacy Notice</Link>. Provider terms also apply.
        Do not submit content if you cannot grant the necessary permissions.
      </p>
      <h2>Availability and limits</h2>
      <p>
        This demonstration has no uptime or accuracy guarantee. It may be
        paused, restricted or discontinued. Quotas apply to attempts, including
        provider failures, and may change. This application does not collect
        payments. Access may be restricted where abuse is suspected.
      </p>
      <h2>Disclaimer and liability</h2>
      <p>
        To the extent permitted by applicable law, the demonstration is provided
        as available without warranties of accuracy, fitness for a particular
        purpose or uninterrupted access. The operator is not responsible for
        losses from reliance on unverified output to the extent that the law
        permits such a limitation. Nothing here excludes rights or liabilities
        that cannot lawfully be excluded.
      </p>
      <h2>Changes and contact</h2>
      <p>
        Material changes will be reflected in the version date and submission
        acceptance. If you disagree, stop using live analysis and use the
        account page to request deletion. These terms do not transfer ownership
        of third-party software, branding or content.
      </p>
      <Contact />
    </LegalPage>
  );
}
