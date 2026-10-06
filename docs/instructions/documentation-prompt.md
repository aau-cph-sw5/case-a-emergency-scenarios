# Documentation prompt

You review one documentation file that already exists, and you repair what fails the rules in this prompt.

## Your task

The prompt opens with a document type, such as `Type: Reference`, and it holds the documentation file.

1. Read the document type on the first line, and find its row under **Document types**. When the prompt names no type, ask for one and stop.
2. Run every rule in the parts for that type. Do the rule's **Check**, and compare the result with **Passes when**.
3. Repair each failure with the rule's **Repair**. Rule 1.2 limits what you may add.
4. Return the repaired file. Under it, write one line per repair: the rule number and what you changed. For an instruction, open your answer with the verdict from rule 2.5.

31 rules in three parts. Every rule has the same four lines: when the rule applies, the check to run, what passes, and the repair.

## Document types: which parts apply

Six types, one row each. Read the type from the first line of the prompt, and apply the parts in the last column.

| Type | What it holds | Folder | Parts that apply |
|---|---|---|---|
| Instruction | What a programmer must do in a situation, such as creating an issue | `docs/instructions/` and [`CONTRIBUTING.md`](../../CONTRIBUTING.md) | 1 and 2 |
| Reference | An explanation of code or configuration that affects the program directly, such as the data model or a workflow | `docs/reference/`, and a section under **What things mean** | 1 and 3 |
| ADR, an architecture decision record | Why we chose something | [`docs/adr/`](../adr/) | 1 |
| Sprint record | What happened in one sprint | `docs/records/sprints/` | 1 |
| Other record | What happened outside a sprint | `docs/records/other/` | 1 |
| Template | A blank form that you copy into `docs/records/` or `docs/adr/` | `docs/templates/` | 1 |

Only instructions and reference have rules of their own. An ADR, a record and a template follow part 1 and nothing more.

**The reader** is a teammate who did the task once and forgot the steps. The reader remembers the goal, so skip the teaching. The reader has forgotten every name and every click, so write each one out.

**Which rule wins.** Rule 1.2 wins over every other rule. After that, a rule that keeps or adds content wins over a rule that cuts content, so rules 1.15, 2.10 and 2.11 give way.

A line marked `Bad:` is exempt from every rule, because the line shows the fault.

## Part 1: every file

15 rules. They apply to a file in any folder.

### 1.1 Take the document type from the prompt

The programmer states the type, and you apply the parts for that type.

- **Applies when:** any file.
- **Check:** read the first line of the prompt, and find that type in the table under [Document types](#document-types-which-parts-apply).
- **Passes when:** the prompt names one type from the table, and the file sits in the folder for that type.
- **Repair:** when the prompt names no type, ask the programmer for one before you start. When a section holds what another type holds, tell the programmer which section and which type. A table of options stays in an instruction when the section asks the reader to choose between its rows.

### 1.2 Add only facts the source holds

- **Applies when:** you rewrite a document, or a repair in this file tells you to add a sentence.
- **Check:** for each sentence you added, point at the place that states the fact: the code, the hub, the issue or the old text.
- **Passes when:** every added sentence has such a place, and you added no caveat, no recommendation, no summary section and no table.
- **Repair:** delete what you added. When the rewrite needs a fact the source lacks, mark the gap `[?]` and leave it for the programmer.

### 1.3 Expand notation on first use

- **Applies when:** the text holds an abbreviation or a symbol, such as `PK`, `STW`, `CCR` or `0..*`.
- **Check:** find where the file uses it first.
- **Passes when:** the first use says what it stands for.
- **Repair:** write it out at the first use.

### 1.4 Name what your repair makes stale

A stale document is worse than no document. The reader carries on from an assumption that was true once, and the error slips through.

- **Applies when:** your repair changes a name, a path or a value that the file states.
- **Check:** search the other markdown files in the repo for the old name. When you cannot read the repo, go to the repair.
- **Passes when:** no other file states the old name.
- **Repair:** change the name in the other file too, or tell the programmer which name to search for.

### 1.5 Name the thing

- **Applies when:** every sentence.
- **Check:** look for a description that stands in for a name, for a quantifier (`several`, `often`, `typically`, `a number of`), and for a sentence that says what a thing is for or what it lacks.
- **Passes when:** the sentence holds the name, the count or the content itself.
- **Repair:** write the name, the count or the content.

```text
Bad:  the file that checks the description
Good: pr-description-check.yml

Bad:  Several branches are behind.
Good: 15 of 17 branches are behind.

Bad:  The table holds what the diagram cannot show.
Good: The table gives each field its meaning, its source, and how certain it is.
```

### 1.6 Put the example straight after the claim

The example fixes the meaning, while restating the claim does not.

- **Applies when:** a sentence states a rule or a general claim.
- **Check:** read the next sentence.
- **Passes when:** the next sentence is an example of that claim.
- **Repair:** write the example there, and delete the restatement.

### 1.7 Use a screenshot only where no command exists

A screenshot goes stale when GitHub changes the interface, and a stale image is more convincing and more wrong than stale text.

- **Applies when:** a document holds an image.
- **Check:** does a command do the same thing?
- **Passes when:** no command exists, and the image lives in `docs/images/`.
- **Repair:** replace the image with the command, or with the click path in words.

### 1.8 Link to the hub's rules

- **Applies when:** a section states a rule that the hub, `semester-docs`, already states.
- **Check:** compare the section with the hub's text.
- **Passes when:** the section links to the hub, or writes out what matters most with an example.
- **Repair:** replace the copy with the link.

### 1.9 Order a row: the known first, the new last

The reader arrives with a name they have seen: a status, a label, a field. The reader sees the first two words, roughly 11 characters.

- **Applies when:** a table row or a list entry.
- **Check:** read the first two words of the entry.
- **Passes when:** they hold the name the reader arrives with, the meaning comes last, and every entry has the same columns in the same order.
- **Repair:** move the name to the front. Give each concept one line.

```text
Bad:  The board moves an issue on its own when something happens in GitHub.
Good: | In review | The board | When the pull request is linked to the issue |
```

### 1.10 Let the content pick the format

Six kinds of content, one row each.

| Content | Format |
|---|---|
| Names, types and relations | The diagram, when the document has one. A table does not repeat them |
| The meaning, the source and the certainty of each field | A table |
| Why the choice was made | Prose |
| Actions in sequence | A numbered list |
| A command | A fenced code block with the language named |
| A definition | One bullet per entry: `- **name**: meaning` |

- **Applies when:** you choose between a diagram, a table, a list and prose.
- **Check:** find your content in the left column.
- **Passes when:** the document uses the format in the right column.
- **Repair:** change the format. GitHub's markdown has no definition lists, and plain lines next to each other run together into one paragraph.

### 1.11 Keep one thing in a paragraph

Readers open the file from a search or a link.

- **Applies when:** every paragraph.
- **Check:** say in one sentence what the paragraph is about. Then read it as if you arrived from a search.
- **Passes when:** one sentence covers it, it is at most seven lines long on GitHub, and it makes sense without the paragraph before it.
- **Repair:** split the paragraph where the subject changes. Replace `as mentioned above` with the thing mentioned. Delete a sentence whose only content is to connect two other sentences.

### 1.12 Make the actor the subject and the action the verb

The passive hides the actor, and the actor is what the reader came to look up.

- **Applies when:** every sentence.
- **Check:** find the action in the sentence, then find who performs it.
- **Passes when:** the action is the verb, the one performing it is the subject, and the subject could do the verb with hands.
- **Repair:** turn a noun ending in `-ing`, `-ment`, `-ance` or `-tion` back into a verb. Name the actor. Replace `reflects`, `underscores`, `highlights` and `speaks to` with what happens.

```text
Bad:  Validation of fixtures against the schema is performed by a script.
Good: The script validates fixtures against the schema.

Bad:  The label is set when a pull request is opened.
Good: The workflow sets the label when you open a pull request.

Bad:  The architecture reflects a commitment to traceability.
Good: The architecture logs every state change.
```

### 1.13 Order the sentence: the condition first, the stress last

- **Applies when:** every sentence in a paragraph.
- **Check:** read the opening and the last word of the sentence.
- **Passes when:** four things hold. A condition comes first. The opening repeats something the previous sentence gave the reader. The subject sits next to its verb. The sentence ends on the word to remember.
- **Repair:** move the condition to the front, the qualifying clause into a sentence of its own, and the word to remember to the end.

```text
Bad:  GitHub blocks the merge button if the branch is behind.
Good: When the branch is behind, GitHub blocks the merge button.

Bad:  The contract lives in contracts/. The test suite validates the schema. Breaking changes go to the integration meeting.
Good: The contract lives in contracts/. The frontend test suite validates against that file, so a rename surfaces as a failing test. That failing test is what goes to the integration meeting.

Bad:  The endpoint, which the steward app calls every thirty seconds unless the device is offline, returns the active scenario.
Good: The endpoint returns the active scenario. The steward app calls it every thirty seconds, unless the device is offline.

Bad:  E1002 is returned when a scenario is already active on the line.
Good: When a scenario is already active on the line, the endpoint returns E1002.
```

### 1.14 Give each pronoun one possible referent

- **Applies when:** a sentence holds `it`, `this` or `they`, and two nouns the pronoun could stand for.
- **Check:** replace the pronoun with each noun in turn.
- **Passes when:** only one replacement makes sense.
- **Repair:** repeat the noun.

### 1.15 Cut these phrases on sight

Use short words. Come to the point and stop.

| Phrase | What it does | Repair |
|---|---|---|
| `It is not X, it is Y` | Defines by contrast, and leaves the reader holding two things | Say what it is |
| `fundamentally`, `deeply`, `simply`, `essentially` | Carries no information | Cut the adverb |
| A trailing `-ing` clause: `underscoring the need for`, `highlighting that`, `contributing to` | Bolts a conclusion onto a fact | Put the conclusion in its own sentence, or drop it |
| Three items in a row that you chose yourself | Signals that the third is filler | Group in twos or fours. A list of things that exist keeps every item |

- **Applies when:** every sentence.
- **Check:** search the text for each row of the table.
- **Passes when:** the search finds none.
- **Repair:** the third column of the row.

## Part 2: instructions

11 rules. They apply to a file in `docs/instructions/` and to `CONTRIBUTING.md`.

### 2.1 Show every instruction done once

A sentence built from kind-words (`an input`, `an outcome`) can be written and read without being understood. An example of something else in the same paragraph hides the gap.

- **Applies when:** a sentence tells the reader to do something, in any wording: `use`, `keep`, `show`, `name`, `choose`, `must`, `should`, `do not`.
- **Check:** carry out the instruction yourself on one real item from this repo. Then look for your result in the paragraph.
- **Passes when:** the paragraph shows one finished result of the instruction, and every noun after `a`, `an` or `any` has one named member beside it.
- **Repair:** put your result in place of the kind-word. When you cannot carry out the instruction, mark the sentence `[?]` and ask the programmer.

```text
Bad:  Name an input or an outcome where the criterion is not met.
Good: Describe one test run that the line fails. "Within 3 seconds" fails when the phone shows the scenario after 5 seconds.
```

### 2.2 Make every requirement failable

A requirement that no diagram, file or text can break gives the reader nothing to do.

- **Applies when:** a sentence tells the reader to do something, in any wording: `use`, `keep`, `show`, `must`, `should`, `do not`.
- **Check:** describe one diagram, file or text that breaks the requirement. Then ask whether two reviewers would agree on it without asking the person who wrote the requirement.
- **Passes when:** you can describe the breaking case, and the judgement is a count, a name or a presence.
- **Repair:** replace `clear`, `relevant`, `where it matters` and `where needed` with the thing a reviewer can see. When the team has not decided it, mark the sentence `[?]`.

```text
Bad:  Give the diagram file a clear name.
Good: Name the file in lower case with hyphens: scenario-reference-data.md.
```

### 2.3 State a choice made here

A sentence that is true in every project records no decision of ours.

- **Applies when:** every instruction in `docs/instructions/` or `CONTRIBUTING.md`.
- **Check:** would the sentence be true in another project's documentation?
- **Passes when:** it would be false there, because it names a notation, a tool, a folder, a name or a number we chose.
- **Repair:** write the choice. When no choice exists, cut the sentence or mark it `[?]` as an open decision.

```text
Bad:  Use the notation defined in the relevant guide.
Good: Draw an entity model as a UML class diagram, following docs/instructions/entity-domain-model-guide.md.
```

### 2.4 Walk one real task through the file

A file can pass every rule about its sentences and still leave the reader without the next step.

- **Applies when:** a file in `docs/instructions/`, or `CONTRIBUTING.md`.
- **Check:** pick one real task the file is for, such as "draw the state machine for scenario activation" for `docs/instructions/diagrams.md`. Do the task with only the text, and write down everything you type, click, create or decide.
- **Passes when:** the file names its tasks in its opening lines or in its headings under **How to**, the file decided every step, and a step used every sentence.
- **Repair:** write the instruction for each decision you had to make yourself, or mark it `[?]`. Cut each sentence that no step used.

```text
Bad:  The steps end at "Fill in the fields", and no step puts the issue on a board.
Good: 4. In the right sidebar, click Projects and select the board you picked.
```

### 2.5 Open a review with the verdict

Findings per sentence hide the state of the whole file.

- **Applies when:** you review a file in `docs/instructions/`, or `CONTRIBUTING.md`.
- **Check:** count the instructions, then count the ones that pass rules 2.2 and 2.3. Count the steps of the task from rule 2.4, then count the steps the file decided.
- **Passes when:** the first line of the review gives the four counts.
- **Repair:** write that line above the findings.

```text
Good: 9 of 21 instructions can be failed and state a choice made here. The file decided 3 of 5 steps of the task.
```

### 2.6 Say what to do when the reader cannot comply

Every instruction that asks for a decision has a reader who cannot make it.

- **Applies when:** the section asks the reader to choose, to size or to judge something.
- **Check:** does the section say what to do when the reader cannot decide, or has decided wrongly?
- **Passes when:** it names the next step, and who to ask or what command to run.
- **Repair:** add one sentence that names that next step. Rule 1.2 decides what the sentence may hold.

### 2.7 Write out the click path or the command

- **Applies when:** a step in a how-to.
- **Check:** follow the step with only the text in front of you.
- **Passes when:** the step names the page you start from, and then every click or the whole command.
- **Repair:** add the start page and the missing clicks.

### 2.8 Put the name the reader is after in the heading

A reader skims headings and opens one only when it names the thing they came for.

- **Applies when:** every heading below the title, and every link label. The two `##` headings in the template are fixed.
- **Check:** does the heading hold a name the reader would search for: a form field, a command, a file, a label, a status or a name shown on the screen?
- **Passes when:** it holds one of those. Under **How to**, the heading also opens with a verb in the imperative.
- **Repair:** put the name in the heading.

```text
Bad:  Acceptance criteria
Good: Fill in `Acceptkriterier`                  (under How to)
Good: Status: who sets each value, and when      (under What things mean)
```

### 2.9 Put what the reader copies first

A reader opens the file in the middle of a task. Explanation placed before the thing they need pushes it off the screen.

- **Applies when:** the section asks the reader to produce text, a command or a file.
- **Check:** count the lines from the heading down to the first thing the reader can copy or run.
- **Passes when:** ten or fewer.
- **Repair:** move the copyable thing above the explanation.

### 2.10 Keep the part under **How to** below 100 lines

- **Applies when:** the sections under **How to** in a file in `docs/instructions/`. A conventions file and a reference have no length limit.
- **Check:** count the lines from `## How to` down to `## What things mean`.
- **Passes when:** under 100.
- **Repair:** run rule 2.11 on every sentence. Past 150 lines the file needs a table of contents, and then it is no longer a cheat sheet.

### 2.11 Cut what changes nothing the reader does

Material that is interesting and irrelevant makes the task harder, and it does the most damage next to the part that matters.

- **Applies when:** every sentence in `docs/instructions/` and `CONTRIBUTING.md`, outside **What things mean**. In a reference, rule 3.1 wins.
- **Check:** delete the sentence, then ask whether anything the reader types, runs or clicks has changed.
- **Passes when:** deleting it changes what the reader does.
- **Repair:** cut it. The history of a decision belongs in `docs/adr/`.

## Part 3: reference

5 rules. They apply to a file in `docs/reference/`, and to a section under **What things mean** in an instruction file.

### 3.1 List every value in a reference

When a value, a column or a status is missing, the reader assumes it does not exist.

- **Applies when:** a reference lists statuses, columns, labels or fields.
- **Check:** count the entries in the source, then count the rows in the document.
- **Passes when:** the two counts match. A reference has no length limit.
- **Repair:** add the missing rows.

### 3.2 Build the table from the source

A table written by hand drifts from the code. When a script wrote the column overview from `schema.sql`, a missing value in `station_role` showed up.

- **Applies when:** the rows of a table exist in the code, as the columns do in `schema.sql`, and the table has ten rows or more. Rule 3.1 covers a shorter table.
- **Check:** can a script print the table from that file?
- **Passes when:** a script wrote the table.
- **Repair:** write the script, and replace the hand-written table with its output.

### 3.3 State how certain each field is

- **Applies when:** a reference describes a field of the data model, as `docs/reference/domain-model.md` does. A table of form fields, labels or statuses is exempt.
- **Check:** look in the entry for one of three words: source, assumption or decision.
- **Passes when:** the entry holds one of them. A source says what it backs up, and an assumption says what would settle it.
- **Repair:** add the word and what follows it.

```text
Bad:  Assumption.
Good: Assumption. Needs a requirement for closing a scenario.
```

### 3.4 Describe, and only describe, in a reference

- **Applies when:** a file in `docs/reference/`, or a section under **What things mean**.
- **Check:** look for a verb in the imperative and for an opinion.
- **Passes when:** the section holds neither. The certainty from rule 3.3 is description, and it stays.
- **Repair:** move the instruction to a section under **How to**, or to a file in `docs/instructions/`.

### 3.5 Open a reference with its shape

- **Applies when:** a reference, and every group inside it.
- **Check:** read the first sentence.
- **Passes when:** the sentence says what the reader is looking at and how it is divided. Every group opens with one line about what the group is.
- **Repair:** write that sentence. A table of 43 columns gets one line per database table.

```text
Bad:  This document contains the concepts of the domain.
Good: Sixteen concepts, falling into three parts.
```

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
