import snowball from "snowball-stemmers";

// A metro station as in docs/scenario-state/stations.json.
export type Station = { code: string; name: string };

// Splits a text into search tokens. The same shape as the ranker's tokenizer
// (#355), so this one can be passed to it directly.
export type Tokenize = (text: string) => string[];

// Station tokens start with this, so a plain word can never look like a
// station: "orker" stems to "ork", while Orientkaj is "st:ork".
const STATION_PREFIX = "st:";

// A typo in a station name is accepted when the name is long enough that one
// changed letter is unlikely to turn an ordinary word into it: one edit from 7
// letters, two from 12 letters for a name of one word. The first letter may be
// wrong too, e.g. when it lands on the word before ("mellemN ørreport").
const FUZZY_MIN_LENGTH = 7;
const FUZZY_TWO_EDITS_LENGTH = 12;

// Words that carry no meaning for search: the Danish Snowball stopword list,
// plus "mellem" and "ved", which say where but name no place.
const STOPWORDS = new Set(
  (
    "og i jeg det at en den til er som på de med han af for ikke der var mig " +
    "sig men et har om vi min havde ham hun nu over da fra du ud sin dem os " +
    "op man hans hvor eller hvad skal selv her alle vil blev kunne ind når " +
    "være dog noget ville jo deres efter ned skulle denne end dette mit også " +
    "under have dig anden hende mine alt meget sit sine vor mod disse hvis " +
    "din nogle hos blive mange ad bliver hendes været thi jer sådan mellem ved"
  ).split(" "),
);

const stemmer = snowball.newStemmer("danish");

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
//    codes become one token, "st:" and the code in lowercase: "KN" and
//    "Nørreport" are both "st:kn". Names count in any case, codes only in
//    capitals, since several codes are also Danish words ("for", "van"). A name with a typo still counts
//    ("Nørreprot"). A station counts once per text, so a scenario text that
//    has both a station's code and its name doesn't count it twice.
// 2. The rest is lowercased and split into words. "spor 1" becomes "spor1",
//    so the number can't match other numbers, such as one in a scenario name.
// 3. Stopwords are removed, and the remaining words are stemmed with the
//    Danish Snowball stemmer, so "togene" and "toget" both become "tog".
// It depends only on its arguments, so the same text always gives the same
// tokens.
export function createDanishTokenize(stations: readonly Station[]): Tokenize {
  const tokenOf = stations.map(
    (station) => STATION_PREFIX + station.code.toLowerCase(),
  );
  // The names a typo is checked against, with their number of words.
  const fuzzyNames = stations
    .map((station, index) => {
      const name = fold(station.name.toLowerCase());
      const words = name.split(" ").length;
      const edits =
        words === 1 && name.length >= FUZZY_TWO_EDITS_LENGTH ? 2 : 1;
      return { name, words, edits, index };
    })
    .filter(({ name }) => name.length >= FUZZY_MIN_LENGTH);
  const maxWords = Math.max(1, ...fuzzyNames.map(({ words }) => words));

  // The station a run of n plain words is a typo of, or undefined. The
  // closest name wins; on a tie, the first in the station list.
  const typoOf = (run: string[]) => {
    const text = run.join(" ").toLowerCase();
    let best: { index: number; distance: number } | undefined;
    for (const { name, words, edits, index } of fuzzyNames) {
      if (words !== run.length) continue;
      const distance = Math.min(
        editDistance(text, name),
        text.endsWith("s") ? editDistance(text.slice(0, -1), name) : Infinity,
      );
      if (
        distance <= edits &&
        (best === undefined || distance < best.distance)
      ) {
        best = { index, distance };
      }
    }
    return best?.index;
  };
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
    // Then codes, only in capitals: "FOR" is Forum, "for" is a word.
    ...stations.map(({ code }, index) => ({
      index,
      pattern: new RegExp(`${BEFORE}${escape(code)}${AFTER}`, "gu"),
    })),
  ];

  return (text) => {
    let marked = fold(text.normalize("NFC"));
    for (const { index, pattern } of patterns) {
      marked = marked.replace(pattern, ` ${OPEN}${index}${CLOSE} `);
    }

    const tokens: string[] = [];
    const seenStations = new Set<string>();
    const addStation = (index: number) => {
      const station = tokenOf[index];
      if (!seenStations.has(station)) tokens.push(station);
      seenStations.add(station);
    };
    const words = marked.match(TOKEN) ?? [];
    // Plain words: not a station mark, and not a stopword, so a typo match
    // can't reach across "og" or "i".
    const isPlain = (word: string | undefined) =>
      word !== undefined &&
      !word.startsWith(OPEN) &&
      !STOPWORDS.has(word.toLowerCase());

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word.startsWith(OPEN)) {
        addStation(Number(word.slice(1, -1)));
        continue;
      }
      const lower = word.toLowerCase();
      const next = words[i + 1];
      if (lower === "spor" && next !== undefined && /^\d+$/.test(next)) {
        tokens.push(`spor${next}`);
        i++;
        continue;
      }
      // A station name with a typo: try the longest run of words first.
      let typo: { index: number; length: number } | undefined;
      for (let n = maxWords; n >= 1 && typo === undefined; n--) {
        const run = words.slice(i, i + n);
        if (run.length === n && run.every(isPlain)) {
          const index = typoOf(run);
          if (index !== undefined) typo = { index, length: n };
        }
      }
      if (typo !== undefined) {
        addStation(typo.index);
        i += typo.length - 1;
        continue;
      }
      if (STOPWORDS.has(lower)) continue;
      tokens.push(/^\p{L}+$/u.test(lower) ? stemmer.stem(lower) : lower);
    }
    return tokens;
  };
}

// Accents that aren't Danish letters are dropped, so "Allé" matches "alle".
function fold(text: string): string {
  return text.replace(/[éèê]/g, "e").replace(/[ÉÈÊ]/g, "E");
}

// The number of single-letter edits (insert, delete, change, or swap two
// neighbouring letters) that turn a into b: "nørreprot" is 1 from "nørreport".
function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0,
    ),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + change,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
