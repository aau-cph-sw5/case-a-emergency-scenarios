import { render, screen } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { LiveStatusBar } from "../../web/src/components/LiveStatusBar";
import { LiveDataContext } from "../../web/src/data/liveData";


describe("LiveStatusBar", () => {
    it ("shows nothing while no scenario is active", () => {
        const value = {
        live: {
            activations: [],
            scenarios: null,
            isConnected: true,
            isLoading: false,
            lastUpdatedAt: new Date(),
            error: null,
            scenariosError: null,
            reloadScenarios: () => {},
        },
        loadScenario: async () => {
            throw new Error("not needed in test.");
        },
    };
        render(
            <LiveDataContext value={value}>
                <LiveStatusBar />
            </LiveDataContext>
    );
        expect(screen.toJSON()).toBeNull();
    });
});