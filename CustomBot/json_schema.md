# JSON Schema and Validation Rules

> This is the authoritative reference for the exact JSON output format. Every field is defined here with its rules, constraints, and examples. Validate against this before every output.

---

## Complete Schema

```json
{
  "title": "string",
  "tags": ["string"],
  "note_type": "string",
  "para_suggestion": "string",
  "created_date": "string",
  "content": "string",
  "backlinks": ["string"],
  "photos": ["string"]
}
```

**Required fields (in frontmatter):** `title`, `tags`, `note_type`, `para_suggestion`, `created_date`, `content`

**Optional fields (NOT in frontmatter):** 
- `backlinks` — maintained in note context/content only (defaults to `[]` if omitted)
- `photos` — embedded in note content as attachments (defaults to `[]` if omitted)

---

## Field Rules

### title
- Type: string
- Required: yes
- Format: natural descriptive title, standard capitalization
- No formatting restrictions — write it as a human would title a note
- Max length: 120 characters
- Forbidden (exact whole-word match only, case insensitive):
  `note`, `untitled`, `test`, `temp`, `draft`, `random`, `misc`, `stuff`, `things`, `new`
- "Testing My New System" is VALID — forbidden words are whole-word only, not substrings
- "Test" alone is INVALID

Good examples:
```
"CNC Programming GCode And MCode Reference"
"Deep Work Session Strategies"
"Python Async Patterns"
"What is Life"
"Meditations - Marcus Aurelius"
```

Bad examples:
```
"test"              ← forbidden word
"untitled"          ← forbidden word
"new"               ← forbidden word
```

---

### tags
- Type: array of strings
- Required: yes
- Min items: 3
- Max items: 25
- Format: lowercase-hyphenated — `deep-work`, `python-async`, `cnc-programming`
- No spaces inside a tag
- No uppercase
- Reuse existing vault tags whenever possible — always check vault index first
- Create new tags only for genuinely new topics

Good examples:
```json
["deep-work", "productivity", "python"]
["cnc", "gcode", "mcode", "manufacturing"]
["dsa", "sorting-algorithms", "leetcode"]
```

Bad examples:
```json
["Deep Work"]       ← spaces and uppercase
["Python Async"]    ← spaces
[""]                ← empty string
```

---

### backlinks
- Type: array of strings
- Required: no (optional)
- **NOT stored in frontmatter** — maintain in note content/context only via `[[Wikilinks]]`
- Values must be exact note titles from the vault index `notes[]` array
- Only include genuinely related notes — not random
- Prioritize `top_backlink_targets` from vault index
- Empty array `[]` is valid

Good examples:
```json
["CNC_MOC", "CNC_Basics", "Manufacturing_Processes"]
[]
```

Bad examples:
```json
["[[CNC MOC]]"]     ← do not include brackets
["cnc moc"]         ← must match exact vault note title
```

---

### note_type
- Type: string
- Required: yes
- Must be exactly one of (lowercase):
  `idea | reference | task | log | meeting | book | person | code`
- No other values accepted

---

### para_suggestion
- Type: string
- Required: yes
- Must start with one of these exact top-level folders:
  `00_Inbox | 10_Projects | 20_Areas | 30_Resources | 40_Archives | 99_System`
- May include subfolder path

Valid values:
```
"00_Inbox"
"10_Projects"
"20_Areas"
"20_Areas/10_Personal"
"20_Areas/20_Study"
"20_Areas/30_Career"
"30_Resources"
"30_Resources/10_Documents"
"30_Resources/20_Books"
"40_Archives"
"99_System"
```

---

### created_date
- Type: string
- Required: yes
- Format: DD-MM-YYYY
- Use today's date if not specified by user
- Never leave empty

Good examples:
```json
"10-05-2026"
"01-01-2025"
```

Bad examples:
```json
"May 10 2025"        ← wrong format
"2025/05/10"         ← wrong format
"2025-05-10"         ← wrong format
""                   ← empty not allowed
```

---

### content
- Type: string
- Required: yes
- Min words: 20
- Max words: No limit
- Must be valid Obsidian-flavored Markdown
- Must follow the structure from `note_type_templates.md` for the detected note type
- Must use proper Markdown headings hierarchy (`#`, `##`, `###`) where appropriate
- Must use `[[Wikilinks]]` for internal vault references
- Never use Markdown links for internal notes
- Must use `![[filename.ext]]` for vault image embeds
- Never use external image embeds like `![alt](url)` for vault images
- External URLs are allowed only in the `online` field or `🌐 Online Resources` section
- Must use Obsidian callout syntax (`> [!note]`, `> [!warning]`, etc.) for important sections when relevant
- Use `==highlighted text==` for key concepts, definitions, or important terms
- Use fenced code blocks with language identifiers when including code
- Must preserve readable spacing and paragraph separation
- Never use HTML tags
- Never generate placeholder text like `lorem ipsum`, `TBD`, `example content`, or `coming soon`
- Avoid repetitive filler content
- Newlines inside JSON strings must use `\n`
- Escape internal quotes with `\"`

---

### photos
- Type: array of strings
- Required: no (optional)
- **NOT stored in frontmatter** — embedded in note content only
- Format: relative vault path — `00_Inbox/_Attachments/filename.jpg`
- Only include if user has actually uploaded or mentioned photos
- Empty array `[]` is the default
- Omit entirely if not relevant — the server will treat missing as `[]`
- Rendered as `![[filename]]` attachments in note body

---

## Pre-Output Validation Checklist

Before outputting JSON, silently verify every item:

- [ ] `title` is not empty
- [ ] `title` is not a forbidden word (exact whole-word match only)
- [ ] `title` is under 120 characters
- [ ] `tags` has at least 1 item
- [ ] Every tag is lowercase-hyphenated with no spaces
- [ ] Tags reuse vault index tags wherever possible
- [ ] `backlinks` is optional (can be empty or omitted)
- [ ] Every backlink matches an exact vault note title format
- [ ] `note_type` is exactly one of the 8 allowed values
- [ ] `para_suggestion` starts with a valid top-level PARA folder
- [ ] `created_date` is valid ISO 8601 format
- [ ] `content` is at least 20 words
- [ ] `content` uses `[[Wikilinks]]` for internal references
- [ ] `content` does not use `[text](internal-url)` for internal notes
- [ ] `content` uses correct heading structure for the note type
- [ ] `photos` is optional (can be empty or omitted)
- [ ] JSON has no trailing commas
- [ ] JSON has no unescaped double quotes inside string values
- [ ] JSON is syntactically valid and complete
- [ ] No text appears before or after the JSON block in the output

Fix any issue silently. Never mention the fix. Never output invalid JSON.

---

## Complete Valid Output Example

JSON payload (for API):
```json
{
  "title": "CNC Programming GCode And MCode Reference",
  "tags": ["cnc", "gcode", "mcode", "manufacturing", "academics"],
  "backlinks": ["CNC_MOC", "CNC_Basics", "Manufacturing_Processes"],
  "note_type": "reference",
  "para_suggestion": "20_Areas/20_Study",
  "created_date": "2026-05-10T14:30:00",
  "content": "> [!abstract] Complete reference for G-code and M-code used in CNC programming\n\n## 📌 Summary\n\nG-code and M-code are the two primary programming languages used to control ==CNC machines==. G-codes control movement and positioning. M-codes control machine functions like spindle and coolant. This note serves as a quick reference for [[CNC_Basics]] and [[CNC_Turning_Operations]].\n\n## 🔑 Key Points\n\n- **G-codes** — geometric commands controlling tool path and movement\n- **M-codes** — miscellaneous commands controlling machine state\n- Both are used together in every CNC program\n\n## 💻 Common G-Codes\n\n| Code | Function |\n|---|---|\n| G00 | Rapid positioning |\n| G01 | Linear interpolation (feed) |\n| G02 | Circular interpolation CW |\n| G03 | Circular interpolation CCW |\n| G28 | Return to home position |\n\n## 💻 Common M-Codes\n\n| Code | Function |\n|---|---|\n| M03 | Spindle ON clockwise |\n| M05 | Spindle OFF |\n| M08 | Coolant ON |\n| M09 | Coolant OFF |\n| M30 | Program end and reset |\n\n> [!warning] Machine-specific codes\n> Some G and M codes vary between machine manufacturers. Always verify against your machine's controller manual.\n\n## 🔗 Related\n\n- [[CNC_MOC]] — parent index for all CNC notes\n- [[Tool_Offset_Concepts]] — how offsets interact with G-code positioning\n- [[Coordinate_System_Concepts]] — understanding machine vs work coordinates",
  "photos": []
}
```

Resulting frontmatter in saved note:
```yaml
---
title: CNC Programming GCode And MCode Reference
tags:
  - cnc
  - gcode
  - mcode
  - manufacturing
  - academics
note_type: reference
para_suggestion: 20_Areas/20_Study
created_date: 2026-05-10T14:30:00
source: webapp
status: inbox
---
```

**Key points:**
- `backlinks` and `photos` are **NOT** in the saved note's frontmatter
- `backlinks` are maintained via `[[Wikilinks]]` in the note content
- `photos` are embedded as `![[filename]]` attachments in the note body


