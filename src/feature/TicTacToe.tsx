import sample from "lodash.sample";
import React from "react";
import {
    Machine,
    assign,
    spawn,
    send,
    sendParent,
    Spawnable,
    Interpreter,
    Actor,
    AnyEventObject,
} from "xstate";
import { useMachine } from "@xstate/react";

type TicTacToeSimpleActorMachineContext = {
    indexesToChooseFrom: number[];
};

interface PLAY extends AnyEventObject {
    type: "PLAY";
    indexesToChooseFrom: number[];
}

interface TURN_MADE extends AnyEventObject {
    type: "TURN_MADE";
    selectedIndex: number;
}

type TicTacToeSimpleActorMachineActions = PLAY | TURN_MADE;

// it can literally be made as a simple callback-machine (single state),
// but we assume the makingTurn-state is overly complicated (will take some work)
// for the sake of exploring the actor pattern
const ticTacToeSimpleActorMachine: Spawnable = Machine<
    TicTacToeSimpleActorMachineContext,
    TicTacToeSimpleActorMachineActions
>(
    {
        id: "ticTacToeSimpleActorMachine",
        initial: "idle",
        context: {
            indexesToChooseFrom: [0, 1, 2, 3, 4, 5, 6, 7, 8],
        },
        states: {
            idle: {
                // entry: console.warn,
                on: {
                    PLAY: {
                        target: "makingTurn",
                        actions: [/*console.warn,*/ "receiveGameOptions"],
                    },
                },
            },
            makingTurn: {
                entry: "turn",
                on: { "": "idle" },
            },
        },
        // entry: console.warn,
    },
    {
        actions: {
            receiveGameOptions: assign({
                indexesToChooseFrom: (_context, event) =>
                    event.type === "PLAY" ? event.indexesToChooseFrom : [-1],
            }),
            turn: context =>
                sendParent<TicTacToeSimpleActorMachineContext, TURN_MADE>(
                    {
                        type: "TURN_MADE",
                        selectedIndex: sample(context.indexesToChooseFrom),
                    },
                    { delay: 500 },
                ),
        },
    },
);

type TicTacToeMachineContext = {
    actor1Ref: Interpreter<any, any, any, any>;
    actor2Ref: Interpreter<any, any, any, any>;
    turnOrder: "actor1" | "actor2";
    field: ("x" | "0" | null)[];
};

const ticTacToeMachine = Machine<TicTacToeMachineContext>(
    {
        id: "ticTacToeMachine",
        initial: "init",
        context: {
            // asserting an actor here
            // because it will be the first thing we'll create
            actor1Ref: {} as Interpreter<any, any, any, any>,
            actor2Ref: {} as Interpreter<any, any, any, any>,
            turnOrder: "actor1", // might be an inner context of play-state
            field: [null, null, null, null, null, null, null, null, null],
        },
        states: {
            init: {
                entry: "createActors",
                on: { START: "play" },
            },
            play: {
                id: "play",
                initial: "turn",
                states: {
                    turn: {
                        initial: "actor1",
                        states: {
                            actor1: {
                                entry: "letActor1Play",
                                on: { TURN_MADE: "#evaluate" },
                            },
                            actor2: {
                                entry: "letActor2Play",
                                on: { TURN_MADE: "#evaluate" },
                            },
                        },
                    },
                    evaluate: {
                        id: "evaluate",
                        entry: [
                            "writeActorTurn",
                            "switchTurn",
                            "continueOrEnd",
                        ],
                        on: {
                            CONTINUE: [
                                {
                                    target: "turn.actor1",
                                    cond: (_context, { turnOrder }) =>
                                        turnOrder === "actor1",
                                },
                                {
                                    target: "turn.actor2",
                                    cond: (_context, { turnOrder }) =>
                                        turnOrder === "actor2",
                                },
                            ],
                            END: "#finale",
                        },
                    },
                },
            },
            finale: {
                id: "finale",
                type: "final",
                entry: "congratulate",
            },
        },
    },
    {
        actions: {
            createActors: assign<TicTacToeMachineContext>({
                // https://github.com/davidkpiano/xstate/issues/849
                actor1Ref: () => spawn(ticTacToeSimpleActorMachine, "actor1"),
                actor2Ref: () => spawn(ticTacToeSimpleActorMachine, "actor2"),
            }),

            letActor1Play: ({ actor1Ref, field }) =>
                send<TicTacToeMachineContext, any>(
                    {
                        type: "PLAY",
                        indexesToChooseFrom: field
                            .map((value, index) =>
                                value === null ? index : null,
                            )
                            .filter(v => v !== null) as number[],
                    },
                    { to: "actor1" },
                ),
            letActor2Play: ({ actor2Ref, field }) =>
                send<TicTacToeMachineContext, PLAY>(
                    {
                        type: "PLAY",
                        indexesToChooseFrom: field
                            .map((value, index) =>
                                value === null ? index : null,
                            )
                            .filter(v => v !== null) as number[],
                    },
                    { to: actor2Ref },
                ),

            writeActorTurn: assign({
                // TURN_MADE
                field: ({ field, turnOrder }, { selectedIndex }) => [
                    ...field.slice(0, selectedIndex),
                    turnOrder === "actor1" ? "x" : "0",
                    ...field.slice(selectedIndex + 1, field.length),
                ],
            }),
            switchTurn: assign({
                turnOrder: ({ turnOrder }) =>
                    turnOrder === "actor1" ? "actor2" : "actor1",
            }),
            continueOrEnd: ({ field, turnOrder }) => {
                const hasFreeSpace = field.find(value => value === null);
                if (hasFreeSpace) {
                    send({ type: "CONTINUE", turnOrder });
                } else {
                    send("END");
                }
            },

            congratulate: context =>
                console.info("Game ended, did someone win?", context),
        },
    },
);

const child = Machine({
    initial: "await",
    states: {
        await: { on: { PING: "message" } },
        message: { entry: [sendParent("PONG")], on: { "": "await" } },
    },
});

const parent = Machine(
    {
        initial: "spawn",
        states: {
            spawn: {
                entry: assign({ ref: () => spawn(child, "child") }),
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
            // note: this wont work!
            // ping: () => send("PING", { to: "child" }),
            // but this works!
            ping: send("PING", { to: "child" }),
            pong: () => console.info("pong received!")
        },
    },
);

export default function TicTacToe() {
    const [state, send] = useMachine(ticTacToeMachine);
    const [ping, pingSend] = useMachine(parent);
    return (
        <div className="v-list-1">
            <div className="v-list-1">
                {state.context.field.map((cell, index) => (
                    <div key={index}>{cell}</div>
                ))}
            </div>
            <button onClick={() => send("START")}>START</button>
            <button onClick={() => pingSend("PING")}>PING</button>
        </div>
    );
}
