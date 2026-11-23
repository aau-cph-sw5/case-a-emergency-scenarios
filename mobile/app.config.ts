import type { ConfigContext, ExpoConfig } from "expo/config";

try {
  process.loadEnvFile(new URL("../.env", import.meta.url));
} catch (error) {
  console.warn("Failed to load root .env:", error);
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
