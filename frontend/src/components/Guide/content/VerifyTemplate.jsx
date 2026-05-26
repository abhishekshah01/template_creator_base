import { H1, H2, Lead, P, UL, OL, LI, A, Code, Note, Screenshot, KVList, KV } from '../primitives';

export const toc = [
  { id: 'why-verify',     level: 2, label: 'Why verify' },
  { id: 'search',         level: 2, label: 'Search by template name' },
  { id: 'expect',         level: 2, label: 'What to expect on a hit' },
  { id: 'no-results',     level: 2, label: 'No results — what now' },
  { id: 'spot-checks',    level: 2, label: 'Quick spot-checks' },
];

export default function VerifyTemplate({ onNavigate }) {
  return (
    <>
      <H1>Verify a Template</H1>
      <Lead>
        After Create a Template’s Step 4 prints a GCS path, and after you’ve
        registered a category config, you should confirm the result is
        actually visible in the system. This page covers the quickest way to
        do that.
      </Lead>

      <H2 id="why-verify">Why verify</H2>
      <P>
        Two things can go quietly wrong without an explicit verify:
      </P>
      <UL>
        <LI>The template’s GCS path exists but no config points to it — the platform doesn’t know it’s there, so no user can fork it.</LI>
        <LI>The config exists, but with the wrong template name — forks would 404 trying to find the snapshot.</LI>
      </UL>
      <P>
        Both surface as "I created the template but it isn’t showing up". A
        30-second check on the All Configs page catches them immediately.
      </P>

      <H2 id="search">Search by template name</H2>
      <OL>
        <LI>Open <A onClick={() => onNavigate?.('config-all')}>All Configs</A> in the sidebar.</LI>
        <LI>Type the template name you used (e.g. <Code>lead-gen-v0</Code>) into the search bar at the top.</LI>
        <LI>The list filters live as you type. If there’s a match, it’ll be the only row visible.</LI>
      </OL>
      <Screenshot name="verify-search-hit" caption="All Configs page with the search bar focused, showing one filtered row matching the template name." aspect="16/7" />

      <H2 id="expect">What to expect on a hit</H2>
      <P>On a successful verification, the row should show:</P>
      <KVList>
        <KV label="Template name">Exactly the name you typed in Create Template Step 1 and Create Config’s template name field.</KV>
        <KV label="Labels">An <strong className="text-[#e6edf3]">internal</strong> pill at minimum (since most templates start internal). A <strong className="text-[#e6edf3]">public</strong> pill too if you flipped it on intentionally.</KV>
        <KV label="Summary preview">A short paragraph describing the app — if you generated a summary. Missing summary is fine; the template still works, it just won’t be discoverable.</KV>
        <KV label="Timestamp">"just now" or "Nm ago" in muted gray. Anything older than your work today means you’re looking at a stale row.</KV>
      </KVList>
      <P>
        Click the row to open the detail view and confirm the env variables and
        the summary text look right. If anything’s off, click Edit to fix it
        without recreating the template.
      </P>

      <H2 id="no-results">No results — what now</H2>
      <P>
        If the search bar returns nothing for a template name you just created,
        work through these in order:
      </P>
      <KVList>
        <KV label="Wrong environment?">
          The most common cause. The list is scoped to whichever environment is
          selected in the sidebar. Switch to the env where you created the
          config and search again.
        </KV>
        <KV label="Typo in the search?">
          Try the first few characters only. Template names are case-sensitive,
          but the search is partial-match.
        </KV>
        <KV label="Did Create Config succeed?">
          Go back to <A onClick={() => onNavigate?.('config-create')}>Create Config</A>{' '}
          — if there’s still form state with the template name in it but no
          green submission banner, you may have closed the page before
          submitting. Submit it now.
        </KV>
        <KV label="Did Create Template succeed?">
          If the GCS path from Step 4 was never produced, there’s nothing to
          register a config for. Re-run the create-template workflow from
          wherever it broke.
        </KV>
        <KV label="Stale cache?">
          The list is cached for the session. Click the refresh icon at the top
          right of All Configs to force a fresh fetch.
        </KV>
      </KVList>

      <H2 id="spot-checks">Quick spot-checks</H2>
      <P>For thorough verification (e.g. before a customer demo):</P>
      <UL>
        <LI>Confirm the config row has the right <strong className="text-[#e6edf3]">internal/public</strong> flags for your intent.</LI>
        <LI>Click into the config and scroll through the env variables — none should be real secrets, all should be either generic defaults or empty placeholders.</LI>
        <LI>Check the <Code>app_summary</Code> reads correctly, with no leftover customer names or proprietary data.</LI>
        <LI>If you’re feeling thorough, ask an engineer to confirm a fork of the template actually boots clean.</LI>
      </UL>
      <Note>
        For day-to-day template work, the search-and-confirm-row check is
        enough. Save the deep spot-check for templates you’re about to flip
        public.
      </Note>
    </>
  );
}
