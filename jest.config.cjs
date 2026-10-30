module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/tests/jest/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/tests/jest/setup.ts"],
  clearMocks: true,
};
