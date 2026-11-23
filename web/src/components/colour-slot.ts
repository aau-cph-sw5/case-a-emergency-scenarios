import { createContext } from "react";

// Where the map's colour switch is drawn: the right end of the legend row, so
// the switch sits with the legend it changes. The map owns the choice, so it
// portals into this slot. Null (tests, no dashboard) means: draw below the map.
export const ColourSlotContext = createContext<HTMLElement | null>(null);
// Lives apart from OperatorSections so the map does not pull in its stylesheet.
