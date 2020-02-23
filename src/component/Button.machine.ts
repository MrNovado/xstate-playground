import { Machine } from "xstate";

interface BinarySchema {
    states: {
        relaxed: {};
        toggled: {};
    };
}

type BinaryEvents = { type: "TOGGLE" };

export const binaryToggleMachine = Machine<
    undefined,
    BinarySchema,
    BinaryEvents
>({
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

interface TernarySchema {
    states: {
        undefined: {};
        relaxed: {};
        toggled: {};
    };
}

type TernaryEvents = { type: "ENABLE" } | { type: "TOGGLE" };

export const ternaryToggleMachine = Machine<
    undefined,
    TernarySchema,
    TernaryEvents
>({
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

interface ProgressiveSchema {
    states: {
        disabled: {};
        enabled: {};
        pending: {};
        resolved: {};
        rejected: {};
    };
}

type ProgressiveEvents = { type: "" }

export const progressiveToggleMachine = Machine<
    undefined,
    ProgressiveSchema,
    any
>({
    id: "progressiveToggleMachine",
    initial: "disabled",
    states: {
        disabled: {},
        enabled: {},
        pending: {},
        resolved: {},
        rejected: {},
    },
});
