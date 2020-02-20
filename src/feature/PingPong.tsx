import React from "react";
import {
    Machine,
    assign,
    spawn,
    send,
    sendParent,
    AnyEventObject,
    Interpreter,
} from "xstate";
import { useMachine } from "@xstate/react";

const child = Machine({
    initial: "await",
    states: {
        await: { on: { PING: "message" } },
        message: {
            entry: [sendParent("PONG", { delay: 500 })],
            on: { "": "await" },
        },
    },
});

const parent = Machine(
    {
        context: {
            ref: {} as Interpreter<any, any, any, any>,
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
                ref: () => spawn(child, "child"),
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
