import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import StatusBar from "../../../shared/components/statusBar";
import { box, text } from "../../../shared/Theme";
import { useLiveData } from "../data/liveData";
import { useScenario } from "../data/useScenario";


function useNow(){
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return now;
}

export function LiveStatusBar() {
    const { activations, isConnected, lastUpdatedAt } = useLiveData();
    const activation = activations.at(-1) ?? null;
    const { scenario, error } = useScenario(activation?.scenarioId ?? null);
    const now = useNow();

    if (activation === null) return null;

    if (scenario === null) {
        return (
            <View style={[box, { padding: 16 }]}>
                <Text style={text.body}>{error ?? "Henter scenarie..."}</Text>
            </View>
        );
    }
    const version = scenario.versions.find(
        (v) => v.version === scenario.currentVersion
    );
    return (
        <StatusBar
            state={activation}
            scenarioName={scenario.name}
            requirements={version?.stationRequirements ?? []}
            isConnected={isConnected}
            lastUpdate={lastUpdatedAt?.toISOString() ?? null}
            now={now}
        />
    );
}