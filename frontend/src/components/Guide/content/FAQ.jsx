import { H1, H2, Lead, P, UL, LI, A, Code, Note, KVList, KV } from '../primitives';

export const toc = [
  { id: 'auth',          level: 2, label: 'Auth & tokens' },
  { id: 'env',           level: 2, label: 'Environments' },
  { id: 'create',        level: 2, label: 'Create Template' },
  { id: 'configs',       level: 2, label: 'Category configs' },
  { id: 'data-loss',     level: 2, label: 'I lost my work' },
  { id: 'still-stuck',   level: 2, label: 'Still stuck' },
];

export default function FAQ({ onNavigate }) {
  return (
    <>
      <H1>FAQ & Troubleshooting</H1>
      <Lead>
        Quick answers to the things that come up most often. Skim the headers,
        find your symptom, follow the steps.
      </Lead>

      <H2 id="auth">Auth & tokens</H2>
      <KVList>
        <KV label="The sidebar pill says “Not set”">
          You haven’t pasted a bearer token yet. Open{' '}
          <A onClick={() => onNavigate?.('settings')}>Settings</A>, paste it,
          confirm the pill turns green.
        </KV>
        <KV label="I get 401 / “token expired”">
          Your token was revoked or aged out. Generate a new one from your
          Emergent account, paste it back into Settings.
        </KV>
        <KV label="My token works on one page but not another">
          Almost always an env mismatch. A dev token won’t authenticate against
          prod. Check the env dropdown matches the token you have.
        </KV>
        <KV label="Is it safe to use my personal token?">
          For dev and ephemeral envs, yes. For production work, prefer the
          team service token if one exists — check the runbook.
        </KV>
      </KVList>

      <H2 id="env">Environments</H2>
      <KVList>
        <KV label="“Could not reach <env>” red banner">
          The env is either misspelled, not running, or its API is down. Click
          the “switch back to {'<previous>'}” link in the banner to return to a
          known-good environment.
        </KV>
        <KV label="My ephemeral env disappeared">
          Ephemeral envs are short-lived. Once an engineer tears one down, you
          can’t connect to it again. Get a fresh env name and reconnect.
        </KV>
        <KV label="Why does prod hide the env dropdown?">
          When the app is running in production scope, environment switching is
          disabled to prevent accidents. The sidebar shows a static{' '}
          <Code>prod</Code> label instead of a dropdown.
        </KV>
      </KVList>

      <H2 id="create">Create Template</H2>
      <KVList>
        <KV label="Job ID not found">
          Wrong environment in the sidebar. Switch and re-fetch.
        </KV>
        <KV label="Resume Job is spinning past 2 minutes">
          The pod is unhealthy. Take a screenshot with the job ID visible and
          ping engineering. Don’t keep clicking Retry — that won’t fix the
          underlying problem.
        </KV>
        <KV label="Deploy stuck on “Build”">
          The build phase is the longest (60–90s normally). If you’re past 3
          minutes, something is wrong with the image. Click Retry; if it fails
          again, escalate with the deploy run ID from the timeline panel.
        </KV>
        <KV label="“Latest deployment failed” but I want to skip">
          That’s fine. The failed deploy doesn’t block templating — you just
          won’t have a live URL to verify against. Click Skip and continue.
        </KV>
        <KV label="I accidentally dropped the wrong collection">
          Deletions are immediate. Recovery requires the platform’s point-in-time
          backup — talk to engineering ASAP with the job ID, env, and collection
          name. The sooner, the higher the chance.
        </KV>
        <KV label="“Template creation failed — check log output”">
          Read the log output panel below the error. Common causes: the build
          VM is unreachable (transient — retry once), the snapshot wasn’t
          found (Step 4’s pause silently failed — re-pause), or a scrub pass
          hit a permission error (escalate).
        </KV>
        <KV label="Template name was rejected">
          Names must be lowercase letters, numbers, and dashes only — no
          spaces, no underscores in customer-facing names, no uppercase.
          Examples that work: <Code>lead-gen-v0</Code>, <Code>crm-template</Code>.
          Examples that don’t: <Code>Lead_Gen_V0</Code>, <Code>crm template</Code>.
        </KV>
      </KVList>

      <H2 id="configs">Category configs</H2>
      <KVList>
        <KV label="My new config doesn’t show in All Configs">
          The list is cached per session. Click the refresh button at the top
          right of All Configs. If still missing, you might be on a different
          env than the one you submitted in — check the sidebar.
        </KV>
        <KV label="Fetch Env Variables returned nothing">
          The job’s pod doesn’t have a <Code>.env</Code> at either{' '}
          <Code>/app/backend/.env</Code> or <Code>/app/.env</Code>. Either the
          app stores config elsewhere, or the pod is paused — resume it and
          retry.
        </KV>
        <KV label="Generate Summary takes forever">
          The agent-service call has a 120-second timeout. Past that, the
          summary endpoint returns an error. Retry once; if it still times out,
          escalate.
        </KV>
        <KV label="Can I delete a config?">
          Not from this UI — by design. If you registered a config in error,
          ask engineering to clean it up via the platform API.
        </KV>
      </KVList>

      <H2 id="data-loss">I lost my work</H2>
      <P>
        The Create Template page autosaves your progress per-environment.
        Closing the tab, refreshing, or even rebooting your machine should not
        lose your step number, job ID, fetched collections, or deploy state.
      </P>
      <UL>
        <LI><strong className="text-[#e6edf3]">If state seems gone</strong>, you may have switched environments — state is scoped per env. Switch back and you’ll find it again.</LI>
        <LI><strong className="text-[#e6edf3]">If you cleared browser data</strong>, that’s the one thing that wipes everything. You’ll have to re-fetch.</LI>
      </UL>

      <H2 id="still-stuck">Still stuck</H2>
      <UL>
        <LI>Post in <code className="text-[#58a6ff] font-mono">#template-creator</code> on Slack with: the job ID, the env, the page you’re on, a screenshot.</LI>
        <LI>For urgent production issues, follow the on-call escalation in the runbook.</LI>
      </UL>
      <Note>
        Most issues that look like bugs turn out to be wrong-environment or
        token mismatches. Re-check those two things before escalating —
        engineering will ask you about them first anyway.
      </Note>
    </>
  );
}
