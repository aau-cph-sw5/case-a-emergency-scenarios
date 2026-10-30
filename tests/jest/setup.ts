import { configure } from "@testing-library/react-native";

// CI starts without Jest's transform cache, so the first render of a screen
// compiles its modules on the fly and can take well over a second. The
// default 1 s wait for findBy* and waitFor made those tests fail on CI only.
configure({ asyncUtilTimeout: 5000 });
