// snowball-stemmers ships without types; only the parts the scenario
// suggestion uses are declared here.
declare module "snowball-stemmers" {
  type Stemmer = { stem(word: string): string };
  const snowball: {
    newStemmer(language: string): Stemmer;
    algorithms(): string[];
  };
  export default snowball;
}
