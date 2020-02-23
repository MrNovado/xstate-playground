import React from "react";
import { Machine, assign, spawn, send, sendParent, Spawnable, Actor } from "xstate";
import { useMachine } from "@xstate/react";

interface ChildSchema {
    states: {
        await: {};
        message: {};
    };
}

type ChildEvent = { type: "PING" };

const child = Machine<undefined, ChildSchema, ChildEvent>({
    initial: "await",
    states: {
        await: { on: { PING: "message" } },
        message: {
            entry: [sendParent("PONG", { delay: 500 })],
            on: { "": "await" },
        },
    },
});

interface ParentSchema {
    states: {
        spawn: {};
        message: {};
    };
}

type ParentEvent = { type: "PING", to: Actor } | { type: "PONG" };

interface ParentContext {
    // https://github.com/davidkpiano/xstate/issues/849
    ref: Actor;
    countPongs: number;
}

const parent = Machine<ParentContext, ParentSchema, ParentEvent>(
    {
        context: {
            ref: {} as Actor,
            countPongs: 0,
        },
        initial: "spawn",
        states: {
            spawn: {
                entry: "spawnChild",
                on: { "": "message" },
            },
            message: {
                on: {
                    PING: { actions: "ping" },
                    PONG: { actions: "pong" },
                },
            },
        },
    },
    {
        actions: {
            spawnChild: assign({
                ref: () => spawn((child as Spawnable), "child"),
                countPongs: 0,
            }),
            ping: send("PING", { to: ({ ref }) => ref }),
            pong: assign({
                countPongs: ({ countPongs }) => countPongs + 1,
            }),
        },
    },
);

export default function PingPong() {
    const [state, send] = useMachine(parent);
    return (
        <div className="v-list-1">
            <span>Pongs: {state.context.countPongs}</span>
            <button onClick={() => send("PING")}>PING</button>
        </div>
    );
}
