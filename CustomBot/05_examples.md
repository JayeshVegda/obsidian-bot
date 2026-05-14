# JSON Examples

These examples show the expected output shape. The Custom GPT must output only the JSON object, with no Markdown fence.

## Fleeting Capture

````json
{
  "title": "Improve Vault Bot Note Review Flow",
  "tags": ["vault-bot", "workflow", "idea"],
  "backlinks": [],
  "note_type": "fleeting",
  "para_suggestion": "00_Inbox",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!note] Capture\n> Jayesh wants to improve the review flow for notes created by Vault Bot.\n\n## Context\n\nThe thought is about making AI-generated notes easier to process after they land in `00_Inbox/_Quick_Notes`. The main issue is not note creation, but later review, movement, linking, and cleanup.\n\n## Possible Direction\n\n- Add clearer `para_suggestion` values.\n- Improve note-type templates.\n- Add stronger backlink and tag rules.\n\n#ToProcess",
  "photos": []
}
````

## CNC Reference Note

````json
{
  "title": "CNC G02 And G03 Circular Interpolation",
  "tags": ["cnc", "gcode", "machining", "study"],
  "backlinks": ["CNC_MOC"],
  "note_type": "reference",
  "para_suggestion": "20_Areas/20_Study",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Summary\n> G02 and G03 are CNC G-code commands used for circular interpolation. G02 creates clockwise arcs, while G03 creates counterclockwise arcs.\n\n## Key Points\n\n- `G02` means clockwise circular interpolation.\n- `G03` means counterclockwise circular interpolation.\n- The tool follows an arc instead of a straight line.\n- Arc movement usually needs endpoint coordinates plus radius `R` or center offsets `I` and `J`.\n\n## Example\n\n```gcode\nG02 X40 Y20 R10\nG03 X10 Y20 I-15 J0\n```\n\n## Common Mistakes\n\n> [!warning] Direction depends on view\n> Clockwise and counterclockwise direction depend on the active plane and how the operator views the toolpath.\n\n## Related\n\n- [[CNC_MOC]]",
  "photos": []
}
````

## Code Note

````json
{
  "title": "Vault Bot Created Date Validation",
  "tags": ["vault-bot", "typescript", "validation", "backend"],
  "backlinks": [],
  "note_type": "code",
  "para_suggestion": "10_Projects",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Code Note\n> Vault Bot expects `created_date` to be a parseable ISO date or datetime, not the older `DD-MM-YYYY` format.\n\n## Problem\n\nOlder CustomBot instructions used `DD-MM-YYYY`, but the backend validates dates by attempting to parse ISO-like strings with JavaScript `Date`.\n\n## Correct Format\n\n```json\n\"created_date\": \"2026-05-14T10:30:00+05:30\"\n```\n\n## Gotcha\n\n> [!warning] Old docs can break saves\n> If the Custom GPT outputs `14-05-2026`, the backend may reject the note as invalid.\n\n## Action\n\n- [ ] Keep `00_api_contract.md` as the source of truth for date format.",
  "photos": []
}
````

## Meeting Note

````json
{
  "title": "Vault Bot Custom GPT Planning Meeting",
  "tags": ["vault-bot", "meeting", "custom-gpt", "planning"],
  "backlinks": [],
  "note_type": "meeting",
  "para_suggestion": "10_Projects",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Meeting Summary\n> Planned a replacement knowledge pack for the Vault Bot Custom GPT so it can produce valid JSON and better Obsidian notes.\n\n## Attendees\n\n- Jayesh\n- Codex\n\n## Decisions\n\n- Replace old CustomBot files instead of keeping stale duplicates.\n- Use ISO 8601 dates for `created_date`.\n- Always include `backlinks` and `photos` arrays.\n\n## Action Items\n\n- [ ] Build the CustomBot knowledge files one by one.\n- [ ] Test the Custom GPT with real note inputs.\n\n## Open Questions\n\n- Which real vault backlinks should be prioritized after the vault index is available?",
  "photos": []
}
````

## Book Note

````json
{
  "title": "Atomic Habits Identity Based Change",
  "tags": ["book", "habits", "self-improvement", "systems"],
  "backlinks": [],
  "note_type": "book",
  "para_suggestion": "30_Resources/20_Books",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!abstract] Book Note\n> A useful idea from Atomic Habits is that durable behavior change starts with identity, not only goals.\n\n## Source\n\nAtomic Habits by James Clear.\n\n## Main Ideas\n\n- Goals define desired outcomes.\n- Systems define repeated behavior.\n- Identity defines the kind of person the system reinforces.\n\n## Application\n\nInstead of only saying \"I want better notes,\" Jayesh can build the identity of someone who captures, reviews, and connects ideas every day.\n\n## Next Actions\n\n- [ ] Create a weekly review habit for `00_Inbox/_Quick_Notes`.\n- [ ] Track whether notes are moved, linked, or archived.",
  "photos": []
}
````

## Photo Note

````json
{
  "title": "CNC Machine Setup Photo Reference",
  "tags": ["cnc", "machine-setup", "photo-reference", "study"],
  "backlinks": ["CNC_MOC"],
  "note_type": "reference",
  "para_suggestion": "20_Areas/20_Study",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Photo Reference\n> This note captures a CNC machine setup photo for later study and review.\n\n## Attachment\n\n![[cnc-machine-setup.jpg]]\n\n## Observations\n\n- Review the visible workholding setup.\n- Identify the tool position and possible coordinate reference.\n- Compare this setup with [[CNC_MOC]] notes.\n\n## Follow-Up\n\n- [ ] Add details about machine type, material, and operation when known.",
  "photos": ["00_Inbox/_Attachments/cnc-machine-setup.jpg"]
}
````

## MOC Note

````json
{
  "title": "CNC MOC",
  "tags": ["cnc", "moc", "study", "manufacturing"],
  "backlinks": [],
  "note_type": "moc",
  "para_suggestion": "99_System",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Map\n> This MOC organizes CNC study notes, including machine basics, G-code, M-code, setup, tooling, and practical machining concepts.\n\n## Core Notes\n\n- [[CNC_Basics]]\n- [[GCode_Reference]]\n- [[MCode_Reference]]\n\n## Topics\n\n### Programming\n\n- [[CNC G02 And G03 Circular Interpolation]]\n\n### Setup\n\n- [[CNC Machine Setup Photo Reference]]\n\n## Missing Notes\n\n- [ ] Tool offsets\n- [ ] Work coordinate systems\n- [ ] Feed and speed basics",
  "photos": []
}
````

## Researched Technical Reference

Use this pattern when web search was used before writing the note.

````json
{
  "title": "Obsidian Dataview Query Basics",
  "tags": ["obsidian", "dataview", "pkm", "reference"],
  "backlinks": [],
  "note_type": "reference",
  "para_suggestion": "30_Resources",
  "created_date": "2026-05-14T10:30:00+05:30",
  "content": "> [!summary] Summary\n> Dataview is an Obsidian plugin that lets Jayesh query notes using metadata, tags, folders, and file properties. It is useful for dashboards, MOCs, project lists, reading lists, and review workflows.\n\n## Context\n\nDataview works best when notes have consistent properties and tags. Since Vault Bot writes structured frontmatter, Dataview can be used later to find notes by `note_type`, `para_suggestion`, `status`, tags, or creation date.\n\n## Common Query Types\n\n| Query Type | Use Case |\n|---|---|\n| `LIST` | Simple list of matching notes |\n| `TABLE` | Dashboard-style table with selected fields |\n| `TASK` | Collect tasks from notes |\n| `CALENDAR` | Show notes by date field |\n\n## Example Queries\n\n```dataview\nTABLE note_type, para_suggestion, created_date\nFROM \"00_Inbox/_Quick_Notes\"\nWHERE status = \"inbox\"\nSORT created_date DESC\n```\n\n```dataview\nTASK\nFROM \"00_Inbox/_Quick_Notes\"\nWHERE !completed\n```\n\n## Practical Use\n\nJayesh can create a review dashboard that shows all inbox notes generated by Vault Bot, grouped by suggested PARA folder or note type. This makes weekly review easier because the AI-generated structure becomes queryable.\n\n## Gotchas\n\n> [!warning] Metadata consistency matters\n> Dataview becomes much more useful when field names stay consistent. Changing `note_type` or `created_date` naming later will break old queries unless notes are migrated.\n\n## Sources\n\n- [Dataview Documentation](https://blacksmithgu.github.io/obsidian-dataview/)\n- [Obsidian Properties Documentation](https://help.obsidian.md/properties)",
  "photos": []
}
````
