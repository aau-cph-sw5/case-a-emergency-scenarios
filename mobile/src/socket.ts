import { createSocket } from "../../shared/socket/createSocket";
import { apiBaseUrl } from "./api-base-url";

export const socket = createSocket(apiBaseUrl);
