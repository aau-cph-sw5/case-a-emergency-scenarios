import Constants from "expo-constants";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) ?? "";
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
export const apiBaseUrl = devHost
  ? apiUrl.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${devHost}`)
  : apiUrl;
