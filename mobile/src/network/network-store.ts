import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  clearNetwork,
  loadNetwork,
  saveNetwork,
} from "../../../shared/network/cache";

export const networkStore = {
  load: () => loadNetwork(AsyncStorage),
  save: (network: Parameters<typeof saveNetwork>[1]) =>
    saveNetwork(AsyncStorage, network),
  clear: () => clearNetwork(AsyncStorage),
};
