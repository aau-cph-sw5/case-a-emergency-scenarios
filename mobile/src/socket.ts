import Constants from "expo-constants";
import { createSocket } from "../../shared/socket/createSocket";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string) ?? "";
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
const socketUrl = devHost
  ? apiUrl.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/, `//${devHost}`)
  : apiUrl;

export const socket = createSocket(socketUrl);
