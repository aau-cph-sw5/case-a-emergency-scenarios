// Loads multilingual-e5 in-process with Transformers.js (ONNX on the CPU), so
// incident text never leaves the server. @huggingface/transformers is not a
// dependency yet: install it to use e5. It is loaded on the first call, so the
// BM25 default works without it. The model is downloaded on first use and
// cached; pin `revision` to a commit hash so the scores cannot change.
import type { Embedder } from "./e5-confidence.js";

export const E5_MODEL = "Xenova/multilingual-e5-large";

// A specifier in a variable keeps TypeScript from requiring the package.
const TRANSFORMERS = "@huggingface/transformers";

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist(): unknown }>;

type Transformers = {
  pipeline(
    task: "feature-extraction",
    model: string,
    options: { revision: string; dtype: "fp32"; device: "cpu" },
  ): Promise<Extractor>;
};

export async function loadE5Embedder({
  model = process.env.E5_MODEL ?? E5_MODEL,
  revision = process.env.E5_REVISION ?? "main",
}: { model?: string; revision?: string } = {}): Promise<Embedder> {
  const { pipeline } = (await import(TRANSFORMERS)) as Transformers;
  const extractor = await pipeline("feature-extraction", model, {
    revision,
    dtype: "fp32",
    device: "cpu",
  });
  return async (texts) => {
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    return output.tolist() as number[][];
  };
}
