export type Crossover = {
  lineGroup: "M1/M2" | "M3/M4";
  between: [string, string];
};

const crossovers: Crossover[] = [
  ...(
    [
      ["VAN", "FL"],
      ["FB", "FOR"],
      ["KN", "KGN"],
      ["LGP", "ØSV"],
      ["AMS", "FEØ"],
      ["ISB", "UNI"],
      ["KHS", "BC"],
      ["ØRE", "VEA"],
      ["KSA", "CPH"],
    ] as [string, string][]
  ).map((between): Crossover => ({ lineGroup: "M1/M2", between })),
  ...(
    [
      ["NEL", "MOP"],
      ["EBR", "HOL"],
      ["NØ", "NØR"],
      ["TRI", "KK"],
      ["NHT", "ORK"],
    ] as [string, string][]
  ).map((between): Crossover => ({ lineGroup: "M3/M4", between })),
];

export function getCrossovers(): readonly Crossover[] {
  return crossovers;
}
