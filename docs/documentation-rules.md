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

Et dokument, man **læser**, holdes under 100 linjer. Over 150 kræver det en indholdsfortegnelse, og så er det ikke en huskeseddel længere.

Et dokument, man **slår op i**, har ingen grænse, men skal være komplet. Et hul får læseren til at tro, at tingen ikke findes.

Tre til syv linjer per afsnit. Korte ord, kom til sagen, stop så.

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

## Form

| Indholdet er | Brug |
|---|---|
| Et opslag med tre eller flere oplysninger per indgang | Tabel |
| Et opslag med kun navn og betydning | Liste med `**navn**: betydning` |
| Handlinger i rækkefølge | Nummereret liste |
| En kommando | Indrammet kodeblok med sproget angivet |

Definitionslister virker ikke i GitHubs markdown. Brug `**navn**: betydning`.

## Hvad der skal stå

I et opslagsværk: beskriv, og kun beskriv. Ingen holdning, ingen fortolkning, ingen instruktion.

I en fremgangsmåde: skriv klik-vejen eller kommandoen ud, og antag nul forhåndsviden om GitHub. Sig hvilken side man starter fra.

Giv hvert begreb én linje: navnet først, derefter betydningen.

En sætning, der kun findes for at forbinde to andre sætninger, skal ud. Et opslagsværk læses aldrig forfra.

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
