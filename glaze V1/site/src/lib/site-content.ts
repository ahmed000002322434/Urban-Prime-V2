export type ArticleSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
  callout?: string
}

export type Article = {
  slug: string
  kicker: string
  title: string
  excerpt: string
  readTime: string
  heroBlurb: string
  sections: ArticleSection[]
}

export const installSteps = [
  {
    title: 'Download the desktop setup',
    body: 'Use the site as the front door, grab the Windows build, and install Glaze like a normal desktop application.',
  },
  {
    title: 'Unlock your companion',
    body: 'Open the app, add your provider key, create your vault passphrase, and set the rules for how Glaze should behave.',
  },
  {
    title: 'Work with the overlay',
    body: 'Let the orb stay close to your screen, review insight cards when they appear, and approve only the actions you want applied.',
  },
]

export const downloadHighlights = [
  {
    label: 'Primary experience',
    value: 'Desktop overlay',
    body: 'The installable app is the main product. The site stays focused on download, onboarding, and support.',
  },
  {
    label: 'Release channel',
    value: 'Windows preview',
    body: 'The first release is built for Windows with a lightweight setup flow and a dedicated download path.',
  },
  {
    label: 'Inside the app',
    value: 'Setup and controls',
    body: 'Provider connection, vault unlock, pause controls, deny list, and overlay behavior all live inside the desktop app.',
  },
]

export const supportGuides = [
  {
    title: 'Getting started',
    body: 'Install Glaze, unlock the app, choose your provider, and let the desktop layer settle into your workflow.',
  },
  {
    title: 'Privacy and control',
    body: 'Pause observation at any time, deny selected apps, and keep every apply action behind a visible approval step.',
  },
  {
    title: 'Workflow tips',
    body: 'Use Glaze in writing, coding, and research sessions where short, contextual suggestions are more useful than a full chat window.',
  },
]

export const faqs = [
  {
    question: 'Is Glaze a website product or a desktop product?',
    answer:
      'Glaze is a desktop product first. The website is the public layer for download, articles, release notes, and support.',
  },
  {
    question: 'Does Glaze take over my computer?',
    answer:
      'No. It observes, suggests, and waits for approval. Applying text is always a user-approved action.',
  },
  {
    question: 'Can I pause it instantly?',
    answer:
      'Yes. The overlay includes a pause state so observation can stop immediately whenever you want a quiet screen.',
  },
  {
    question: 'Who is the first release for?',
    answer:
      'The first release is Windows-first, built for people who want a companion layer on top of the software they already use every day.',
  },
]

export const articles: Article[] = [
  {
    slug: 'writing-with-glaze',
    kicker: 'Guide',
    title: 'Writing With Glaze',
    excerpt:
      'Keep your document open, let the overlay notice weak phrasing, and accept sharper edits without jumping between tabs.',
    readTime: '4 min read',
    heroBlurb:
      'The best writing tools disappear into the background. Glaze is built to stay calm until the moment a sentence can be cleaner, tighter, or more useful.',
    sections: [
      {
        heading: 'Stay inside the sentence',
        paragraphs: [
          'Traditional AI writing workflows ask you to leave the page, paste text into a chat, and then manually move the answer back into your draft. That loop is slow, brittle, and mentally expensive.',
          'Glaze flips the model. The companion stays near your work, reads visible context, and surfaces a short suggestion only when there is enough evidence that the change is worth showing.',
        ],
      },
      {
        heading: 'Treat suggestions like a second editor',
        paragraphs: [
          'The strongest use of Glaze in writing is not full automation. It is fast editorial pressure. Tone fixes, sentence trims, transition repairs, and summary lines are where the overlay feels most natural.',
        ],
        bullets: [
          'Tighten verbose paragraphs without rewriting the whole page.',
          'Repair awkward transitions between sections.',
          'Generate cleaner alternatives for calls to action and headings.',
        ],
      },
      {
        heading: 'Use the pause state deliberately',
        paragraphs: [
          'Not every writing session benefits from suggestions. Drafting from scratch often needs silence first. Editing and polishing benefit from an observant companion later.',
        ],
        callout:
          'Best rhythm: draft with the overlay quiet, then unpause when you are ready to polish.',
      },
    ],
  },
  {
    slug: 'coding-with-glaze',
    kicker: 'Workflow',
    title: 'Coding With Glaze',
    excerpt:
      'Let the desktop overlay notice rough naming, incomplete edge cases, or thin review notes while your editor stays front and center.',
    readTime: '5 min read',
    heroBlurb:
      'Code tools already compete for attention. Glaze works best when it does less: notice context quietly, surface one sharp card, then get out of the way.',
    sections: [
      {
        heading: 'Assist without becoming the IDE',
        paragraphs: [
          'Glaze is not meant to replace your editor or your review flow. It works as a narrow contextual layer above them, especially when you want fast, local suggestions without opening another panel.',
          'That makes it useful for commit wording, code review notes, inline documentation, small refactors, and bug explanation drafts.',
        ],
      },
      {
        heading: 'Where it creates the most value',
        paragraphs: [
          'The companion is strongest when it reacts to the exact thing you are looking at. A visible diff, a failing note, or a dense function body provides enough local context for a compact, high-signal card.',
        ],
        bullets: [
          'Turn messy review feedback into clear action points.',
          'Explain a function in one human sentence for a code comment.',
          'Draft edge cases or test ideas from the visible implementation.',
        ],
      },
      {
        heading: 'Keep the approval boundary intact',
        paragraphs: [
          'The reason this workflow feels safe is simple: Glaze never becomes the pilot. The final apply action belongs to the user, every time.',
        ],
        callout:
          'The companion is useful because it is close to the work, not because it is allowed to take control of it.',
      },
    ],
  },
  {
    slug: 'research-with-glaze',
    kicker: 'Article',
    title: 'Research With Glaze',
    excerpt:
      'Use visible context from long pages, reports, and docs to surface takeaways, next actions, and reusable notes without losing your place.',
    readTime: '4 min read',
    heroBlurb:
      'Research gets slower every time you stop to manage tools. A companion layer can turn visible text into summaries and next steps while your browser stays exactly where it is.',
    sections: [
      {
        heading: 'Think in passes, not tabs',
        paragraphs: [
          'The fastest research sessions usually move in passes: skim, collect signals, distill the point, then decide what matters. Glaze can support the distillation pass while you keep reading.',
        ],
      },
      {
        heading: 'Use insight cards as note fragments',
        paragraphs: [
          'Short cards are especially effective in research because they can act like proto-notes. Instead of demanding a full answer, they can give you a takeaway, a question, or a next action that is worth saving.',
        ],
        bullets: [
          'Capture the main claim of a dense section.',
          'Pull a short summary before switching to another source.',
          'Turn visible context into a reusable note fragment.',
        ],
      },
      {
        heading: 'Avoid over-automation',
        paragraphs: [
          'Research quality drops when every paragraph becomes a summary request. Use the overlay for moments where compression helps, not as a replacement for actual reading.',
        ],
        callout:
          'The best research companion does not interrupt comprehension. It sharpens it.',
      },
    ],
  },
]
