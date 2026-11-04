module.exports = {
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
      clearMocks: true,
    },
  ],
};
