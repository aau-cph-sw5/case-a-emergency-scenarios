module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/jest/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest/setup.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "shared/**/*.{ts,tsx}",
    "!shared/types/**",
    "web/src/**/*.{ts,tsx}",
    "mobile/src/**/*.{ts,tsx}",
    "mobile/App.tsx",
    "mobile/index.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage/jest",
  coverageReporters: ["json"],
};
