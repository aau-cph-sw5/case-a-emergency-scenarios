// A metro station as in docs/scenario-state/stations.json.
export type Station = { code: string; name: string };

// Splits a text into search tokens. The same shape as the ranker's tokenizer
// (#355), so this one can be passed to it directly.
export type Tokenize = (text: string) => string[];

// Codes that are also common Danish words ("for mange", "for længe"). They
// only count as a station when written in capitals.
const AMBIGUOUS_CODES = new Set(["FOR"]);

// A found station is replaced by its position in the station list between
// these marks, so the rest of the text can be split into words without
// losing it, and a later pattern can't match letters inside a mark.
const OPEN = "⟦";
const CLOSE = "⟧";
const TOKEN = new RegExp(`${OPEN}\\d+${CLOSE}|[\\p{L}\\p{N}]+`, "gu");

// Letters and digits on either side mean it's part of a longer word.
// JavaScript's \b doesn't count æ, ø and å as letters, so this is spelled out.
const BEFORE = "(?<![\\p{L}\\p{N}])";
const AFTER = "(?![\\p{L}\\p{N}])";

// Turns Danish text into search tokens (MET-A-019, #354). The same function is
// used for the operator's description and for each scenario's text, so both
// are split the same way:
// 1. Station names (longest first, with an optional genitive "s") and station
//    codes become one token, the code in lowercase: "KN" and "Nørreport" are
//    both "kn". A station counts once per text, so a scenario text that has
//    both a station's code and its name doesn't count it twice.
// 2. The rest is lowercased and split into words. "spor 1" becomes "spor1",
//    so the number can't match other numbers, such as one in a scenario name.
// It depends only on its arguments, so the same text always gives the same
// tokens.
export function createDanishTokenize(stations: readonly Station[]): Tokenize {
  const tokenOf = stations.map((station) => station.code.toLowerCase());
  const byNameLength = stations
    .map((station, index) => ({ ...station, index }))
    .sort((a, b) => b.name.length - a.name.length || a.index - b.index);

  const patterns = [
    // Names first, longest first: "Nørrebros Runddel" before "Nørrebro".
    ...byNameLength.map(({ name, index }) => ({
      index,
      pattern: new RegExp(
        `${BEFORE}${escape(fold(name.toLowerCase()))}s?${AFTER}`,
        "giu",
      ),
    })),
    // Then codes, in any case except the ambiguous ones.
    ...stations.map(({ code }, index) => ({
      index,
      pattern: new RegExp(
        `${BEFORE}${escape(code)}${AFTER}`,
        AMBIGUOUS_CODES.has(code) ? "gu" : "giu",
      ),
    })),
  ];

  return (text) => {
    let marked = fold(text.normalize("NFC"));
    for (const { index, pattern } of patterns) {
      marked = marked.replace(pattern, ` ${OPEN}${index}${CLOSE} `);
    }

    const tokens: string[] = [];
    const seenStations = new Set<string>();
    const words = marked.match(TOKEN) ?? [];
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.startsWith(OPEN)) {
        const station = tokenOf[Number(word.slice(1, -1))];
        if (!seenStations.has(station)) tokens.push(station);
        seenStations.add(station);
        continue;
      }
      const lower = word.toLowerCase();
      const next = words[i + 1];
      if (lower === "spor" && next !== undefined && /^\d+$/.test(next)) {
        tokens.push(`spor${next}`);
        i++;
        continue;
      }
      // A lowercase "for" left here is the ordinary word. As a token it would
      // look like the station, so it is dropped.
      if (AMBIGUOUS_CODES.has(lower.toUpperCase())) continue;
      tokens.push(lower);
    }
    return tokens;
  };
}

// Accents that aren't Danish letters are dropped, so "Allé" matches "alle".
function fold(text: string): string {
  return text.replace(/[éèê]/g, "e").replace(/[ÉÈÊ]/g, "E");
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
