# Vault Rules

These rules describe Jayesh's Obsidian vault organization and how the JSON note should fit into it.

## Vault Flow

All notes from Vault Bot are saved into:

```text
00_Inbox/_Quick_Notes
```

The `para_suggestion` field tells Jayesh where the note should probably go during review. It does not control the save path.

## PARA Structure

```text
00_Inbox
  _Quick_Notes
  00_Daily_Notes

10_Projects

20_Areas
  10_Personal
    Document
    Journal
  20_Study
    CNC
  30_Career

30_Resources
  10_Documents
  20_Books
    Books

40_Archives
  zz_Excalidaw_Data

99_System
```

## PARA Decision Rules

- Use `00_Inbox` for quick captures, incomplete ideas, and uncertain notes.
- Use `10_Projects` for active outcomes with deadlines or deliverables.
- Use `20_Areas/10_Personal` for health, family, personal life, documents, routines, and journaling.
- Use `20_Areas/20_Study` for learning, courses, DSA, CNC, math, research, and academic material.
- Use `20_Areas/30_Career` for jobs, interviews, portfolio, professional skills, and workplace learning.
- Use `30_Resources` for evergreen references, guides, frameworks, explanations, and reusable knowledge.
- Use `30_Resources/10_Documents` for important documents.
- Use `30_Resources/20_Books` for book summaries and reading notes.
- Use `40_Archives` only for completed, inactive, or historical material.
- Use `99_System` for MOCs, dashboards, templates, schemas, and vault operation notes.

## Link Rules

- Use `[[Wikilinks]]` for internal notes.
- Never use Markdown links for internal notes.
- Use Markdown links only for external URLs.
- If a known parent MOC exists, link to it in the content.
- If the note is isolated and no backlink is known, add a gentle `#ToProcess` inline tag only when helpful.

## Backlink Rules

The `backlinks` JSON array is metadata for the app. It should contain exact known note titles, without brackets.

Inside `content`, write the links as Obsidian wikilinks.

Example:

```json
"backlinks": ["CNC_MOC"]
```

Content:

```markdown
Related to [[CNC_MOC]].
```

Do not add random backlinks. Quality is more important than quantity.

## Tag Rules

- JSON `tags` should be lowercase and hyphenated.
- Prefer 3 to 7 tags for normal notes.
- Use broad reusable tags plus one or two specific tags.
- Avoid one-off tags unless the concept is genuinely important.
- Inline content tags are optional and should be used sparingly.

Good JSON tags:

```json
["cnc", "gcode", "study", "machining"]
```

Good inline tags:

```markdown
#ToProcess
#Idea
#Meeting
```

## Attachment Rules

- Use `photos` only when the user uploaded or mentioned attachments.
- Use vault-relative paths.
- In content, embed attachments using `![[filename.ext]]`.
- The server may append an attachments section automatically, so only embed manually when the image is directly discussed in the note.

## Plugin-Aware Content

Jayesh uses Obsidian plugins and features including:

- Dataview
- Templater
- Tasks
- Excalidraw
- Calendar
- Omnisearch

Use plugin syntax only when useful:

- Tasks: `- [ ] Action item 📅 2026-05-14`
- Dataview: only for MOC/dashboard/reference notes where a query is genuinely helpful.
- Mermaid: for process, system, timeline, or architecture notes.
