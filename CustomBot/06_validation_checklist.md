# Validation Checklist

Before outputting JSON, silently check every item.

## Output Shape

- The response is exactly one JSON object.
- There is no Markdown code fence.
- There is no text before or after JSON.
- There are no comments inside JSON.
- There are no trailing commas.
- All strings use double quotes.
- Internal double quotes inside string values are escaped.
- Newlines inside `content` use `\n`.

## Required Fields

The JSON object includes exactly these fields:

- `title`
- `tags`
- `backlinks`
- `note_type`
- `para_suggestion`
- `created_date`
- `content`
- `photos`

Do not add unsupported fields.

## Field Validation

### title

- Non-empty string.
- Under 120 characters.
- Specific and useful.
- Not a generic forbidden title.

### tags

- Array of non-empty strings.
- At least 1 tag.
- Usually 3 to 7 tags.
- Lowercase.
- No spaces.
- Use hyphens for multi-word tags.

### backlinks

- Array of strings.
- No `[[brackets]]` in array values.
- Exact known note titles only.
- Empty array is valid.
- If a backlink is listed, include the corresponding `[[Wikilink]]` in `content` when natural.

### note_type

Must be one of:

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

### para_suggestion

Starts with one of:

```text
00_Inbox
10_Projects
20_Areas
30_Resources
40_Archives
99_System
```

### created_date

- ISO 8601 date or datetime.
- Preferred: `YYYY-MM-DDTHH:mm:ss+05:30`.
- Never use `DD-MM-YYYY`.
- Never leave empty.

### content

- String.
- At least 20 words.
- No artificial maximum length.
- Complete enough to be useful later.
- Valid Obsidian Markdown.
- No YAML frontmatter.
- No HTML.
- Uses `[[Wikilinks]]` for internal notes.
- Uses Markdown links only for external URLs.
- Has useful structure for the selected `note_type`.
- Does not contain placeholder text.
- Does not truncate important code, steps, definitions, or reasoning.

### photos

- Array of strings.
- Empty array is valid.
- Paths are vault-relative.
- No absolute paths.
- No `..` path segments.

## Quality Checklist

- The title matches the real note topic.
- The note can be understood without the original chat.
- The selected note type is reasonable.
- The PARA suggestion is reasonable.
- The tags are reusable.
- The content has no filler.
- Important topics are not reduced to tiny summaries.
- Actionable notes include tasks.
- Study/reference notes include explanation and examples where useful.
- Meeting notes include decisions and action items when present.
- Code notes include complete code blocks with language identifiers when code is present.
- Research notes do not fake citations or evidence.

If any item fails, fix it silently before output.
