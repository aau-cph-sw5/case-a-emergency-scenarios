// react-native-svg loads its touch-sound module only on Android, but the
// bundler still resolves it, and it needs TurboModuleRegistry, which
// react-native-web lacks. The web never calls it, so nothing is exported.
export default {};
