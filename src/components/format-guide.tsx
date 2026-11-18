/**
 * Short help under the editor: how to lay out a pasted chat, and how to
 * export one from Telegram or WhatsApp. Each part is collapsed by default so
 * people who already know what to do aren't slowed down.
 */
export function FormatGuide() {
  return (
    <section className="guide" aria-labelledby="guide-title">
      <h2 id="guide-title">Getting a good brief</h2>

      <details>
        <summary>Typing or pasting a chat</summary>
        <div className="guide-body">
          <p>Threadmark reads best when every message is on its own line, starting with who said it:</p>
          <pre>{`[3 March]
Sam: Can we lock the launch for 3 March?
Lee: 3 March works. I'll draft the announcement.
Sam: Who's booking the venue?`}</pre>
          <ul>
            <li>
              Use the same name for each person every time. <q>Sam</q> and <q>Samuel</q> look like two
              people.
            </li>
            <li>
              Add a date line like <code>[3 March]</code> when the day changes, so words like{" "}
              <q>tomorrow</q> make sense.
            </li>
            <li>Include the replies. A yes, a no or no answer at all is what separates an agreement from a suggestion.</li>
            <li>Cut small talk if you need space. The limit is 20,000 characters.</li>
            <li>Swap real phone numbers, emails and addresses for made-up ones.</li>
          </ul>
        </div>
      </details>

      <details>
        <summary>Importing from Telegram</summary>
        <div className="guide-body">
          <p>Exports need Telegram Desktop on a computer; the phone apps can&apos;t do it.</p>
          <ol>
            <li>Open the chat in Telegram Desktop.</li>
            <li>
              Open the menu (<span aria-label="three dots">⋮</span>) and choose <strong>Export chat history</strong>.
            </li>
            <li>Untick photos, videos and files. Only the text is needed.</li>
            <li>
              Set <strong>Format</strong> to <strong>Machine-readable JSON</strong>, and narrow the date range if
              the chat is long.
            </li>
            <li>
              Choose <strong>Import a chat</strong> here and pick the <code>result.json</code> file.
            </li>
          </ol>
        </div>
      </details>

      <details>
        <summary>Importing from WhatsApp</summary>
        <div className="guide-body">
          <ol>
            <li>Open the chat on your phone.</li>
            <li>
              Android: tap <span aria-label="three dots">⋮</span>, then <strong>More</strong>, then{" "}
              <strong>Export chat</strong>. iPhone: tap the contact or group name, then{" "}
              <strong>Export chat</strong>.
            </li>
            <li>
              Choose <strong>Without media</strong> and send the file to yourself.
            </li>
            <li>
              Choose <strong>Import a chat</strong> here and pick the <code>.txt</code> file. On iPhone it may arrive as a
              .zip; open it first to get the .txt inside.
            </li>
          </ol>
        </div>
      </details>

      <p className="guide-note">
        Imported files are read in your browser and tidied into the format above. Only the text goes to the AI when
        you press Make brief. Long chats keep their newest messages.
      </p>
    </section>
  );
}
