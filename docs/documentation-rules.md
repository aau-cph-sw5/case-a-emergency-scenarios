# Sådan skriver vi dokumentation

Filen er skrevet til at kunne indsættes som prompt, når du bruger en sprogmodel til at skrive eller rette dokumentation her. Giv den hele filen, og bed om et udkast.

Oplever du, at et princip ikke virker i praksis, så foreslå en ændring i et issue. Følg dem indtil da. Strukturen virker kun, hvis den er ens på tværs af filerne.

## Hvilken slags skriver du

| Slags | Test | Hvor den hører |
|---|---|---|
| Konvention | Kan reglen brydes, uden at et værktøj siger noget? | [`CONTRIBUTING.md`](../CONTRIBUTING.md) |
| Fremgangsmåde | Slutter den med, at noget er gjort? | Filen for den flade, du står ved |
| Opslagsværk | Slår du én række op og går igen? | Samme fil, i afsnittet **Hvad betyder** |

Hub'ens regler kopieres ikke. Der linkes, eller det vigtigste skrives ud med et eksempel.

## Længde

**Et opslagsværk skal være komplet.** Det har ingen længdegrænse. Mangler en værdi, en kolonne eller en status, tror læseren at den ikke findes, og så har dokumentet gjort skade. Fuldstændighed slår korthed.

En **guide** holdes under 100 linjer. Over 150 kræver den en indholdsfortegnelse, og så er den ikke en huskeseddel længere. Tallet gælder kun guides.

Tre til syv linjer per afsnit. Korte ord, kom til sagen, stop så.

## Åbn med formen

Begynd et opslagsværk med én sætning om, hvad man kigger på og hvordan det er inddelt. Ikke "dette dokument indeholder", men "seksten begreber, som falder i tre dele".

Giv hver gruppe én linje om hvad den er, før du lister dens indhold. En tabel med 43 kolonner uden en linje per tabel er sværere at bruge, ikke lettere.

## Forklar notationen

Fold hver forkortelse og hvert symbol ud, første gang det bruges. `PK`, `STW`, `CCR`, `0..*` — flere af os har ikke haft faget endnu.

## Rækkefølgen i en linje

Det kendte forrest, det nye til slut. Læseren kommer med et navn, de har set — en status, et mærkat, et felt. Det er det kendte. Sæt det først, og lad betydningen stå til sidst.

Læseren ser de første to ord, cirka 11 tegn. Begynd med det navneord, der bærer betydningen.

Samme form på hver indgang: samme kolonner i samme rækkefølge, hver gang.

```
Godt:    | In review | Boardet | Når pull requesten linkes til issuet |
Dårligt: Boardet flytter selv et issue, når der sker noget i GitHub.
```

## Afsnit skal stå alene

Læseren lander fra en søgning eller et link, ikke fra toppen. Skriv ikke "som nævnt ovenfor".

Ét afsnit, én ting. Står der to, skal det være to afsnit.

## Arbejdsdelingen mellem diagram, tabel og prosa

Har dokumentet et diagram, bærer diagrammet navne, typer og relationer. Gentag dem ikke i en tabel.

Tabellen bærer det, diagrammet ikke kan: hvad noget betyder, hvor det kommer fra, og hvor sikkert det er.

Prosaen bærer det, ingen af dem kan: hvorfor valget blev truffet.

Handlinger i rækkefølge er en nummereret liste. En kommando er en indrammet kodeblok med sproget angivet. Definitionslister virker ikke i GitHubs markdown — brug `**navn**: betydning`.

## Prosa

**Den, der handler, er grundled. Handlingen er udsagnsord.** Find handlingen i sætningen. Er den et navneord på `-ing`, `-ning`, `-else` eller `-tion`, så lav den om til et udsagnsord.

> `Valideringen af fixtures mod schemaet foretages af et script.`
> → `Scriptet validerer fixtures mod schemaet.`

**Nævn den, der gør det.** Passiv skjuler aktøren, og aktøren er netop det, læseren slår op.

> `Mærkatet sættes, når en pull request åbnes.`
> → `Workflowet sætter mærkatet, når du åbner en pull request.`

**Ét stedord, én mulig henvisning.** Står der to navneord i sætningen, så gentag navneordet i stedet for `den`, `det` eller `dette`.

**Betingelsen først.** Så kan læseren springe sætningen over, når betingelsen ikke gælder.

> `GitHub blokerer merge-knappen, hvis branchen er bagud.`
> → `Er branchen bagud, blokerer GitHub merge-knappen.`

**Nævn tingen ved navn**, ikke med en beskrivelse af den. `pr-description-check.yml`, ikke "filen, der tjekker beskrivelsen".

**Tal og navne frem for mængdeord.** `flere`, `ofte`, `typisk` og `en del` siger ingenting.

> `Flere brancher er bagud.`
> → `15 af 17 brancher er bagud.`

## Hvad der skal stå

I et opslagsværk: beskriv, og kun beskriv. Ingen holdning, ingen fortolkning, ingen instruktion.

I en fremgangsmåde: skriv klik-vejen eller kommandoen ud, og antag nul forhåndsviden. Sig hvilken side man starter fra.

Giv hvert begreb én linje: navnet først, derefter betydningen.

En sætning, der kun findes for at forbinde to andre sætninger, skal ud. Et opslagsværk læses aldrig forfra.

**Men "beskriv og kun beskriv" betyder ikke, at du skjuler, hvor sikker du er.** Skriv ved hvert felt, om det er belagt i en kilde, en antagelse, eller en beslutning vi selv har truffet — og ved en antagelse: hvad der skal til for at afklare den. "Antagelse" alene er en etiket. "Antagelse. Kræver et krav om at lukke et scenarie" er en opgave.

Skriv også ved hver kilde, hvad den belægger. Et kildenavn uden det er ubrugeligt, fordi læseren ikke ved, hvad de skal lede efter.

Flytter du en begrundelse til `docs/adr/`, så skriv beslutningen i samme pull request. Ellers er den ikke flyttet, den er væk.

## Generer tabellen fra kilden

Kan en tabel bygges af koden, så gør det. En kolonne-oversigt skrevet af `schema.sql` kan ikke være uenig med skemaet, og en skrevet i hånden driver fra det. Det var sådan en manglende værdi i `station_role` blev fundet.

## Skærmbilleder

Brug dem kun, hvor der ikke findes en kommando. Et skærmbillede forælder, når GitHub laver brugerfladen om, og et forældet billede er mere overbevisende og mere forkert end forældet tekst.

Billederne ligger i `docs/images/`.

## Forældelse

Et forældet dokument er værre end intet dokument. Læseren tror, de har forstået, arbejder videre på en antagelse der var sand engang, og fejlen slipper igennem. Tilliden kommer ikke tilbage.

Ret derfor hvert dokument, din ændring gør forkert, i samme pull request.

## Hvem du skriver til

Dokumentation læses for at blive **mindet om** noget, ikke for at lære det. Skriv til en, der har vidst det og glemt det.

## Skabelon

```markdown
# <Fladen: ét eller to ord>

## Sådan gør du

### <Handlingen i bydeform>

1. <skridt med kommandoen eller klik-vejen skrevet ud>
2. <skridt>

## Hvad betyder

**<det kendte navn>**: <betydningen>

| <det kendte> | <det nye> | <det nye> |
|---|---|---|
```
