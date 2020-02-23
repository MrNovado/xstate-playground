import { Machine } from "xstate";

interface BinarySchema {
    states: {
        relaxed: {};
        toggled: {};
    };
}

type BinaryEvent = { type: "TOGGLE" };

export const binaryToggleMachine = Machine<
    undefined,
    BinarySchema,
    BinaryEvent
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

type TernaryEvent = { type: "ENABLE" } | { type: "TOGGLE" };

export const ternaryToggleMachine = Machine<
    undefined,
    TernarySchema,
    TernaryEvent
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

type ProgressiveEvent = { type: "" }

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
