# Create an issue

Naming and titles live in [`CONTRIBUTING.md`](../CONTRIBUTING.md).
Statuses and the link to a pull request live in [`working-on-issue.md`](working-on-issue.md).

## How to

### Pick the board

| Board | What lives here | Address |
|---|---|---|
| Case A. Emergency Scenarios | The product backlog: issues named `MET-A-<nr>`, and their sub-issues | [projects/3](https://github.com/orgs/aau-cph-sw5/projects/3) |
| Management | Managing the project: issues named `MAN-A-<nr>`. Repo and tooling setup, meeting notes, presentations | [projects/10](https://github.com/orgs/aau-cph-sw5/projects/10) |

**When the issue fits neither board:** ask Mathias K before you create it.

### Create the issue

```bash
gh issue create --web
```

1. Run the command. The browser opens on the template picker.
2. Pick the template. [Templates](#templates-what-each-one-is-for-and-what-it-sets) lists what each one is for.
3. Fill in the fields. [Fill in `Acceptkriterier`](#fill-in-acceptkriterier) and [Pick a `Størrelse`](#pick-a-størrelse) cover those two fields.
4. In the right sidebar, click **Projects** and select the board you picked.
5. Click **Create**.

A sub-issue needs no board from you. Both boards add a sub-issue on their own when its parent is on the board.

**When no template fits:** ask Nikolaj before you create the issue.

**When you cannot pick a value in `Epic`, `Track (ejerskab)`, `Type`, `Prioritet (MoSCoW)` or `Herkomst`:** ask PO.

### Fill in `Acceptkriterier`

One checkbox per criterion.

```text
- [ ] <what happens>, <threshold with a number>, measured <where, and under what load>.
- [ ] <number> participants <do the task>, and <what is measured> is reported.
```

1. Copy a line. When the criterion measures the software, such as how fast a steward's phone shows a scenario, copy the `<what happens>` line. When the criterion measures a person, such as how fast a steward finds the right answer, copy the `<number> participants` line.
2. Fill in the angle brackets.
3. Describe one test run that your line fails. `within 3 seconds, with 25 clients connected` fails when the steward's phone shows the scenario after 5 seconds. `clearly marked` fails in no test run, because nobody can point at a screen and settle that it is unmarked.

**When no test run fails your line:** the line is not a criterion yet, and the requirement is about a person. Write it on the `<number> participants` line.

**When the number of participants is not yours to pick:** bring it to refinement, the meeting before a sprint where the team splits and sizes items.

The two template lines filled in, from the backlog:

> `MET-A-004`: A scenario activated by an operator is reflected on a connected steward client **within 3 seconds at the 95th percentile**, measured **on staging with 25 simulated clients connected**.

> `MET-A-027`: At least eight participants are tested, and the population is stated honestly including where students stood in for stewards. Time to correct answer and error rate are reported with the number of participants.

### Pick a `Størrelse`

You cannot pull an `XL` or `XXL` item into a sprint, so split the item before you pick either size. The hub split story A2.3, an `XL`, into `MET-A-003` (the contract), `MET-A-004` (propagation) and `MET-A-006` (reconnection).

| Size | Corresponds to |
|---|---|
| `S` | About one day for one person |
| `M` | Two to three days for a pair |
| `L` | Most of a sprint for a pair, or about half a sprint for the team |
| `XL` | A whole sprint for the whole team |
| `XXL` | Larger than a sprint |

The sizes come from the hub's [`CONVENTIONS.md`](https://github.com/aau-cph-sw5/semester-docs/blob/main/CONVENTIONS.md).

**When the work takes less than a day:** the form has no `XS`. The work is a task inside an item, so create it with the template Sub-issue / Task.

**When nobody can size it below `L`:** the team does not understand the item yet. Create a Product Backlog Item with `Type` set to `spike` and an agreed deadline, as `MET-A-001` was. The spike clarifies the problem, and then you size the item again.

### Write a checklist

1. Put `- [ ] ` in front of each point in the description.
2. Once the point is done, click its box in the issue. The text becomes `- [x]`.

### Turn a checklist point into a sub-issue

1. Hover over the point in the issue.
2. Click `...` to the right of the point.
3. Select **Convert to sub-issue**.

![The menu behind ... on a checklist point: Move up, Move down, Convert to issue, Convert to sub-issue](images/convert-to-sub-issue.png)

## What things mean

### Templates: what each one is for, and what it sets

Three templates, one row each. The form shows the field names in Danish, and the table quotes them as they appear on the form.

| Template | What it is for | Labels it sets | Fields it requires |
|---|---|---|---|
| Product Backlog Item | A new backlog item of any `Type`: `feature`, `contract`, `tech`, `data`, `compliance`, `evaluation` or `spike` | `case:A` | `User story`, `Acceptkriterier`, `Epic`, `Track (ejerskab)`, `Type`, `Størrelse`, `Prioritet (MoSCoW)`, `Herkomst` |
| Sub-issue / Task | A piece of work under an existing item | `case:A` | `Beskrivelse`, `Track` |
| Defect Report | A defect in the Case A solution | `case:A`, `type:tech` | `Beskrivelse`, `Trin til at reproducere`, `Forventet adfærd`, `Track (hvor hører fejlen hjemme)`, `Alvorlighed` |
