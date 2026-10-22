import Link from "next/link";
import { Contact, LegalPage } from "@/components/legal-page";
import { publicSettings } from "@/lib/server/release";
export const metadata = { title: "Privacy Notice | Threadmark" };
export default function Privacy() {
  const settings = publicSettings();
  return (
    <LegalPage title="Privacy Notice">
      <p>
        This notice explains information processed when you browse, sign in or
        request analysis. <a href="#bahasa-melayu">Notis Bahasa Melayu</a>.
      </p>
      <Contact />
      <h2>Information and purpose</h2>
      <ul>
        <li>
          Google sign-in through Firebase provides an account identifier, email
          and available basic profile information such as display name and
          photo. Identity and verified email are used for access control and
          abuse prevention, not advertising. Threadmark does not receive your
          Google password or request Gmail, Drive or Contacts access.
        </li>
        <li>
          Submitted text passes through the application server to Google Gemini
          to generate a report. Use fictional or fully anonymised examples.
          Importing a text file reads it in your browser; text is sent only when
          analysis is requested.
        </li>
        <li>
          Upstash stores usage counters and temporary locks linked to a hash of
          your account ID, plus account-block records where needed. Hashing is
          pseudonymisation, not guaranteed anonymity.
        </li>
        <li>
          Vercel, Firebase and Cloudflare process technical and security
          information such as IP address, browser information and request
          timing. Vercel’s IP-derived country restricts analysis by region.
          Cloudflare Turnstile uses browser/security signals to check for
          automated abuse.
        </li>
      </ul>
      <h2>AI processing on this deployment</h2>
      {settings.dataMode === "unpaid" ? (
        <p>
          This deployment is configured for Gemini’s unpaid service. Google may
          use text and responses to provide, improve and develop products and
          machine-learning technologies. Human reviewers may read and process
          content. Do not submit personal, sensitive or confidential
          information.
        </p>
      ) : (
        <p>
          This deployment is configured for Gemini’s paid-service terms. Under
          those terms Google does not use prompts and responses to improve its
          products, but may retain them for a limited period for abuse detection
          and legal obligations. Only fictional or fully anonymised content is
          accepted here.
        </p>
      )}
      <p>
        This reflects the operator’s declared billing configuration. Actual
        processing is governed by the Google project and applicable{" "}
        <a href="https://ai.google.dev/gemini-api/terms">Gemini API terms</a>.
        Disabling interaction storage does not override those terms.
      </p>
      <h2>Storage and retention</h2>
      <p>
        The application does not maintain a database of conversations or
        reports. Content remains in the browser workspace until cleared,
        refreshed or closed. Downloaded reports remain on your device until you
        delete them. Text and reports pass through server memory during
        analysis; application code does not intentionally log conversation
        bodies, tokens or provider errors.
      </p>
      <p>
        Firebase keeps sign-in accounts until deletion. Browser sign-in is held
        in memory; refreshing requires signing in again. Usage counters expire
        within 48 hours of their last update; analysis locks and ingress
        counters expire within 120 seconds. Abuse-block records remain until the
        operator removes them following review. Provider security records and AI
        content follow their own retention rules and are not erased by closing
        this page.
      </p>
      <h2>Providers and international processing</h2>
      <p>
        Providers are{" "}
        <a href="https://firebase.google.com/support/privacy">
          Google Firebase
        </a>{" "}
        for identity,{" "}
        <a href="https://ai.google.dev/gemini-api/terms">Google Gemini</a> for
        analysis, <a href="https://vercel.com/legal/privacy-policy">Vercel</a>{" "}
        for hosting, <a href="https://upstash.com/trust">Upstash</a> for usage
        controls and{" "}
        <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> for
        bot verification. Processing may occur outside Malaysia where these
        providers operate. Threadmark does not sell account data or use it for
        targeted advertising.
      </p>
      <h2>Choice, cookies and rights</h2>
      <p>
        Submission is optional. Without sign-in, confirmations or bot
        verification, live analysis is unavailable; the example remains
        accessible. Stop submitting to withdraw consent for future analysis.
        Withdrawal cannot recall content already processed.
      </p>
      <p>
        No advertising or analytics trackers are added by the application.
        Authentication and security providers may use essential cookies or
        browser storage in their own flows, governed by their notices.
      </p>
      <p>
        Use <Link href="/account">Account & deletion</Link> to delete your
        Threadmark sign-in account. For access, correction, withdrawal, deletion
        or privacy complaints, contact the operator above. Identity may need to
        be verified, and retention or legal constraints will be explained. Do
        not send passwords, tokens or private conversation content.
      </p>
      <h2>Children and changes</h2>
      <p>
        Live analysis is not intended for anyone under 18. Contact us about any
        underage account. Material processing changes will be reflected here
        and, where required, in renewed consent.
      </p>
      <section id="bahasa-melayu" lang="ms">
        <h2>Notis Privasi Bahasa Melayu</h2>
        <p>
          Threadmark ialah demonstrasi analisis perbualan perniagaan. Pengendali
          dan alamat hubungan disenaraikan di atas. Analisis langsung hanya
          untuk pengguna berumur 18 tahun ke atas di wilayah yang disokong.
        </p>
        <h2>Maklumat dan tujuan</h2>
        <p>
          Log masuk Google melalui Firebase memberikan pengecam akaun, e-mel dan
          maklumat profil asas yang tersedia seperti nama dan foto. Maklumat ini
          digunakan untuk kawalan akses dan pencegahan penyalahgunaan, bukan
          pengiklanan. Threadmark tidak menerima kata laluan Google atau meminta
          akses Gmail, Drive atau Kenalan.
        </p>
        <p>
          Teks dihantar melalui pelayan kepada Google Gemini untuk menghasilkan
          laporan. Gunakan contoh rekaan atau teks yang telah dinyahkenal pasti
          sepenuhnya sahaja. Import fail membaca teks dalam pelayar; teks
          dihantar hanya apabila analisis diminta. Upstash menyimpan kaunter
          penggunaan, kunci sementara dan rekod sekatan yang dikaitkan dengan
          hash pengecam akaun. Hash tidak menjamin identiti tidak dapat dikenal
          pasti.
        </p>
        <p>
          Vercel, Firebase dan Cloudflare memproses maklumat teknikal seperti
          alamat IP, pelayar dan masa permintaan. Negara berdasarkan IP
          digunakan untuk sekatan wilayah. Cloudflare Turnstile memproses
          isyarat keselamatan bagi mengesan penyalahgunaan automatik.
        </p>
        <h2>Pemprosesan AI</h2>
        <p>
          {settings.dataMode === "unpaid"
            ? "Pelaksanaan ini menggunakan konfigurasi Gemini tanpa bayaran. Google boleh menggunakan teks dan jawapan untuk menyediakan, menambah baik dan membangunkan produk serta teknologi pembelajaran mesin. Penyemak manusia mungkin memproses kandungan tersebut. Jangan hantar maklumat peribadi, sensitif atau sulit."
            : "Pelaksanaan ini dikonfigurasi untuk terma Gemini berbayar. Google tidak menggunakan teks dan jawapan untuk menambah baik produknya di bawah terma tersebut, tetapi boleh menyimpannya bagi tempoh terhad untuk pengesanan penyalahgunaan dan kewajipan undang-undang. Hanya kandungan rekaan atau yang telah dinyahkenal pasti sepenuhnya dibenarkan."}
        </p>
        <p>
          Konfigurasi ini diisytiharkan oleh pengendali. Projek Google sebenar
          dan terma Gemini menentukan pemprosesan penyedia. Menyahaktifkan
          storan interaksi tidak mengatasi terma tersebut.
        </p>
        <h2>Penyimpanan dan penyedia</h2>
        <p>
          Aplikasi tidak menyimpan pangkalan data perbualan atau laporan.
          Kandungan kekal dalam pelayar sehingga dipadamkan, dimuat semula atau
          ditutup; laporan yang dimuat turun kekal pada peranti sehingga
          dipadamkan. Kandungan melalui memori pelayan semasa analisis. Kod
          aplikasi tidak sengaja merekodkan teks, token atau ralat penyedia.
        </p>
        <p>
          Akaun Firebase disimpan sehingga dipadamkan. Sesi pelayar disimpan
          dalam memori sahaja. Kaunter penggunaan luput dalam 48 jam selepas
          kemas kini terakhir; kunci analisis dan kaunter kemasukan luput dalam
          120 saat. Rekod sekatan kekal sehingga pengendali membuangnya selepas
          semakan. Log keselamatan penyedia dan kandungan AI mempunyai tempoh
          penyimpanan sendiri.
        </p>
        <p>
          Penyedia ialah Google Firebase, Google Gemini, Vercel, Upstash dan
          Cloudflare untuk tujuan yang dinyatakan di atas. Pautan notis penyedia
          disenaraikan di atas. Data boleh diproses di luar Malaysia. Threadmark
          tidak menjual data akaun atau menggunakannya untuk pengiklanan
          bersasar.
        </p>
        <h2>Pilihan dan hak</h2>
        <p>
          Penghantaran adalah pilihan. Tanpa log masuk, persetujuan atau semakan
          bot, analisis langsung tidak tersedia; contoh masih boleh dilihat.
          Hentikan penghantaran untuk menarik balik persetujuan masa hadapan.
          Ini tidak dapat menarik balik kandungan yang telah diproses.
        </p>
        <p>
          Aplikasi tidak menambah penjejak pengiklanan atau analitik. Penyedia
          mungkin menggunakan kuki atau storan pelayar penting dalam aliran
          identiti dan keselamatan mereka. Padamkan akaun melalui halaman Akaun
          & pemadaman. Hubungi pengendali untuk akses, pembetulan, penarikan
          balik persetujuan, pemadaman atau aduan. Identiti mungkin perlu
          disahkan dan kekangan pengekalan atau undang-undang akan dijelaskan.
          Jangan hantar kata laluan, token atau kandungan sulit.
        </p>
        <p>
          Hubungi pengendali jika akaun bawah umur telah diwujudkan. Perubahan
          penting akan dinyatakan di sini dan persetujuan baharu diminta apabila
          diperlukan.
        </p>
      </section>
    </LegalPage>
  );
}
