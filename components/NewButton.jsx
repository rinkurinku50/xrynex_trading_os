'use client';

import { useState } from 'react';
import { Modal, RecordForm } from './Form';
import { conceptIconOptions } from './ConceptIcon';

export const fieldSets = {
  idea: () => [
    { name: 'title', label: 'Idea', type: 'text', required: true, placeholder: 'NY sweep into 1m FVG' },
    { name: 'tag', label: 'Type', type: 'select', options: ['Idea', 'Research', 'Question'], default: 'Idea' },
    { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Testing', 'Done', 'Dropped'], default: 'Open' },
    { name: 'note', label: 'Next step', type: 'textarea', placeholder: 'Backtest 50 samples' }
  ],

  strategy: () => [
    { name: 'code', label: 'Number', type: 'text', placeholder: '07' },
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'London Sweep' },
    { name: 'status', label: 'Status', type: 'select',
      options: ['Draft', 'Research', 'Backtesting', 'Testing', 'Active', 'Validated'], default: 'Draft' },
    { name: 'description', label: 'What it is', type: 'textarea' },
    { name: 'rules', label: 'Rules', type: 'textarea', placeholder: 'Entry, stop, target, invalidation' },
    { name: 'drive_url', label: 'Drive link', type: 'text', placeholder: 'https://drive.google.com/…' },
    { name: 'show_in_nav', label: 'Show in Strategy Lab navigation', type: 'checkbox' }
  ],

  video: () => [
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'creator', label: 'Creator', type: 'text', placeholder: 'ICT' },
    { name: 'topic', label: 'Topic', type: 'text', placeholder: 'FVG' },
    { name: 'watched_on', label: 'Watched on', type: 'date' },
    { name: 'drive_url', label: 'Video link', type: 'text',
      placeholder: 'https://drive.google.com/file/d/…/view',
      help: 'Google Drive video link — it plays inline.' },
    { name: 'notes', label: 'Notes', type: 'textarea' }
  ],

  chart: () => [
    { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'NQ — NY session' },
    { name: 'drive_url', label: 'Image link', type: 'text', required: true,
      placeholder: 'https://drive.google.com/file/d/…/view',
      help: 'Google Drive image link, shared as “Anyone with the link”.' },
    { name: 'instrument', label: 'Instrument', type: 'select', options: ['NQ', 'MNQ', 'ES', 'MES'] },
    { name: 'chart_date', label: 'Date', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea' }
  ],

  task: () => [{ name: 'title', label: 'Task', type: 'text', required: true }],

  concept: () => [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'icon', label: 'Navigation icon', type: 'select', options: conceptIconOptions, default: 'book', iconPreview: true },
    { name: 'subtitle', label: 'One-line summary', type: 'text' },
    { name: 'body', label: 'Notes', type: 'textarea' },
    { name: 'show_in_nav', label: 'Show in Knowledge Base navigation', type: 'checkbox' }
  ]
};

const endpoints = {
  idea: '/api/ideas',
  strategy: '/api/strategies',
  video: '/api/videos',
  chart: '/api/charts',
  task: '/api/tasks',
  concept: '/api/concepts'
};

const titles = {
  idea: 'Capture an idea',
  strategy: 'New strategy',
  video: 'Add a video note',
  chart: 'Add a chart',
  task: 'Add a task',
  concept: 'New concept'
};

/** Button that opens the right form for `kind`. */
export default function NewButton({ kind, label, className = 'btn', context = [] }) {
  const [open, setOpen] = useState(false);
  const fields = fieldSets[kind](context);

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {label ?? `+ ${titles[kind]}`}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={titles[kind]}>
        <RecordForm
          endpoint={endpoints[kind]}
          fields={fields}
          submitLabel={titles[kind]}
          onDone={() => setOpen(false)}
        />
      </Modal>
    </>
  );
}
