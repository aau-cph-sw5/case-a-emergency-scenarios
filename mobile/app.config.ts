import type { ConfigContext, ExpoConfig } from "expo/config";
try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch {
  console.warn(
    "No .env found in the repo root; using API_URL=http://localhost:3000",
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "mobile",
  slug: config.slug ?? "mobile",
  extra: {
    ...config.extra,
    apiUrl: process.env.API_URL || "http://localhost:3000",
  },
});
