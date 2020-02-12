import { Machine } from "xstate";

export const binaryToggleMachine = Machine({
    id: "binaryToggleMachine",
    initial: "relaxed",
    states: {
        relaxed: {
            on: {
                TOGGLE: "toggled",
            },
        },
        toggled: {
            on: {
                TOGGLE: "relaxed",
            },
        },
    },
});

export const ternaryToggleMachine = Machine({
    id: "ternaryToggleMachine",
    initial: "undefined",
    states: {
        undefined: {
            on: {
                ENABLE: "relaxed",
            },
        },
        relaxed: {
            on: {
                TOGGLE: "toggled",
            },
        },
        toggled: {
            on: {
                TOGGLE: "relaxed",
            },
        },
    },
});

export const progressiveToggleMachine = Machine({
    id: "progressiveToggleMachine",
    initial: "",
    states: {
        disabled: {},
        enabled: {},
        pending: {},
        resolved: {},
        rejected: {},
    },
});
