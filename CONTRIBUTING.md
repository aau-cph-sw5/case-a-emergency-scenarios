# Sådan arbejder vi i dette repo

## Konventioner

Ingen tjek fanger disse for dig.

- Altid PR til `dev`.
- Opret branch fra issuet: åbn issuet → højre sidebar → **Create a branch**.
- Del PR'en op, hvis den overstiger 400 ændrede linjer.
- Tjek for reviews dagligt. `CODEOWNERS` sætter automatisk folk på.
- Skriv issue-titlen, så den kan forstås uden at åbne issuet.
- Flyt dit issue til **In progress**, når du starter. Til **In review**, når du åbner en PR. Til **Done**, når PR'en er merget og hvert acceptkriterium er opfyldt.

## Hvis du skal

| … | Åbn |
|---|---|
| oprette eller flytte et issue | [`docs/issue-workflow.md`](docs/issue-workflow.md) |
| forstå hvorfor et tjek er rødt, eller har en idé til automatisering | [`docs/automation.md`](docs/automation.md) |
| tegne et diagram | [`docs/diagrams.md`](docs/diagrams.md) |
| vide hvad et felt i et scenarie betyder | [`docs/domain-model.md`](docs/domain-model.md) |
| vide hvorfor noget er, som det er | [`docs/adr/`](docs/adr/) |
| skrive et sprint- eller mødedokument | [`docs/templates/`](docs/templates/) |

## Hvor du lægger nye filer

```text
contracts/      grænseflader, andre hold bygger imod. Versioneret
fixtures/       opdigtede test-data. Aldrig noget fra Metro Service
docs/sprints/   udfyldte referater, ét sæt per sprint
.github/        PR-skabelon og automatiske tjek
```

## Semester-processen

[Semester-dokumentationen](https://github.com/aau-cph-sw5/semester-docs).
