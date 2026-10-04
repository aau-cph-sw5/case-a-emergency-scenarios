# Create an issue

Naming and titles live in [`CONTRIBUTING.md`](../CONTRIBUTING.md).
Statuses, views and the link to a pull request live in [`working-on-issue.md`](working-on-issue.md).

## How to

### Pick the board

| Board | What lives here | Address |
|---|---|---|
| Case A. Emergency Scenarios | The product backlog: `MET-A-xxx` and their sub-issues | [projects/3](https://github.com/orgs/aau-cph-sw5/projects/3) |
| Management | Managing the project: repo and tooling setup, meeting notes, presentations | [projects/10](https://github.com/orgs/aau-cph-sw5/projects/10) |

### Create the issue

```bash
gh issue create --web
```

The browser opens on the template picker. Pick a template from the table below and fill in the fields. Every template sets the label `case:A`, and the Defect Report also sets `type:tech`.

The templates are YAML forms, so they cannot be filled in from the terminal. Their field names are in Danish, and the table below uses them as they appear on the form.

| Template | Use it for | Fields it requires |
|---|---|---|
| Product Backlog Item | A new item: feature, technical work, research | `User story`, `Acceptkriterier`, `Epic`, `Track (ejerskab)`, `Type`, `Størrelse`, `Prioritet (MoSCoW)`, `Herkomst` |
| Sub-issue / Task | A piece of work under an existing item | `Beskrivelse`, `Track` |
| Defect Report | A defect in the Case A solution | `Beskrivelse`, `Trin til at reproducere`, `Forventet adfærd`, `Track (hvor hører fejlen hjemme)`, `Alvorlighed` |

### Write a checklist

1. Put `- [ ] ` in front of each point in the description.
2. Click the box in the issue once the point is done. It becomes `- [x]`.

### Turn a checklist point into a sub-issue

1. Hover over the point in the issue.
2. Click `...` to the right of the point.
3. Select **Convert to sub-issue**.

![The menu behind ... on a checklist point: Move up, Move down, Convert to issue, Convert to sub-issue](images/convert-to-sub-issue.png)

## What things mean

### Acceptance criteria

The shape is `Given ... when ... then ...`. Each criterion needs **a measurable threshold** and **the environment it is measured in** — or it is a test with a task, a number of participants and a condition for success.

Each criterion has to be able to **fail**. A criterion that all delivered software satisfies is not a criterion.

Example from the backlog, `MET-A-004`:

> A scenario activated by an operator is reflected on a connected steward client **within 3 seconds at the 95th percentile**, measured **on staging with 25 simulated clients connected**.

The threshold is 3 seconds at the 95th percentile. The environment is staging with 25 simulated clients. Both have to be there.

These phrases cannot fail and are therefore not criteria: `clearly marked`, `visually distinct`, `within a few seconds`, `user-friendly`.

### Sizes

| Size | Corresponds to |
|---|---|
| `XS` | A few hours for one person |
| `S` | About one day for one person |
| `M` | Two to three days for a pair. The typical size of a well-formed item |
| `L` | Most of a sprint for a pair, or about half a sprint for the team |
| `XL` | A whole sprint for the whole team |
| `XXL` | Larger than a sprint |

`XL` and `XXL` must not be pulled into a sprint. Split them first.
