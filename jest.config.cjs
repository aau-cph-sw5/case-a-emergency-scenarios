module.exports = {
  collectCoverageFrom: [
    "shared/**/*.{ts,tsx}",
    "!shared/types/**",
    "web/src/**/*.{ts,tsx}",
    "mobile/src/**/*.{ts,tsx}",
    "mobile/App.tsx",
    "!**/*.d.ts",
    "!web/src/main.tsx",
  ],
  coverageDirectory: "coverage/jest",
  coverageReporters: ["json"],
  projects: [
    {
      displayName: "native",
      preset: "jest-expo",
      testMatch: ["<rootDir>/tests/jest/**/*.test.[jt]s?(x)"],
      testPathIgnorePatterns: ["/node_modules/", "\\.web\\.test\\."],
      setupFilesAfterEnv: ["<rootDir>/tests/jest/setup.ts"],
      clearMocks: true,
    },
    {
      preset: "jest-expo/web",
      testMatch: ["<rootDir>/tests/jest/**/*.web.test.[jt]s?(x)"],
      // Same alias as web/vite.config.ts: react-native-web keeps the image
      // registry react-native-svg looks up under its own name.
      moduleNameMapper: {
        "^@react-native/assets-registry/registry$":
          "<rootDir>/node_modules/react-native-web/dist/modules/AssetRegistry",
      },
      clearMocks: true,
    },
  ],
};
