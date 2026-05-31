import { H1, H2, H3, Lead, P, UL, OL, LI, A, Code, Note, Screenshot, Steps, Step, Scenarios, Scenario, KVList, KV } from '../primitives';

export const toc = [
  { id: 'overview',          level: 2, label: 'Overview' },
  { id: 'before-you-start',  level: 2, label: 'Before you start' },
  { id: 'step-1',            level: 2, label: 'Step 1 — Identify Job' },
  { id: 'step-1-paused',     level: 3, label: 'If the job is paused' },
  { id: 'step-1-errors',     level: 3, label: 'Common errors' },
  { id: 'step-2',            level: 2, label: 'Step 2 — Publish Live Preview' },
  { id: 'step-2-when',       level: 3, label: 'When to deploy vs skip' },
  { id: 'step-2-states',     level: 3, label: 'What you see in each state' },
  { id: 'step-2-progress',   level: 3, label: 'During deployment' },
  { id: 'step-2-failed',     level: 3, label: 'If a deploy fails' },
  { id: 'step-3',            level: 2, label: 'Step 3 — Clear Database Collections' },
  { id: 'step-3-table',      level: 3, label: 'Reading the collections table' },
  { id: 'step-3-sus',        level: 3, label: 'Suspicious collections' },
  { id: 'step-3-inspect',    level: 3, label: 'Previewing before deleting' },
  { id: 'step-3-delete',     level: 3, label: 'Deleting collections' },
  { id: 'step-3-mongosh',    level: 3, label: 'The read-only Mongo console' },
  { id: 'step-4',            level: 2, label: 'Step 4 — Create Template' },
  { id: 'step-4-pause',      level: 3, label: 'What pausing actually does' },
  { id: 'step-4-create',     level: 3, label: 'What "create template" does' },
  { id: 'step-4-output',     level: 3, label: 'After it succeeds' },
  { id: 'next-steps',        level: 2, label: 'Next steps' },
];

export default function CreateTemplate({ onNavigate }) {
  return (
    <>
      <H1>Create a Template</H1>
      <Lead>
        The main workflow. Take a running Emergent job, clean it up, and
        produce a sanitized snapshot another user can fork. The whole thing is
        four steps inside the <A onClick={() => onNavigate?.('create-template')}>Create Template</A> page.
      </Lead>

      <H2 id="overview">Overview</H2>
      <P>
        The page shows a progress bar at the top with four numbered steps. You
        can click any step number to jump to it, but the steps are designed to
        be done in order. Your progress is auto-saved as you go — closing the
        tab and reopening it later resumes from the same step.
      </P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Step 1 — Identify Job.</strong> Paste a job ID and a template name. The app verifies the job exists, who owns it, and whether its pod is awake.</LI>
        <LI><strong className="text-[#e6edf3]">Step 2 — Publish Live Preview.</strong> Optional. Deploy the app to a public URL so you can sanity-check it before templating.</LI>
        <LI><strong className="text-[#e6edf3]">Step 3 — Clear Database Collections.</strong> Drop any user-specific data so the template ships clean.</LI>
        <LI><strong className="text-[#e6edf3]">Step 4 — Create Template.</strong> Pause the job to snapshot it, then run the sanitization script and produce a GCS path.</LI>
      </UL>
      <P>
        End to end, expect <strong className="text-[#e6edf3]">10–15 minutes</strong> if
        you’re skipping the deploy, or <strong className="text-[#e6edf3]">15–25 minutes</strong> if
        you’re deploying first.
      </P>
      <Screenshot name="create-overview" caption="Create Template page overview with the 4-step progress bar at top and Step 1 expanded below." />

      <H2 id="before-you-start">Before you start</H2>
      <UL>
        <LI>API token set, sidebar pill is green. See <A onClick={() => onNavigate?.('guide-token')}>Setup API Token</A>.</LI>
        <LI>Correct environment selected in the sidebar — the dev/prod/eph- one where the source job lives.</LI>
        <LI>Job ID copied to clipboard.</LI>
        <LI>Template name decided. Use lowercase letters, numbers, dashes only — for example <Code>real-estate-v0</Code>, <Code>lead-gen-v2</Code>. No spaces, no underscores in the customer-facing name, no uppercase.</LI>
      </UL>

      <H2 id="step-1">Step 1 — Identify Job</H2>
      <P>
        Two inputs and a button. Paste the job ID on the left, type your chosen
        template name on the right, click <strong className="text-[#e6edf3]">Fetch Job Info</strong>.
      </P>
      <Screenshot name="create-step1" caption="Step 1 card with Job ID and Template Name fields, Fetch Job Info button on the right." aspect="16/6" />
      <P>When fetch succeeds, two pill badges appear under the inputs:</P>
      <UL>
        <LI>A blue <Code>User</Code> pill with the customer’s user ID.</LI>
        <LI>A purple <Code>Env</Code> pill with the pod / environment ID.</LI>
      </UL>
      <P>
        These confirm the app reached the right job. If the user ID looks wrong
        (e.g. you expected a specific customer and it shows someone else’s ID),
        stop and double-check the job ID with whoever gave it to you.
      </P>

      <H3 id="step-1-paused">If the job is paused</H3>
      <P>
        Jobs that haven’t been touched in a while get paused to save resources.
        When that happens, Step 1 shows a yellow banner:
      </P>
      <KVList>
        <KV label="Banner says">
          <em>Job is paused — click Resume to wake the environment (~30–60s).</em>
        </KV>
        <KV label="What to do">
          Click <strong className="text-[#e6edf3]">Resume Job</strong>. The banner
          will turn purple and cycle through messages — "Starting your preview
          environment...", "Provisioning your pod...", "Almost ready..." — and
          tick a seconds counter so you can see it’s alive.
        </KV>
        <KV label="When it finishes">
          The banner turns green ("Environment is ready. Continuing...") and the
          workflow continues automatically. No further action needed.
        </KV>
      </KVList>
      <Note tone="warning">
        If the resume takes longer than 60 seconds the banner keeps spinning
        ("Taking longer than expected — hang tight..."). Most resumes finish by
        90s. If it’s still going past two minutes, the pod is unhealthy — note
        the job ID and ping engineering.
      </Note>

      <H3 id="step-1-errors">Common errors</H3>
      <KVList>
        <KV label="Job not found">
          You’re probably on the wrong environment. Check the env dropdown in
          the sidebar and switch, then re-fetch.
        </KV>
        <KV label="401 / token expired">
          Your token was revoked. Go to <A onClick={() => onNavigate?.('settings')}>Settings</A> and paste a fresh one.
        </KV>
        <KV label="Bad gateway / 502">
          The platform’s API didn’t respond. Try again in a few seconds. If it
          persists, the env is having trouble — switch back or escalate.
        </KV>
      </KVList>

      <H2 id="step-2">Step 2 — Publish Live Preview</H2>
      <P>
        This step deploys the app to a hosted URL — the same kind of URL the
        customer would see. It’s optional but recommended: it confirms the app
        actually runs before you spend time templating it.
      </P>

      <H3 id="step-2-when">When to deploy vs skip</H3>
      <Scenarios>
        <Scenario when="the app already has a live deployment"
          then={<>You’ll see a green banner saying so. <strong className="text-[#e6edf3]">Skip</strong> is the right choice — the URL already works. Only redeploy if you know code or config has changed since the last deploy. Redeploys are free.</>} />
        <Scenario when="the app has never been deployed"
          then={<>Step 2 shows a yellow notice that <strong className="text-[#F3CA5F]">50 credits</strong> will be deducted from the user’s account on success. Click <strong className="text-[#e6edf3]">Start Deployment</strong> to proceed, or <strong className="text-[#e6edf3]">Skip</strong> if you’re confident the template can be built without verifying.</>} />
        <Scenario when="the last deployment failed"
          then={<>You’ll see "Latest deployment failed" with a Retry link. The previous failed run is logged in the deployments timeline. Retry, or skip and proceed if you’re intentionally templating something that doesn’t need to deploy cleanly.</>} />
      </Scenarios>

      <H3 id="step-2-states">What you see in each state</H3>
      <Screenshot name="create-step2-has-live" caption="Step 2 in 'has live deployment' state — green banner, live URL with copy button, Skip button." />
      <Screenshot name="create-step2-never-deployed" caption="Step 2 in 'never deployed' state — yellow credit warning with the Start Deployment button." />
      <P>
        Whichever state you’re in, the right-hand panel mirrors the same info in
        a larger Deployments view: a screenshot preview of the live URL (if
        any), a Live status pill, a copy-URL button, and a timeline of past
        deployments with their status dots and "Nm ago" timestamps.
      </P>
      <Note>
        Save the live preview URL if you have one — you’ll want it later when
        registering the category config. There’s a small info note in the UI
        reminding you of the same thing.
      </Note>

      <H3 id="step-2-progress">During deployment</H3>
      <P>
        A new deploy goes through a fixed sequence of phases. The active phase
        is highlighted with a purple gradient and an elapsed-time counter; the
        completed ones get a green check.
      </P>
      <Steps>
        <Step n="1" title="Build">Compiles the app image. Usually 60–90 seconds.</Step>
        <Step n="2" title="MongoDB migrate">Applies any schema migrations. Often quick.</Step>
        <Step n="3" title="Manage secrets">Wires up env vars and credentials.</Step>
        <Step n="4" title="Deploy">Rolls out the new container. The longest phase, ~2–3 minutes.</Step>
        <Step n="5" title="Health check">Confirms the app is responding. ~30 seconds.</Step>
      </Steps>
      <P>
        Total wall-clock time is typically <strong className="text-[#e6edf3]">5–7
        minutes</strong>. The app shows "Your app will be live soon — usually
        5–7 minutes" while it runs. You can leave the page; progress is saved
        and the polling resumes when you come back.
      </P>

      <H3 id="step-2-failed">If a deploy fails</H3>
      <P>
        The phase that broke shows a red X and stays expanded with a short error
        line. Two buttons appear:
      </P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Retry Deploy</strong> — kicks off a new attempt. No additional credit charge if a previous attempt succeeded; the first-deploy 50-credit charge only happens once per job.</LI>
        <LI><strong className="text-[#e6edf3]">Skip</strong> — moves on to Step 3 without a live URL. Pick this if you intentionally don’t need a working deploy to template.</LI>
      </UL>
      <Note tone="caution">
        If deploys keep failing on the same phase, take a screenshot of the
        error and post it in the support channel along with the job ID. Don’t
        retry indefinitely — each Build phase has a real cost in compute time.
      </Note>

      <H2 id="step-3">Step 3 — Clear Database Collections</H2>
      <P>
        The template should contain the <em>shape</em> of the app — its tables
        and seed data — but not the customer’s personal records. This step
        shows you every collection in the job’s database so you can drop the
        ones that hold user-specific data.
      </P>
      <Screenshot name="create-step3-collections" caption="Step 3 collections table on the left, Inspector panel previewing a selected collection on the right." />

      <H3 id="step-3-table">Reading the collections table</H3>
      <P>Each row shows:</P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Checkbox</strong> — select to queue for deletion.</LI>
        <LI><strong className="text-[#e6edf3]">Name</strong> — the MongoDB collection name.</LI>
        <LI><strong className="text-[#e6edf3]">Document count</strong> — how many records it holds.</LI>
        <LI><strong className="text-[#e6edf3]">Caution badge</strong> — orange highlight if the name looks suspicious (next section).</LI>
      </UL>

      <H3 id="step-3-sus">Suspicious collections</H3>
      <P>
        Names that look like configuration or auth data get a soft orange
        highlight and a hover tooltip:{' '}
        <em>"{'<name>'} may contain configuration required for the app to run.
        Preview on the right before deleting."</em>
      </P>
      <P>The keyword list — case-insensitive substring match — is:</P>
      <UL>
        <LI><Code>setting</Code>, <Code>config</Code>, <Code>rule</Code>, <Code>permission</Code>, <Code>role</Code>, <Code>auth</Code></LI>
        <LI><Code>feature</Code>, <Code>flag</Code>, <Code>schema</Code>, <Code>migration</Code></LI>
        <LI><Code>secret</Code>, <Code>credential</Code>, <Code>env</Code>, <Code>key</Code>, <Code>token</Code></LI>
        <LI><Code>webhook</Code>, <Code>integration</Code>, <Code>preference</Code>, <Code>meta</Code>, <Code>field</Code></LI>
        <LI><Code>policy</Code>, <Code>policies</Code></LI>
      </UL>
      <Note tone="caution">
        The highlight is a hint, not a verdict. Some apps genuinely store seed
        data in a <Code>roles</Code> collection that you <em>want</em> in the
        template; others put auth tokens in a collection called <Code>sessions</Code>{' '}
        that doesn’t match the keyword list at all. Always preview before
        deleting.
      </Note>
      <P>
        Our overall philosophy: bias toward deleting. A template that ships with
        too little data is recoverable — you can seed it. A template that ships
        with someone else’s tokens is a leak.
      </P>

      <H3 id="step-3-inspect">Previewing before deleting</H3>
      <P>
        Click any row to load that collection into the Inspector panel on the
        right. The panel shows the first 20 documents as pretty-printed JSON
        with the total document count at the top.
      </P>
      <P>What to look for:</P>
      <UL>
        <LI><strong className="text-[#e6edf3]">User-specific data</strong> (emails, names, addresses, IDs that look like the customer’s own user IDs) — delete.</LI>
        <LI><strong className="text-[#e6edf3]">Secrets, tokens, API keys</strong> — delete, no exceptions.</LI>
        <LI><strong className="text-[#e6edf3]">Seed / reference data</strong> that the app needs to function at boot (country lists, role definitions, etc.) — keep.</LI>
        <LI><strong className="text-[#e6edf3]">Empty collections</strong> — fine to leave.</LI>
      </UL>

      <H3 id="step-3-delete">Deleting collections</H3>
      <OL>
        <LI>Check the box next to every collection you want to drop.</LI>
        <LI>The bottom of the table shows a running count: <em>"3 collections selected"</em>.</LI>
        <LI>Click <strong className="text-[#e6edf3]">Delete Selected</strong>. A confirmation dialog summarizes what’s about to happen.</LI>
        <LI>Confirm. The dropped rows update with a small status indicator next to each name.</LI>
      </OL>
      <Note tone="warning">
        Deletions are immediate and irreversible from this tool. If you delete
        the wrong collection, your only recovery path is restoring from the
        platform’s automatic backup — talk to engineering.
      </Note>

      <H3 id="step-3-mongosh">The read-only Mongo console</H3>
      <P>
        At the bottom of Step 3 there’s a small console for power users. You
        can type any read-only mongosh command and see the JSON result —
        useful for spot-checking documents that aren’t the first 20 in a
        collection.
      </P>
      <P>
        Destructive commands (<Code>drop</Code>, <Code>delete</Code>, <Code>remove</Code>,{' '}
        <Code>insert</Code>, <Code>update</Code>, <Code>createIndex</Code>, <Code>dropIndex</Code>)
        are blocked at the API layer — you’ll get a 400 if you try.
      </P>
      <Screenshot name="create-step3-mongosh" caption="Mongo console at the bottom of Step 3 showing a query and its JSON output." aspect="16/8" />

      <H2 id="step-4">Step 4 — Create Template</H2>
      <P>
        The final step. One button — <strong className="text-[#e6edf3]">Pause &
        Create Template</strong> — runs two operations back-to-back. Both have
        their own status rows that fill in as they complete.
      </P>

      <H3 id="step-4-pause">What pausing actually does</H3>
      <P>
        Pausing tells the platform to stop the pod and capture its disk and
        database into a versioned snapshot in cloud storage. In plain language:
        <em> "save a frozen copy of the app’s files and database somewhere safe."</em>
      </P>
      <P>
        The pause/snapshot itself takes about <strong className="text-[#e6edf3]">30–60
        seconds</strong>. While it’s happening, the Step 4 status row reads
        "Pausing job and triggering restic backup..."
      </P>
      <Note tone="warning">
        Pausing is destructive in one sense: the pod goes to sleep, so the live
        URL from Step 2 stops working until the job is resumed. That’s fine —
        templates ship without live deployments anyway. But don’t pause if
        you’re still iterating on the source job.
      </Note>

      <H3 id="step-4-create">What "create template" does</H3>
      <P>
        Once the snapshot exists, the tool spawns a sanitization job on a build
        VM. The job:
      </P>
      <OL>
        <LI><strong className="text-[#e6edf3]">Restores</strong> the snapshot you just made onto a clean disk.</LI>
        <LI><strong className="text-[#e6edf3]">Scrubs the <Code>.env</Code> files</strong> — replaces every value with the placeholder <Code>__PLACEHOLDER__</Code>, but keeps the keys, so users know what env vars to set later.</LI>
        <LI><strong className="text-[#e6edf3]">Removes credential directories</strong> — <Code>~/.ssh</Code>, <Code>~/.aws</Code>, <Code>~/.config/gcloud</Code>, <Code>~/.npmrc</Code>, <Code>~/.pypirc</Code>.</LI>
        <LI><strong className="text-[#e6edf3]">Wipes the git history</strong> and re-initializes it with a single "template: {'<name>'}" commit.</LI>
        <LI><strong className="text-[#e6edf3]">Deletes caches</strong> — <Code>__pycache__</Code>, <Code>.pytest_cache</Code>, <Code>.next</Code>, build artifacts, log files.</LI>
        <LI><strong className="text-[#e6edf3]">Scans source files</strong> for AWS-style keys (the <Code>AKIA…</Code> pattern) and replaces matches with <Code>__SCRUBBED_AWS_KEY__</Code>.</LI>
        <LI><strong className="text-[#e6edf3]">Backs up the result</strong> to the template bucket in cloud storage, tagged with the template name and the source job ID.</LI>
      </OL>
      <P>
        Wall-clock time is typically <strong className="text-[#e6edf3]">2–5
        minutes</strong>. The hard cap is 5 minutes — if it runs longer it
        times out.
      </P>

      <H3 id="step-4-output">After it succeeds</H3>
      <P>The Step 4 panel shows:</P>
      <UL>
        <LI>A green check on the "Pausing job..." and "Creating template..." status rows.</LI>
        <LI>A <strong className="text-[#e6edf3]">GCS path</strong> like <Code>gs:emergent-dev-template-restic:/templates/lead-gen-v0</Code>. That’s where the snapshot lives.</LI>
        <LI>Truncated log output from the sanitization run — handy when you want to confirm what was scrubbed.</LI>
      </UL>
      <Screenshot name="create-step4-success" caption="Step 4 complete: both substeps green, GCS path displayed, log output below." />
      <Note tone="caution">
        If Step 4 fails or times out, <strong className="text-[#e6edf3]">don’t blindly
        retry</strong>. Read the log output first — it usually contains the
        actual failure (VM unreachable, snapshot not found, etc.). Common
        recovery is: resume the job, fix whatever was off, and re-run from the
        appropriate step.
      </Note>

      <H2 id="next-steps">Next steps</H2>
      <P>
        A successful Step 4 means the template’s files exist in cloud storage —
        but the platform doesn’t know about it yet. To make the template
        forkable by users, you need to register a category config.
      </P>
      <P>
        Continue to <A onClick={() => onNavigate?.('guide-configs')}>Category Configs</A>{' '}
        to do that next.
      </P>
    </>
  );
}
