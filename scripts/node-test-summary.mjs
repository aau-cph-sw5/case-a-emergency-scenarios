// Node emits per-file summaries as well as a final summary without a file.
export default async function* (source) {
  for await (const event of source) {
    if (event.type === "test:summary" && !event.data.file) {
      yield JSON.stringify(event.data);
    }
  }
}
