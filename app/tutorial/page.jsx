'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { Panel } from '@/components/ui';

const tutorialSections = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Dashboard and daily routine',
    icon: '🏠',
    href: '/',
    intro: 'Use the dashboard as your starting point: it gathers your daily checklist and recent workspace records.',
    steps: [
      { title: 'Make a short checklist', body: 'The Today card shows tasks scheduled for today. Unfinished tasks move into Pending after their due date; use Move to today to bring one back onto today’s list. Daily Tasks also lets you set priority, move today’s tasks to tomorrow, remove tasks, and browse history.' },
      { title: 'Use Quick actions to capture work', body: 'Choose New idea, Video note, Add chart, or New strategy. Complete the form and save; the new record will appear in its section and dashboard preview.' },
      { title: 'Open the full section', body: 'Use a View all link or the left navigation to move from a preview to the full list. The sidebar search filters navigation labels as you type.' },
    ],
  },
  {
    id: 'demo-data',
    label: 'Sample Data',
    title: 'Explore the workspace with sample data',
    icon: '🧪',
    href: '/',
    intro: 'The demo seed adds example records to your account so the dashboard and workspace sections are populated for evaluation.',
    steps: [
      { title: 'Find examples', body: 'Seeded records are labeled DEMO in their titles or names. They cover tasks and task history, ideas and questions, archived ideas, strategies, video notes, charts, concepts, Drive folders, focus settings, and a sample Trading Plan calendar.' },
      { title: 'Treat examples as illustrative', body: 'The chart and calendar artwork is fictional demonstration content—not live market or economic data. Video notes and Drive folder links are placeholders; replace them with your own material.' },
      { title: 'Keep or remove examples', body: 'Edit or delete demo cards using the controls in their section. The seed is additive and safe to rerun: it adds missing examples and preserves existing user records.' },
      { title: 'Check every area', body: 'Start on the dashboard, then visit Daily Tasks, Trading Plan, Idea Inbox, Questions, Archive, Strategy Lab, Video Notes, Charts, and Knowledge Base. Use Admin Settings only for account access and signup controls.' },
    ],
    note: 'The seed script targets an existing account selected by SEED_USER_EMAIL or ADMIN_EMAILS. It does not create a user, change account credentials, or delete existing workspace data.',
  },
  {
    id: 'knowledge',
    label: 'Knowledge Base',
    title: 'Knowledge Base',
    icon: '📚',
    href: '/concepts',
    intro: 'Keep reusable trading definitions, rules, and study notes in one browsable library.',
    steps: [
      { title: 'Create a concept', body: 'Select + New concept. Add a name, optional icon, one-line summary, and detailed notes, then save.' },
      { title: 'Read a concept', body: 'Select any concept card to open its detail dialog. Long notes retain their line breaks.' },
      { title: 'Update or remove an entry', body: 'Use Edit concept to change its fields and Save changes. Delete concept removes the entry after confirmation.' },
      { title: 'Keep favorite concepts at the top', body: 'Select the star on a concept card or choose Add favorite in its details. It moves into the Favorites section at the top of Knowledge Base. Select the star again to remove it.' },
      { title: 'Pin useful concepts in navigation', body: 'When creating or editing a concept, enable Show in Knowledge Base navigation. It then appears under the collapsible Knowledge Base item in the sidebar.' },
    ],
    note: 'The sidebar list updates after concept changes. Selecting a sidebar concept jumps to its card in the library.',
  },
  {
    id: 'trading-plan',
    label: 'Trading Plan',
    title: 'Trading Plan and weekly preparation',
    icon: '🗓',
    href: '/trading-plan',
    intro: 'Keep the current week’s economic calendar screenshot beside your preparation workflow.',
    steps: [
      { title: 'Add this week’s calendar', body: 'Open Trading Plan and paste a publicly viewable Google Drive image link or direct image URL, then select Save link. The image is stored for your account.' },
      { title: 'Replace or remove it', body: 'Save a new URL to replace the current screenshot. Select Remove when you want to clear it and return to the empty state.' },
      { title: 'Plan from the calendar', body: 'Use the events shown in your actual calendar to note relevant preparation in Daily Tasks and your strategy notes. The bundled DEMO calendar is an illustration only, not a real economic schedule.' },
    ],
    note: 'Ensure the image is accessible to the intended viewer. Demo content should be replaced before relying on the workspace for live preparation.',
  },
  {
    id: 'videos',
    label: 'Video Notes',
    title: 'Video Notes',
    icon: '🎬',
    href: '/videos',
    intro: 'Save learning resources with a playable Drive link and your own notes.',
    steps: [
      { title: 'Add a video', body: 'Select + Add a video. Enter a title (required), then optionally add creator, topic, watched date, and notes. Paste the Google Drive video link and save.' },
      { title: 'Play or open the source', body: 'Videos with a valid Drive link appear in the embedded player. Use the external-link icon to open the file in Drive.' },
      { title: 'Favorite a video', body: 'Select the star on a video card to add it to Favorites at the top of Video Notes. Select the star again to remove it.' },
      { title: 'Edit your study notes', body: 'Select the pencil icon on a video card, update its details, and choose Save changes.' },
      { title: 'Delete an entry', body: 'Select Delete and confirm in the dialog. Deletion removes the saved video note.' },
    ],
    note: 'For embedded playback, the Drive file must be shared so the signed-in viewer can access it; “Anyone with the link” viewer access is the simplest setup.',
  },
  {
    id: 'strategies',
    label: 'Strategy Lab',
    title: 'Strategy Lab',
    icon: '🧪',
    href: '/strategies',
    intro: 'Write down a setup as a repeatable hypothesis and track where it is in your research process.',
    steps: [
      { title: 'Create a strategy', body: 'Select + New strategy. Give it a name (required); add a number/code, description, rules, and an optional Drive reference.' },
      { title: 'Set status and sidebar visibility', body: 'Choose Draft, Research, Backtesting, Testing, Active, or Validated. Enable Show in Strategy Lab navigation if you want a direct sidebar link to this strategy.' },
      { title: 'Keep favorite strategies at the top', body: 'Select the star on a strategy card to add it to the Favorites section at the top of Strategy Lab. Select the star again to remove it.' },
      { title: 'Make the rules testable', body: 'Use the Rules field to spell out entry conditions, stop placement, target, and invalidation. Use the description for the setup idea and context.' },
      { title: 'Edit, review, or remove a card', body: 'Choose Edit on a strategy card to update its fields or toggle sidebar visibility. Strategy cards show the description, rules, and status; the Drive link opens in a new tab. Use Delete if a strategy should be removed.' },
    ],
    note: 'Only strategies with Show in Strategy Lab navigation enabled appear as nested links beneath Strategy Lab in the sidebar.',
  },
  {
    id: 'charts',
    label: 'Charts',
    title: 'Charts and analysis',
    icon: '🖼',
    href: '/charts',
    intro: 'Build a visual library of chart examples, annotated with instrument, date, and context.',
    steps: [
      { title: 'Prepare your image link', body: 'Upload or select the image in Google Drive and give viewers access. Copy its sharing link.' },
      { title: 'Add a chart', body: 'Select + Add a chart. Enter a title and image link (both required), then optionally choose an instrument, date, and note.' },
      { title: 'Review the chart', body: 'Charts appear as image cards. Select an image to open its source in Drive; the card also shows its instrument, date, and note.' },
      { title: 'Remove an outdated chart', body: 'Select Delete under the chart and confirm. Charts currently have no edit control, so ensure the details are right when adding one.' },
    ],
    note: 'If an image does not render, check its Drive sharing permissions and open the source link directly.',
  },
  {
    id: 'ideas',
    label: 'Idea Inbox',
    title: 'Idea Inbox',
    icon: '💡',
    href: '/ideas',
    intro: 'Capture observations quickly, then revisit them using a small status workflow.',
    steps: [
      { title: 'Capture an idea', body: 'Select + New idea. Give it a title, choose a type, set an initial status, and optionally write the next step in the note field.' },
      { title: 'Filter the inbox', body: 'Use the status menu at the top to show All, Open, Testing, Done, or Dropped ideas.' },
      { title: 'Move an idea forward', body: 'Change the status menu on an idea row. The change is saved and the list refreshes.' },
      { title: 'Archive or delete', body: 'Choose Dropped to move an idea into Archive. Delete removes it permanently after confirmation.' },
    ],
    note: 'Use the Next step field to make an idea actionable, such as “review 20 examples” or “compare NY and London sessions.”',
  },
  {
    id: 'questions',
    label: 'Questions',
    title: 'Questions and doubts',
    icon: '❓',
    href: '/questions',
    intro: 'Keep unresolved questions separate from general ideas while using the same status workflow.',
    steps: [
      { title: 'Write a specific question', body: 'Select + New question. The type is set to Question automatically. Add the question as the title and use Next step for how you will investigate it.' },
      { title: 'Track its status', body: 'Set the status to Open while unresolved, Testing while gathering evidence, Done when answered, or Dropped if it is no longer useful.' },
      { title: 'Filter and revisit', body: 'Use the status menu to focus on a subset of questions. Update an individual row’s status as your research progresses.' },
      { title: 'Remove a question', body: 'Select Delete and confirm if the question should be removed rather than retained as a record.' },
    ],
    note: 'Questions marked Dropped also appear in Archive. Done questions remain in the Questions list under the Done filter.',
  },
  {
    id: 'archive',
    label: 'Archive',
    title: 'Archive',
    icon: '🗄',
    href: '/archive',
    intro: 'Archive is a read-only view of ideas and questions you marked as Dropped.',
    steps: [
      { title: 'Send a record to Archive', body: 'Open Idea Inbox or Questions and change the record’s status to Dropped.' },
      { title: 'Review archived items', body: 'Open Archive to see dropped titles and dates. This view is intentionally a simple reference list.' },
      { title: 'Restore an item', body: 'Archive itself has no restore action. Return to Idea Inbox or Questions, show the Dropped filter, and change that record’s status to Open, Testing, or Done.' },
    ],
  },
  {
    id: 'workflow',
    label: 'Daily workflow & Drive',
    title: 'Daily workflow, navigation, and Drive',
    icon: '🧭',
    href: '/',
    intro: 'A repeatable routine keeps the workspace useful without turning it into another task to manage.',
    steps: [
      { title: 'Plan the session', body: 'Check the dashboard focus and Today list. Add only the preparation tasks you intend to complete.' },
      { title: 'Capture while reviewing', body: 'Save a chart for a visual example, an idea for a hypothesis, a question for something to investigate, or a video note for material to revisit.' },
      { title: 'Review and classify', body: 'Use Strategy Lab to keep rules explicit. Move ideas and questions between Open, Testing, Done, and Dropped as evidence changes.' },
      { title: 'Navigate quickly', body: 'The sidebar search filters section and concept names. Knowledge Base and Strategy Lab links stay visible; entries you opted into appear beneath their section.' },
      { title: 'Use Drive links safely', body: 'Paste a Drive file link into the relevant form. For image/video previews, the file must be accessible to the viewer. Drive folders on the dashboard are currently managed in the database, not through an in-app form.' },
    ],
    note: 'Saved records live in the configured database. Avoid putting private Drive links into a shared workspace unless the intended viewers have access.',
  },
  {
    id: 'account-admin',
    label: 'Account & Admin',
    title: 'Sign-in, account security, and admin settings',
    icon: '🔐',
    href: '/admin',
    intro: 'Xrynex Trading OS uses its own database-backed session. Admin access is a persisted role on your user account, separate from signup availability.',
    steps: [
      { title: 'Sign in and sign out', body: 'Use your Xrynex Trading OS account or the configured trusted single sign-on handoff. The Log out button revokes the current Xrynex Trading OS session; signing in again reads your account role from the database.' },
      { title: 'Manage public signup', body: 'Administrators open Admin Settings from the sidebar and use the Public signup switch. The preference is saved in the database and enforced by both the signup page and signup API. Signup is disabled by default.' },
      { title: 'Understand administrator access', body: 'The user record stores the is_admin role. ADMIN_EMAILS is a server-side bootstrap allowlist used to grant the role at account signup, password login, or verified SSO provisioning; ordinary admin authorization reads the database role.' },
      { title: 'Connect an existing identity provider', body: 'SSO uses a server-to-server signed HS256 assertion with a verified email, stable subject, exact issuer and trading-os audience, short expiry, and unique jti. Xrynex Trading OS exchanges it for a single-use code and creates its own session; never pass passwords or long-lived tokens through a browser URL.' },
    ],
    note: 'In production, public signup is blocked unless email verification is configured. An unverified password account is not automatically linked to SSO; verify ownership through a trusted process first. Never expose or commit SSO secrets.',
  },
];

export default function TutorialPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const idPrefix = useId();
  const activeSection = tutorialSections[activeIndex];

  function selectTab(index, focusTab = false) {
    const nextIndex = (index + tutorialSections.length) % tutorialSections.length;
    setActiveIndex(nextIndex);
    if (focusTab) document.getElementById(`${idPrefix}-tab-${nextIndex}`)?.focus();
  }

  function handleTabKeyDown(event, index) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectTab(index + 1, true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectTab(index - 1, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectTab(0, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectTab(tutorialSections.length - 1, true);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title="Xrynex Trading OS tutorial" icon="🧭">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-white">How to use your workspace</h1>
          <p className="mt-2 text-[13px] leading-6 text-muted">
            Choose a tab for step-by-step instructions. The tabs cover each section, common workflows,
            Google Drive links, account security, admin settings, and the actions currently available in the app.
          </p>
        </div>
      </Panel>

      <div role="tablist" aria-label="Tutorial sections" className="flex gap-2 overflow-x-auto rounded-xl border border-line bg-panel p-2">
        {tutorialSections.map((section, index) => (
          <button
            key={section.id}
            id={`${idPrefix}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={activeIndex === index ? 0 : -1}
            onClick={() => selectTab(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`shrink-0 rounded-lg px-3 py-2 text-[13px] transition-colors ${activeIndex === index ? 'bg-[#17324a] text-white' : 'text-muted hover:bg-panel2 hover:text-text'}`}
          >
            <span aria-hidden className="mr-2">{section.icon}</span>{section.label}
          </button>
        ))}
      </div>

      <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${activeIndex}`} tabIndex={0}>
        <Panel
          title={activeSection.title}
          icon={activeSection.icon}
          action={<Link href={activeSection.href} className="btn btn-primary">Open section</Link>}
        >
          <p className="mb-5 max-w-3xl text-[13px] leading-6 text-muted">{activeSection.intro}</p>
          <ol className="space-y-3">
            {activeSection.steps.map((step, index) => (
              <li key={step.title} className="flex gap-3 rounded-lg border border-line bg-panel2/40 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-win/10 font-mono text-[12px] text-win">{index + 1}</span>
                <div>
                  <h2 className="text-[14px] font-semibold text-text">{step.title}</h2>
                  <p className="mt-1 text-[13px] leading-6 text-text/75">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {activeSection.note && (
            <p className="mt-4 rounded-lg border border-gold/20 bg-gold/5 px-4 py-3 text-[12px] leading-5 text-muted">
              <strong className="font-semibold text-gold">Tip: </strong>{activeSection.note}
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}