import type { Tokenize } from "./types.js";

// Stand-in until the Danish tokenizer from #354 is ready. Lowercases and
// splits on anything that isn't a-z, 0-9 or æøå, so letters such as é or ü
// act as separators ("café" becomes "caf").
export const simpleTokenize: Tokenize = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9æøå]+/)
    .filter(Boolean);
