import { H1, H2, H3, Lead, P, UL, OL, LI, A, Code, Note, Screenshot, KVList, KV } from '../primitives';

export const toc = [
  { id: 'get-token',         level: 2, label: 'Get an API token' },
  { id: 'token-step-1',      level: 3, label: 'Sign in to emergent.sh' },
  { id: 'token-step-2',      level: 3, label: 'Open the browser inspector' },
  { id: 'token-step-3',      level: 3, label: 'Open the Network tab' },
  { id: 'token-step-4',      level: 3, label: 'Filter and reload the page' },
  { id: 'token-step-5',      level: 3, label: 'Find the Authorization header' },
  { id: 'token-step-6',      level: 3, label: 'Copy the token' },
  { id: 'paste-token',       level: 2, label: 'Paste it into Settings' },
];

export default function SetupApiToken({ onNavigate }) {
  return (
    <>
      <H1>Setup API Token</H1>
      <Lead>
        Before you can use the app, add your Emergent API token in Settings.
        This allows the app to securely access your account and create
        templates on your behalf.
      </Lead>

      <H2 id="get-token">Get an API token</H2>
      <P>
        Your API token is the standard bearer token used when you are logged
        into <A href="https://emergent.sh">emergent.sh</A>. You can copy it
        directly from your browser’s built-in inspector while signed in.
      </P>
      <Note tone="warning" title="Treat the token like a password">
        Anyone with this token can act on your behalf on the platform — make
        API calls, spend credits, read data. Only paste it into this app’s
        Settings. If you suspect a token has leaked, sign out and back in to
        rotate it.
      </Note>

      <H3 id="token-step-1">Sign in to emergent.sh</H3>
      <P>
        Open <A href="https://emergent.sh">emergent.sh</A> in a new browser tab
        and sign in with the account you use for template work. Stay on the
        signed-in page — any page works, but the homepage after login is
        easiest.
      </P>
      <Screenshot name="setup-token-1-signed-in" caption="emergent.sh after a successful sign-in, with your account avatar visible in the top-right." aspect="16/9" />

      <H3 id="token-step-2">Open the browser inspector</H3>
      <P>
        The inspector (also called <em>DevTools</em>) is a panel built into
        every browser. To open it:
      </P>
      <KVList>
        <KV label="On Mac">
          Press <Code>Cmd</Code> + <Code>Option</Code> + <Code>I</Code>.
          Alternatively, right-click anywhere on the page and choose{' '}
          <strong className="text-[#e6edf3]">Inspect</strong>.
        </KV>
        <KV label="On Windows / Linux">
          Press <Code>F12</Code>, or <Code>Ctrl</Code> + <Code>Shift</Code> + <Code>I</Code>.
          Alternatively, right-click anywhere on the page and choose{' '}
          <strong className="text-[#e6edf3]">Inspect</strong>.
        </KV>
      </KVList>
      <P>
        A panel will appear at the bottom or right of the window with several
        tabs along the top — Elements, Console, Sources, Network, and so on.
      </P>
      <Screenshot name="setup-token-2-inspector-open" caption="emergent.sh with the browser inspector panel open at the bottom of the window, showing the row of tabs (Elements, Console, Sources, Network...)." />

      <H3 id="token-step-3">Open the Network tab</H3>
      <P>
        Click the <strong className="text-[#e6edf3]">Network</strong> tab in the
        inspector. It’s where the browser logs every request the page is making
        to the server in real time — that’s where the token will appear.
      </P>
      <P>
        If the panel is empty, that’s normal: Network only records requests
        that happen <em>after</em> you open it. We’ll trigger some in the next
        step.
      </P>
      <Screenshot name="setup-token-3-network-empty" caption="The inspector with the Network tab highlighted, showing an empty request list and the filter bar at the top." aspect="16/8" />

      <H3 id="token-step-4">Filter and reload the page</H3>
      <P>
        At the top of the Network tab there’s a small text input — the filter
        bar (often labeled <em>Filter</em> or shown with a magnifying-glass
        icon). Type:
      </P>
      <Note tone="info">
        <Code>details</Code>
      </Note>
      <P>
        This narrows the list to just the requests we care about. With the
        filter still in place, <strong className="text-[#e6edf3]">reload the
        page</strong>:
      </P>
      <UL>
        <LI><strong className="text-[#e6edf3]">Mac:</strong> <Code>Cmd</Code> + <Code>R</Code></LI>
        <LI><strong className="text-[#e6edf3]">Windows / Linux:</strong> <Code>Ctrl</Code> + <Code>R</Code> (or just hit <Code>F5</Code>)</LI>
      </UL>
      <P>
        The Network panel will start filling up. After a second or two you
        should see one or more requests with "details" in their URL.
      </P>
      <Screenshot name="setup-token-4-network-filtered" caption="Network tab after reload — the filter is set to 'details' and one or two matching requests are visible in the list." aspect="16/8" />

      <H3 id="token-step-5">Find the Authorization header</H3>
      <P>
        Click any one of the matching requests in the list. A second panel
        opens with several tabs of its own — Headers, Preview, Response,
        Initiator, Timing.
      </P>
      <P>
        Make sure you’re on the <strong className="text-[#e6edf3]">Headers</strong>{' '}
        tab (it’s the default). Scroll down past <em>General</em> and{' '}
        <em>Response Headers</em> until you reach <em>Request Headers</em>.
        Inside that section look for a line that starts with:
      </P>
      <Note tone="info" title="What you’re looking for">
        <Code>authorization:</Code> <Code>Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</Code>
      </Note>
      <P>
        The actual token is the long jumble of letters, numbers, dots, and
        dashes that comes after the word <Code>Bearer</Code>. It’s usually
        somewhere between 200 and 1,500 characters long.
      </P>
      <Screenshot name="setup-token-5-auth-header" caption="Request Headers panel scrolled down to show the 'authorization: Bearer ...' line. The full Bearer token after the word 'Bearer' is what we need." aspect="16/7" />

      <H3 id="token-step-6">Copy the token</H3>
      <OL>
        <LI>Select <strong className="text-[#e6edf3]">only the part after the word "Bearer "</strong> — don’t include the word "Bearer" itself or the space that follows it.</LI>
        <LI>Copy it (<Code>Cmd</Code> + <Code>C</Code> on Mac, <Code>Ctrl</Code> + <Code>C</Code> on Windows).</LI>
      </OL>
      <Note tone="critical" title="Don’t include 'Bearer '">
        If you copy the word <Code>Bearer</Code> along with the token, the app
        will treat it as part of the token and reject every request as
        unauthorized. Select carefully, starting at the first character{' '}
        <em>after</em> the space.
      </Note>
      <Note tone="info" title="Environment-specific">
        Tokens are environment-specific. A token from <Code>dev</Code> only works
        on dev; same for any ephemeral environment. If you’re about to operate
        against <Code>prod</Code>, repeat these steps while signed in to the
        production emergent.sh — and double-check the environment dropdown in
        the sidebar matches before you take any action.
      </Note>

      <H2 id="paste-token">Paste it into Settings</H2>
      <OL>
        <LI>Click <A onClick={() => onNavigate?.('settings')}>Settings</A> in the sidebar, or click the <strong className="text-[#e6edf3]">API Token</strong> button at the bottom of the sidebar.</LI>
        <LI>Paste your token into the input field.</LI>
        <LI>The pill next to the field flips from <strong className="text-[#f85149]">Not set</strong> to <strong className="text-[#3fb950]">Set</strong>. That same indicator stays visible in the sidebar from now on.</LI>
      </OL>
      <Screenshot name="setup-paste-settings" caption="Settings page with the API Token input filled in, showing the 'Set' status pill in the bottom of the sidebar." />
      <Note tone="warning">
        Tokens are stored in your browser only. If you’re on a shared computer,
        clear the token before walking away — re-open Settings and delete the
        value.
      </Note>

      <P>
        With your token saved, you’re ready for the main workflow. Continue to{' '}
        <A onClick={() => onNavigate?.('guide-create')}>Create a Template</A>.
      </P>
    </>
  );
}
