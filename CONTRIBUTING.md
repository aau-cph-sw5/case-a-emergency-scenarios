# Sådan arbejder vi i dette repo

## Konventioner

### Issues

- Navngiv issuet `MET-A-<nr>` for produktet og `MAN-A-<nr>` for driften af projektet. Nummeret står først i titlen.
- Skriv issue-titlen, så den kan forstås uden at åbne issuet.
- Opret branch fra issuet: åbn issuet → højre sidebar → **Create a branch**. Branchen beholder issuets nummer og titel.
- Flyt dit issue til **In progress**, når du starter, og til **Done**, når PR'en er merget og hvert acceptkriterium er opfyldt. Boardet flytter selv til **In review**.

### Splitting issues

- Træk ikke et issue ind i en sprint, hvis det er større end `L`. Split det først.
- Kan ingen vurdere issuet til under `L`, er det ikke forstået. Lav research med en aftalt deadline, der klarlægger problemet, før du estimerer igen.
- Afhænger ét acceptkriterium af, at et andet er færdigt, er der tale om to issues.
- Har din branch været åben i mere end en uge, var issuet for stort.

### PR's

- Titel: `<type>: <beskrivelse> [<nr>]`, fx `feat: afvis rapporter uden tidsstempel [MET-A-13]`. Typer: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Altid PR til `dev`.
- Merge `dev` ind i din branch, lige før du åbner PR'en: `git fetch origin && git merge origin/dev`.
- Del PR'en op, hvis den overstiger 400 ændrede linjer.
- Ét issue per PR. Finder du en fejl undervejs, bliver den et sub-issue eller sit eget issue.
- Tjek for reviews dagligt. `CODEOWNERS` sætter automatisk folk på.

### Stacked or no stacked PR

- Venter du på, at en anden PR merges, før du kan begynde på dit issue? Brug en stak.
- Er dit arbejde uafhængigt af PR'en, altså rører det ikke de samme filer? Brug ikke en stak. Åbn to PR'er mod `dev` ved siden af hinanden.
- Stabl højst tre, fordi hver gang base-PR'en ændres, skal de stablede PR'er ovenover ændres.

Sådan gør du:

1. Forgren fra den anden PR's branch i stedet for fra `dev`: `git fetch origin && git checkout -b <dit-issue> origin/<den-anden-branch>`
2. Åbn PR'en med den branch som base: `gh pr create --base <den-anden-branch>`
3. Når bunden er merget: skift din PR's base til `dev` — **Edit** ved titlen → vælg `dev`.
4. Merge altid nedefra. Bunden først.

### Docs

- Filnavne: små bogstaver og bindestreger. `scenario-reference-data.md`, ikke `Diagram FINAL 3.drawio`.
- Opret et issue, før du udfylder en sprint-skabelon.
- Opret ikke en fil ud fra en skabelon, før du har noget at skrive i den.
- Opret ikke en mappe til én fil.

## Hvis du skal

| … | Åbn |
|---|---|
| oprette et issue | [`docs/create-issue.md`](docs/create-issue.md) |
| arbejde på et issue, eller slå en status eller visning op | [`docs/working-on-issue.md`](docs/working-on-issue.md) |
| forstå hvorfor et tjek er rødt, eller har en idé til automatisering | [`docs/automation.md`](docs/automation.md) |
| tegne et diagram | [`docs/diagrams.md`](docs/diagrams.md) |
| vide hvad et felt i et scenarie betyder | [`docs/domain-model.md`](docs/domain-model.md) |
| vide hvorfor noget er, som det er | [`docs/adr/`](docs/adr/) |
| skrive et sprint- eller mødedokument | [`docs/templates/`](docs/templates/) |
| skrive eller rette dokumentation, eller bruge en sprogmodel til det | [`docs/documentation-rules.md`](docs/documentation-rules.md) |

## Hvor du lægger nye filer

```text
contracts/      grænseflader, andre hold bygger imod. Versioneret
fixtures/       opdigtede test-data. Aldrig noget fra Metro Service
docs/sprints/   udfyldte referater, ét sæt per sprint
.github/        PR-skabelon og automatiske tjek
```

## Semester-processen

[Semester-dokumentationen](https://github.com/aau-cph-sw5/semester-docs).
