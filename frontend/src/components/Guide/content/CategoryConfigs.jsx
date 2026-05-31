import { H1, H2, H3, Lead, P, UL, OL, LI, A, Code, Note, Screenshot, Steps, Step, KVList, KV } from '../primitives';

export const toc = [
  { id: 'what-is',           level: 2, label: 'What a config does' },
  { id: 'all-configs',       level: 2, label: 'Browse — All Configs' },
  { id: 'register',          level: 2, label: 'Register a new config' },
  { id: 'register-template', level: 3, label: 'Template name & job ID' },
  { id: 'register-envs',     level: 3, label: 'Fetching env variables' },
  { id: 'register-table',    level: 3, label: 'Choosing what to include' },
  { id: 'register-summary',  level: 3, label: 'Generate the summary' },
  { id: 'register-flags',    level: 3, label: 'Internal / public flags' },
  { id: 'register-submit',   level: 3, label: 'Submit' },
  { id: 'update',            level: 2, label: 'Update an existing config' },
  { id: 'update-safe',       level: 3, label: 'What’s safe to change' },
  { id: 'update-careful',    level: 3, label: 'What needs care' },
  { id: 'summary-only',      level: 2, label: 'Just generate a summary' },
];

export default function CategoryConfigs({ onNavigate }) {
  return (
    <>
      <H1>Category Configs</H1>
      <Lead>
        After a template’s files land in cloud storage, you register a{' '}
        <em>category config</em> — the small record that tells the platform how
        to set the template up for new users. This page covers all four
        config-related workflows: browsing, registering, updating, and
        generating a summary.
      </Lead>

      <H2 id="what-is">What a config does</H2>
      <P>A category config holds:</P>
      <UL>
        <LI>The <strong className="text-[#e6edf3]">template name</strong> — the link to the GCS snapshot you created in <A onClick={() => onNavigate?.('guide-create')}>Create a Template</A>.</LI>
        <LI>A set of <strong className="text-[#e6edf3]">env variables</strong> to inject when a user forks the template.</LI>
        <LI>An AI-generated <strong className="text-[#e6edf3]">app summary</strong> describing what the app does, surfaced to end users.</LI>
        <LI><strong className="text-[#e6edf3]">Internal</strong> and <strong className="text-[#e6edf3]">public</strong> flags controlling visibility.</LI>
        <LI>A <strong className="text-[#e6edf3]">default env config</strong> blob — anything else the platform needs to bring the app up.</LI>
      </UL>

      <H2 id="all-configs">Browse — All Configs</H2>
      <P>
        Open <A onClick={() => onNavigate?.('config-all')}>All Configs</A>{' '}
        in the sidebar to see every registered config in the current
        environment. The page shows a searchable, filterable list.
      </P>
      <Screenshot name="configs-all-list" caption="All Configs page with search bar, filter chips (label / has summary / sort), and a list of config rows." />
      <P>Each row shows:</P>
      <UL>
        <LI>The template name and one or two GitHub-style label pills (e.g. <strong className="text-[#e6edf3]">internal</strong>, <strong className="text-[#e6edf3]">public</strong>).</LI>
        <LI>The first ~120 characters of the app summary, if one was generated.</LI>
        <LI>Created/updated timestamps, written in human time (<em>"3d ago"</em>, <em>"2w ago"</em>).</LI>
      </UL>
      <P>Three ways to find a specific config:</P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Search</strong> by template name or any text in the summary.</LI>
        <LI><strong className="text-[#e6edf3]">Filter</strong> by label (internal / public) or "has summary".</LI>
        <LI><strong className="text-[#e6edf3]">Sort</strong> by newest or oldest.</LI>
      </UL>
      <P>
        Clicking a row opens the config detail view, with an Edit button at the
        top-right that drops you into Create Config in edit mode.
      </P>

      <H2 id="register">Register a new config</H2>
      <P>
        From the sidebar, click{' '}
        <A onClick={() => onNavigate?.('config-create')}>Create Config</A>. This
        is the longest form in the app — but it’s designed to be filled top to
        bottom.
      </P>
      <Screenshot name="configs-create-form" caption="Create Config page with template name, job ID, fetch button, variables table, and submit button." />

      <H3 id="register-template">Template name & job ID</H3>
      <OL>
        <LI><strong className="text-[#e6edf3]">Template name</strong> — must match exactly what you used in Step 4 of Create a Template. Case-sensitive.</LI>
        <LI><strong className="text-[#e6edf3]">Job ID</strong> — the same source job. The tool will read this job’s pod to pull its current env variables.</LI>
      </OL>

      <H3 id="register-envs">Fetching env variables</H3>
      <P>
        Click <strong className="text-[#e6edf3]">Fetch Env Variables</strong>.
        The tool reads the pod’s <Code>.env</Code> file (from{' '}
        <Code>/app/backend/.env</Code> or <Code>/app/.env</Code>) and pre-fills
        the variables table. Each row gets a small <em>source badge</em> to
        help you understand where it came from:
      </P>
      <KVList>
        <KV label="ENVCORE">Variable was found on the pod just now. The value is real and current.</KV>
        <KV label="MODIFIED">You edited the value in the table after fetching.</KV>
        <KV label="MANUAL">You typed this variable in by hand — it wasn’t on the pod.</KV>
        <KV label="EXISTING">If you’re editing an existing config, this row was already on the saved config (and is loaded for context).</KV>
      </KVList>

      <H3 id="register-table">Choosing what to include</H3>
      <P>
        Not every env variable on a pod belongs in a template. The table has a
        checkbox column so you can pick which ones to ship. Defaults are:
      </P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Include</strong> — generic config keys: <Code>NODE_ENV</Code>, <Code>PORT</Code>, public API base URLs, feature flags the user can tweak.</LI>
        <LI><strong className="text-[#e6edf3]">Exclude</strong> — secrets and personal data: actual API keys, database passwords, user IDs, tokens the source customer generated for themselves.</LI>
      </UL>
      <P>
        For included rows you want to ship with a placeholder rather than the
        real value, edit the value field in place. The row’s badge will flip to
        <strong className="text-[#e6edf3]"> MODIFIED</strong> so you can spot
        what you’ve changed.
      </P>
      <Note tone="caution">
        If a variable looks unfamiliar — say a custom <Code>WEBHOOK_SECRET</Code> for the
        source customer’s integration — leave it unchecked. The cost of shipping
        a real secret in a template is much higher than the cost of asking a
        new user to set their own.
      </Note>

      <H3 id="register-summary">Generate the summary</H3>
      <P>
        Above the variables table there’s a <strong className="text-[#e6edf3]">Generate
        Summary</strong> button. Clicking it calls the agent service to produce
        a description of what the app does, based on the template’s code. It
        usually takes 30–60 seconds.
      </P>
      <P>
        Once it returns, the result is stored in <Code>config.app_summary</Code> on
        the config you’re about to submit. You don’t need to copy or paste
        anything — it’s wired up automatically.
      </P>
      <Note>
        You can skip this step and add a summary later via the dedicated{' '}
        <A onClick={() => onNavigate?.('config-summary')}>Generate Summary</A>{' '}
        page if you’re in a hurry. Templates without summaries still work but
        are less discoverable.
      </Note>

      <H3 id="register-flags">Internal / public flags</H3>
      <UL>
        <LI><strong className="text-[#e6edf3]">Internal</strong> — defaults to checked. Internal templates are only visible to people inside Emergent and don’t show up to outside users.</LI>
        <LI><strong className="text-[#e6edf3]">Public</strong> — defaults to unchecked. Public templates are listed in the platform’s template gallery for any user to fork.</LI>
      </UL>
      <P>
        Most templates you make start as <strong className="text-[#e6edf3]">internal,
        not public</strong>. Promoting to public should be a deliberate
        decision after at least one round of internal use.
      </P>

      <H3 id="register-submit">Submit</H3>
      <OL>
        <LI>Scroll to the bottom and click <strong className="text-[#e6edf3]">Create Config</strong>.</LI>
        <LI>A green banner appears with the new config’s ID.</LI>
        <LI>The All Configs list refreshes; you’ll find the new row at the top if you sort by newest.</LI>
      </OL>
      <P>
        If submit fails, the form keeps everything you entered — your work isn’t
        lost. Common failures: missing template name, the template name doesn’t
        match a real GCS snapshot, or the platform API is having trouble.
      </P>

      <H2 id="update">Update an existing config</H2>
      <P>
        From <A onClick={() => onNavigate?.('config-all')}>All Configs</A>, click
        the row of the config you want to edit. The detail page shows
        everything; the Edit button in the top-right opens the same form in
        edit mode, pre-filled.
      </P>
      <P>
        You can also load a config directly from Create Config — paste either
        its numeric ID or its template name into the "Load existing" input at
        the top and click Load.
      </P>

      <H3 id="update-safe">What’s safe to change</H3>
      <UL>
        <LI><strong className="text-[#e6edf3]">App summary</strong> — regenerate or hand-edit. Visible to users.</LI>
        <LI><strong className="text-[#e6edf3]">Env variable values</strong> for non-secret rows — useful when defaults need to change.</LI>
        <LI><strong className="text-[#e6edf3]">Internal / public flags</strong> — flipping a template from internal to public after vetting.</LI>
        <LI><strong className="text-[#e6edf3]">Adding new env variables</strong> — when the underlying app gained a new env requirement.</LI>
      </UL>

      <H3 id="update-careful">What needs care</H3>
      <KVList>
        <KV label="Renaming the template">
          The config’s template name is the link to the GCS snapshot. Don’t change it unless you’ve also re-snapshotted under the new name in Create a Template. Otherwise users will fork a template that points nowhere.
        </KV>
        <KV label="Removing variables">
          If you uncheck a variable that the app actually requires at boot, new
          forks of the template will fail to start. When in doubt, leave it.
        </KV>
        <KV label="Changing the source job ID">
          Usually you don’t. The source job is only used to fetch env vars at
          create time — it isn’t referenced later. But if you re-bind to a
          different job and re-fetch, you may pull in env vars from an
          unrelated customer.
        </KV>
      </KVList>

      <H2 id="summary-only">Just generate a summary</H2>
      <P>
        If a template already exists and you just need to attach (or
        regenerate) its summary, use the standalone{' '}
        <A onClick={() => onNavigate?.('config-summary')}>Generate Summary</A>{' '}
        page.
      </P>
      <OL>
        <LI>Type the template name.</LI>
        <LI>Click <strong className="text-[#e6edf3]">Generate Summary</strong>.</LI>
        <LI>Wait 30–60 seconds. The full JSON response (including the summary text and any structured metadata) appears below.</LI>
      </OL>
      <P>
        The page calls the same agent-service endpoint as the Create Config form
        does — but here you can run it stand-alone, e.g. to compare two
        regenerations side by side.
      </P>
      <Screenshot name="configs-summary-result" caption="Generate Summary page showing the template-name input and a generated summary in the result panel." />

      <P>
        That’s the full lifecycle of a category config. Next, learn how to
        confirm a template you just created is actually visible —{' '}
        <A onClick={() => onNavigate?.('guide-verify')}>Verify a Template</A>.
      </P>
    </>
  );
}
