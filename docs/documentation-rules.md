# How we write documentation

This file is written so it can be pasted in as a prompt when you use a language model to write or fix documentation here. Give it the whole file and ask for a draft.

When a principle does not work in practice, propose a change in an issue. Follow them until then. The structure only works when it is the same across the files.

## Which kind are you writing

| Kind | Test | Where it belongs |
|---|---|---|
| Convention | Can the rule be broken without a tool saying anything? | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| How-to | Does it end with something being done? | The file for the area you are working in |
| Reference | Do you look up one row and leave again? | The same file, under **What things mean** |
| Explanation | Does it answer "why is it like this?" | [`docs/adr/`](adr/) |

Don't copy the hub's rules. Link to them, or write out what matters most with an example.

## Length

**A reference has to be complete.** It has no length limit. When a value, a column or a status is missing, the reader assumes it does not exist, and the document has done damage. Completeness beats brevity.

Keep a **how-to** under 100 lines. Past 150 it needs a table of contents, and then it is no longer a cheat sheet. The number applies to how-tos only.

Three to seven lines per paragraph. Short words. Come to the point and stop.

## Open with the shape

Open a reference with one sentence about what the reader is looking at and how it is divided. Not "this document contains", but "sixteen concepts, falling into three parts".

Give each group one line about what it is before you list its contents. A markdown table of 43 columns without one line per database table is harder to use, not easier.

## Explain the notation

Expand every abbreviation and every symbol on first use. `PK`, `STW`, `CCR`, `0..*` — several of us have not taken the course yet.

## The order within a row

The known first, the new last. The reader arrives with a name they have seen: a status, a label, a field. That is the known. Put it first, and let the meaning come last.

The reader sees the first two words, roughly 11 characters. Open with the noun that holds the meaning.

The same shape for every entry: the same columns in the same order, every time.

```
Good: | In review | The board | When the pull request is linked to the issue |
Bad:  The board moves an issue on its own when something happens in GitHub.
```

## Paragraphs stand alone

Readers open the file from a search or a link, not from the top. Don't write "as mentioned above".

One paragraph, one thing. When it says two things, make it two paragraphs.

## The division of labour between diagram, table and prose

When the document has a diagram, the diagram shows names, types and relations. Don't repeat them in a table.

The table gives each field its meaning, its source, and how certain it is.

Prose says why the choice was made.

Actions in sequence are a numbered list. A command is a fenced code block with the language named. Definition lists do not work in GitHub's markdown. Use one bullet per entry, `- **name**: meaning`, because plain lines next to each other run together into a single paragraph.

## Prose

**The one acting is the subject. The action is the verb.** Find the action in the sentence. When it is a noun ending in `-ing`, `-ment`, `-ance` or `-tion`, turn it back into a verb.

> `Validation of fixtures against the schema is performed by a script.`
> → `The script validates fixtures against the schema.`

**Name the one doing it.** The passive hides the actor, and the actor is exactly what the reader came to look up.

> `The label is set when a pull request is opened.`
> → `The workflow sets the label when you open a pull request.`

**One pronoun, one possible referent.** When the sentence holds two nouns, repeat the noun instead of writing `it` or `this`.

**The condition first.** Then the reader can skip the sentence when the condition does not apply.

> `GitHub blocks the merge button if the branch is behind.`
> → `When the branch is behind, GitHub blocks the merge button.`

**Name the thing** rather than describing it. `pr-description-check.yml`, not "the file that checks the description".

**Numbers and names over quantifiers.** `several`, `often`, `typically` and `a number of` say nothing.

> `Several branches are behind.`
> → `15 of 17 branches are behind.`

**End the sentence on the word that should be remembered.** The last position carries the most weight.

> `E1002 is returned when a scenario is already active on the line.`
> → `When a scenario is already active on the line, the endpoint returns E1002.`

**Open each sentence with something the previous sentence gave the reader.** Three facts in a row with no link between them read as a list, not a paragraph.

> `The contract lives in contracts/. The test suite validates the schema. Breaking changes go to the integration meeting.`
> → `The contract lives in contracts/. The frontend test suite validates against that file, so a rename surfaces as a failing test. That failing test is what goes to the integration meeting.`

**Keep the subject next to its verb.** Move the qualifying clause into a sentence of its own.

> `The endpoint, which the steward app calls every thirty seconds unless the device is offline, returns the active scenario.`
> → `The endpoint returns the active scenario. The steward app calls it every thirty seconds, unless the device is offline.`

**Name the content, not its role.** A sentence that states what something is for, or how it differs from something else, leaves the content to the sentence after it. Never define a thing by negation, because "what the diagram cannot show" makes the reader work out the remainder.

> `The table holds what the diagram cannot show.`
> → `The table gives each field its meaning, its source, and how certain it is.`

**Choose the verb that says what happens.** When the subject cannot do it with hands, the verb is inflating the claim. Write `the architecture logs every state change`, not `the architecture reflects a commitment to traceability`. The same family: "underscores", "highlights", "speaks to".

**Put the example straight after the claim.** The example fixes the meaning, while restating the claim does not.

**Group in twos or fours.** Three items in a row signal that the third is filler.

## Phrases to rewrite on sight

`It is not X, it is Y` defines by contrast and leaves the reader holding two things instead of one. Say what it is.

Magic adverbs carry no information: `fundamentally`, `deeply`, `simply`, `essentially`. Cut one and the sentence says the same thing.

A trailing `-ing` clause bolts a conclusion onto a fact: `underscoring the need for`, `highlighting that`, `contributing to`. Put the conclusion in its own sentence, or drop it.

## What goes in

In a reference: describe, and only describe. No opinion and no instruction.

In a how-to: write out the click path or the command, and assume no prior knowledge. Say which page you start from.

Give each concept one line: the name first, then the meaning.

A sentence that exists only to connect two other sentences has to go. Nobody reads a reference from the top.

**But "describe and only describe" does not mean you hide how certain you are.** At each field, write whether it is backed by a source, an assumption, or a decision we made ourselves. For an assumption, write what it would take to settle it. "Assumption" on its own is a label, while "Assumption. Needs a requirement for closing a scenario" is a task.

At each source, also write what it backs up. A source name without that is useless, because the reader does not know what to look for.

When you move a rationale to `docs/adr/`, write the decision in the same pull request. Otherwise it has not moved, it is gone.

Add nothing the source did not contain. No caveat, no recommendation, no summary section, no table that was not already there. When a rewrite needs a fact the source lacks, mark it `[?]` and leave it for the author.

## Generate the table from the source

When a table can be built from the code, build it. A column overview written by `schema.sql` cannot disagree with the schema, while one written by hand drifts from it. That is how a missing value in `station_role` was found.

## Screenshots

Use them only where no command exists. A screenshot goes stale when GitHub changes the interface, and a stale image is more convincing and more wrong than stale text.

The images live in `docs/images/`.

## Going stale

A stale document is worse than no document. The reader believes they have understood, carries on from an assumption that was true once, and the error slips through. The trust does not come back.

So fix every document your change makes wrong, in the same pull request.

## Who you write for

Documentation is read to be **reminded** of something, not to learn it. Write for someone who knew it and forgot.

## Review checks

Run these against a section you have written.

### 1. One question per section

From Diátaxis: a how-to answers "How do I...?", a reference answers "What is...?", an explanation answers "Why...?".

- **Applies when:** any section with a heading.
- **Check:** name the question the body answers.
- **Passes when:** the body answers one question, and the heading announces that same question.
- **Repair:** split the section, and move the "Why...?" material to `docs/adr/`.

### 2. Information scent in the heading

From information foraging theory: a reader estimates a section's value against the time it costs, reads that estimate off the heading, and leaves the section when the estimate is poor.

- **Applies when:** every heading and every link label.
- **Check:** does the heading name the artefact the reader came for, such as a form field, a command, a file or a label?
- **Passes when:** the heading names it.
- **Repair:** put the artefact in the heading instead of the concept. `Acceptance criteria` becomes `Acceptkriterier: what goes in the field`.

### 3. Reading to do

From Carroll's minimalism: documentation is read to do, to study and to locate, and an action-oriented document serves the first before the second.

- **Applies when:** the section asks the reader to produce text, a command or a file.
- **Check:** count the lines from the heading to the first thing the reader can copy or run.
- **Passes when:** ten or fewer.
- **Repair:** move the copyable thing above the explanation.

### 4. Error recognition and recovery

Carroll's third principle of minimalism.

- **Applies when:** the section asks the reader to choose, to size or to judge something.
- **Check:** does the section say what to do when the reader cannot decide, or has decided wrongly?
- **Passes when:** it names the next step, and who to ask or what to run.
- **Repair:** add one sentence that names the recovery path.

### 5. No seductive details

From the seductive-details effect, measured across 58 studies: content that is interesting but irrelevant to the task lowers both retention and transfer, and does most damage sitting next to the material that matters.

- **Applies when:** every sentence in a how-to or a reference.
- **Check:** delete the sentence, then ask whether anything the reader types, runs or clicks has changed.
- **Passes when:** deleting it changes what the reader does.
- **Repair:** cut it. Provenance and rationale belong in `docs/adr/`.

## Template

```markdown
# <The area: one or two words>

## How to

### <The action in the imperative>

1. <step with the command or the click path written out>
2. <step>

## What things mean

- **<the known name>**: <the meaning>

| <the known> | <the new> | <the new> |
|---|---|---|
```
