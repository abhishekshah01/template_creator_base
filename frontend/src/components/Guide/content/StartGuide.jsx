import { H1, H2, Lead, P, UL, LI, A, Code, Note, Screenshot } from '../primitives';

export const toc = [
  { id: 'what-this-tool-does',  level: 2, label: 'What this tool does' },
  { id: 'who-this-is-for',      level: 2, label: 'Who this is for' },
  { id: 'what-youll-learn',     level: 2, label: 'What you’ll learn' },
  { id: 'before-you-begin',     level: 2, label: 'Before you begin' },
  { id: 'how-to-use-this-guide',level: 2, label: 'How to use this guide' },
  { id: 'ongoing-resources',    level: 2, label: 'Ongoing resources' },
];

export default function StartGuide({ onNavigate }) {
  return (
    <>
      <H1>Start Guide</H1>
      <Lead>
        Welcome to template-automation-v0 — the tool the team uses to turn a running
        Emergent app into a reusable template. This guide walks you through every
        screen and the decisions you’ll make along the way.
      </Lead>

      <H2 id="what-this-tool-does">What this tool does</H2>
      <P>
        A <em>template</em> is a frozen, sanitized copy of a user’s app that other
        users can fork to start their own version. Creating one involves four
        things:
      </P>
      <UL>
        <LI>Picking the source job and confirming its environment is healthy.</LI>
        <LI>Optionally publishing a live preview of the app.</LI>
        <LI>Cleaning user-specific data out of the database.</LI>
        <LI>Pausing the job, snapshotting it, and scrubbing secrets out of the files.</LI>
      </UL>
      <P>
        After the template exists, you register a <em>category config</em> — a
        small record that maps the template name to the environment variables and
        a summary description it should ship with.
      </P>

      <H2 id="who-this-is-for">Who this is for</H2>
      <UL>
        <LI><strong className="text-[#e6edf3]">Non-technical operators.</strong> If your job is to take a customer’s app and publish it as a template, this guide is for you. You don’t need to know what restic, kubectl, or mongosh are — the app handles those pieces.</LI>
        <LI><strong className="text-[#e6edf3]">Engineers.</strong> If you’re comfortable with the underlying systems, skim straight to the workflow pages — they assume familiarity with jobs, pods, templates, and category configs.</LI>
      </UL>

      <H2 id="what-youll-learn">What you’ll learn</H2>
      <UL>
        <LI><A onClick={() => onNavigate?.('guide-create')}>Create a Template</A> — the four-step workflow with every screen explained.</LI>
        <LI><A onClick={() => onNavigate?.('guide-configs')}>Category Configs</A> — register a new config, update an existing one, and generate a summary.</LI>
        <LI><A onClick={() => onNavigate?.('guide-verify')}>Verify a Template</A> — confirm a template was created successfully by searching the All Configs page.</LI>
        <LI><A onClick={() => onNavigate?.('guide-faq')}>FAQ & Troubleshooting</A> — what to do when something doesn’t work.</LI>
      </UL>

      <H2 id="before-you-begin">Before you begin</H2>
      <P>You’ll need three things to get through any workflow in this app:</P>
      <UL>
        <LI><strong className="text-[#e6edf3]">An API token.</strong> Generated for your Emergent account. You’ll paste it in <A onClick={() => onNavigate?.('settings')}>Settings</A>. Tokens are environment-specific — a dev token won’t work in prod.</LI>
        <LI><strong className="text-[#e6edf3]">The right environment selected.</strong> Use the environment dropdown at the top of the sidebar. Most template work happens in <Code>dev</Code> or a named ephemeral environment such as <Code>eph-leadgen1</Code>.</LI>
        <LI><strong className="text-[#e6edf3]">The job ID of the app you’re templating.</strong> A long UUID like <Code>54ae01c4-d111-447a-baa4-c35854d2c5f1</Code>. The customer or engineering will hand this to you.</LI>
      </UL>
      <P>
        Next up, <A onClick={() => onNavigate?.('guide-token')}>Setup API Token</A> walks
        you through grabbing your token and pasting it into the app.
      </P>

      <H2 id="how-to-use-this-guide">How to use this guide</H2>
      <P>
        The guide is paginated. Read it in order if you’re new — each page builds
        on the last. If you only need a refresher on one workflow, jump straight
        to that page from the sidebar on the left.
      </P>
      <P>
        Every page has a table of contents on the right that you can use to skim
        long sections. Inline links like{' '}
        <A onClick={() => onNavigate?.('create-template')}>Create Template</A>{' '}
        take you to the actual screen in the app — feel free to click through
        and come back.
      </P>

      <Note>
        This guide is opinionated. It tells you what we recommend you do, not
        every option available in the UI. When there’s a choice worth knowing
        about — like skipping a deploy — we call it out.
      </Note>

      <Screenshot name="start-sidebar" caption="Annotated screenshot of the app's sidebar showing where Getting Started, Workflows, Category Config and Settings live." aspect="16/8" />

      <H2 id="ongoing-resources">Ongoing resources</H2>
      <UL>
        <LI><A href="#">Internal runbook</A> — incident response and on-call notes (link to be added).</LI>
        <LI><A href="#">#template-creator Slack channel</A> — ask questions and report bugs (link to be added).</LI>
        <LI><A href="#">Loom walkthroughs</A> — short videos covering the most common workflows (link to be added).</LI>
      </UL>
    </>
  );
}
