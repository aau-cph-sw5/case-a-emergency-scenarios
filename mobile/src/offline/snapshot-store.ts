import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSnapshotStore } from "../../../shared/offline/scenario-snapshot";

// The offline copy of the active scenario, kept on the phone (MET-A-005).
export const snapshotStore = createSnapshotStore(AsyncStorage);
