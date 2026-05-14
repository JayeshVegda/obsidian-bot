# API Contract

This file is the highest authority for the JSON shape. The output must be valid for the Vault Bot backend.

## Required JSON Object

```json
{
  "title": "string",
  "tags": ["string"],
  "backlinks": ["string"],
  "note_type": "string",
  "para_suggestion": "string",
  "created_date": "string",
  "content": "string",
  "photos": ["string"]
}
```

Always include all fields. Use empty arrays for `backlinks` and `photos` when nothing is available.

## Field Rules

### title

- Type: string.
- Required.
- Maximum length: 120 characters.
- Must be specific and human-readable.
- Use natural title capitalization.
- Do not use only generic titles such as `note`, `untitled`, `test`, `temp`, `draft`, `random`, `misc`, `stuff`, `things`, or `new`.

Good:

```json
"CNC G02 And G03 Circular Interpolation"
```

Bad:

```json
"Untitled"
```

### tags

- Type: array of strings.
- Required.
- Must contain at least 1 tag.
- Prefer 3 to 7 useful tags for normal notes.
- Maximum practical limit: 25 tags.
- Use lowercase.
- Use hyphens for multi-word tags.
- No spaces.
- Reuse known vault tags when possible.

Good:

```json
["cnc", "gcode", "machining", "study"]
```

Bad:

```json
["CNC Notes", "Study Topic"]
```

### backlinks

- Type: array of strings.
- Always include.
- Use exact note titles when known.
- Do not include brackets in this array.
- Add `[[Wikilinks]]` inside `content` when referencing internal notes.
- Use an empty array when no known backlink is available.

Good:

```json
["CNC_MOC", "GCode_Reference"]
```

Bad:

```json
["[[CNC_MOC]]"]
```

### note_type

Must be exactly one of:

```text
idea
fleeting
reference
task
log
meeting
book
person
code
business
moc
other
```

Selection guide:

- `fleeting`: quick raw capture, incomplete thought, short mobile note.
- `idea`: original idea, concept, insight, hypothesis.
- `reference`: reusable knowledge, guide, study material, explanation.
- `task`: actionable item or checklist.
- `log`: event record, journal-style update, progress note.
- `meeting`: meeting notes, call notes, discussion summary.
- `book`: book notes, chapter notes, reading insights.
- `person`: information about a person, relationship, contact context.
- `code`: programming, debugging, architecture, commands, snippets.
- `business`: startup, money, product, strategy, market, client, operations.
- `moc`: map of content, index note, topic hub.
- `other`: only when none of the above fits.

### para_suggestion

- Type: string.
- Required.
- Must start with one valid top-level PARA folder:

```text
00_Inbox
10_Projects
20_Areas
30_Resources
40_Archives
99_System
```

Preferred suggestions:

- raw capture: `00_Inbox`
- active project: `10_Projects`
- personal, health, family, life admin: `20_Areas/10_Personal`
- study, learning, CNC, DSA, courses: `20_Areas/20_Study`
- career, job, interview, professional growth: `20_Areas/30_Career`
- reusable reference: `30_Resources`
- books: `30_Resources/20_Books`
- documents: `30_Resources/10_Documents`
- completed or inactive material: `40_Archives`
- MOCs, dashboards, system notes: `99_System`

Note: Vault Bot saves notes physically into `00_Inbox/_Quick_Notes`. `para_suggestion` is for later manual review.

### created_date

- Type: string.
- Required.
- Must be ISO 8601 date or datetime.
- Use today's date/datetime when not specified.
- Preferred datetime format for Jayesh:

```text
YYYY-MM-DDTHH:mm:ss+05:30
```

Good:

```json
"2026-05-14T10:30:00+05:30"
```

Also acceptable:

```json
"2026-05-14"
```

Do not use:

```json
"14-05-2026"
```

### content

- Type: string.
- Required.
- Must contain at least 20 words.
- No fixed maximum length from the CustomBot perspective. Write as much as needed for a complete useful note.
- Must be valid Obsidian Markdown.
- Must not include YAML frontmatter.
- Use escaped newlines as `\n` inside JSON.
- Escape internal double quotes as `\"`.
- Use headings, lists, tasks, tables, callouts, wikilinks, and code blocks when useful.
- Do not use HTML.

### photos

- Type: array of strings.
- Always include.
- Use vault-relative paths only.
- Use empty array when no photo or attachment is provided.
- Never use absolute paths.
- Never use paths containing `..`.

Good:

```json
["00_Inbox/_Attachments/cnc-setup.jpg"]
```

Bad:

```json
["/home/user/photo.jpg"]
```
