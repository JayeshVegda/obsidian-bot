# Note Type Templates

Use these structures inside the `content` field. Do not include YAML frontmatter.

The structure should fit the input. Do not force every section if it would create filler.

Default to useful depth. For important topics, include enough context, explanation, examples, and sources so the note is not just a short summary.

When web research was used, include a `## Sources` or `## Online Resources` section with Markdown links.

## fleeting

Use for raw capture, incomplete thoughts, quick mobile notes, or ideas that need later processing.

```markdown
> [!note] Capture
> Short summary of the raw thought.

## Context

What the user meant, with enough detail to remember later.

## Possible Direction

- Potential next step or interpretation.
- Related idea to explore.

#ToProcess
```

## idea

Use for original thoughts, hypotheses, concepts, possible projects, or creative connections.

```markdown
> [!abstract] Idea
> One-paragraph summary of the idea.

## Problem Or Trigger

What caused this idea or what problem it addresses.

## Core Insight

The main insight in Jayesh's own words.

## Possible Uses

- Use case 1
- Use case 2

## Next Actions

- [ ] One concrete next action if relevant.

## Related

- [[Relevant_Note]]
```

## reference

Use for reusable knowledge, study notes, explanations, guides, concepts, or technical references.

```markdown
> [!summary] Summary
> Short explanation of the topic and why it matters.

## Context

What this topic is, when it matters, and where Jayesh may use it.

## Key Points

- Point 1
- Point 2
- Point 3

## Explanation

Clear explanation with enough detail to understand the concept later.

## Examples

Practical examples, table, code block, or diagram when helpful.

## Common Mistakes

- Mistake or misconception if relevant.

## Practical Use

- How Jayesh can apply this.

## Related

- [[Relevant_Note]]

## Sources

- [Source Title](https://example.com)
```

## task

Use for actionable items, checklists, project next steps, or reminders.

```markdown
> [!todo] Task
> Clear outcome of the task.

## Desired Outcome

What done looks like.

## Checklist

- [ ] First action
- [ ] Second action

## Context

Relevant background.

## Dependencies

- Dependency or blocker, if any.
```

## log

Use for progress updates, journal-like records, events, experiments, daily notes, or activity history.

```markdown
> [!info] Log
> What happened.

## Event

Describe the event or progress.

## Observations

- Observation 1
- Observation 2

## Reflection

What this means or what should change.

## Follow-Up

- [ ] Follow-up action if needed.
```

## meeting

Use for meeting notes, calls, discussions, or planning conversations.

```markdown
> [!summary] Meeting Summary
> Short summary of the meeting.

## Attendees

- Person or group

## Agenda

- Topic 1
- Topic 2

## Decisions

- Decision 1

## Action Items

- [ ] Owner: action item

## Notes

Important discussion points.
```

## book

Use for book notes, chapter summaries, reading insights, or author ideas.

```markdown
> [!abstract] Book Note
> Core idea from the reading.

## Source

Book, author, chapter, or page context if known.

## Main Ideas

- Idea 1
- Idea 2

## Highlights

Key points in Jayesh's own words.

## Applications

- How Jayesh can use this.

## Related

- [[Relevant_Note]]
```

## person

Use for information about a person, contact, relationship, mentor, client, teacher, or collaborator.

```markdown
> [!note] Person Context
> Who this person is and why they matter.

## Profile

Known details.

## Relationship Context

How Jayesh knows them or why they are relevant.

## Important Notes

- Point 1
- Point 2

## Follow-Ups

- [ ] Follow-up if needed.
```

## code

Use for programming notes, debugging, commands, snippets, architecture, API behavior, or implementation ideas.

````markdown
> [!summary] Code Note
> Short summary of the problem or solution.

## Context

Where this code belongs, what stack it uses, and why the note exists.

## Problem

What needed to be solved.

## Solution

How it works.

## Full Code

```language
// include complete code from the user or researched solution
```

## Explanation

Explain the important parts of the code line by line or section by section when helpful.

## Commands

```bash
# commands required to run, test, build, or debug
```

## Gotchas

- Important edge case or warning.

## Testing Or Verification

- How to confirm the code works.

## Related

- [[Relevant_Note]]
````

## business

Use for business ideas, startup thinking, monetization, product strategy, clients, operations, or market notes.

```markdown
> [!abstract] Business Note
> Short summary of the opportunity or issue.

## Context

What triggered this business thought.

## Opportunity

The value, customer, or market angle.

## Risks

- Risk 1
- Risk 2

## Next Actions

- [ ] Concrete next action.
```

## moc

Use for maps of content, dashboards, index notes, topic hubs, or navigation notes.

```markdown
> [!summary] Map
> What this MOC organizes.

## Core Notes

- [[Important_Note]]

## Topics

### Topic Area

- [[Related_Note]]

## Missing Notes

- [ ] Note that should be created.
```

## other

Use only when no specific type fits.

```markdown
> [!note] Summary
> Short summary.

## Details

Main content.

## Related

- [[Relevant_Note]]
```
