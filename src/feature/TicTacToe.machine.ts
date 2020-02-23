import { Machine, assign, spawn, send, Actor, Spawnable } from "xstate";

import {
    ticTacToeSimpleActorMachine,
    TicTacToeSimpleActorMachineActions,
} from "./TicTacToe.machine.actor";

interface TicTacToeMachineContext {
    actor1Ref: Actor;
    actor2Ref: Actor;
    turnOrder: "actor1" | "actor2";
    field: ("x" | "0" | null)[];
    winCombo: number[] | null;
}

interface TicTacToeMachineSchema {
    states: {
        init: {};
        play: {
            states: {
                turn: {
                    states: {
                        actor1: {};
                        actor2: {};
                    };
                };
                evaluate: {};
            };
        };
        finale: {};
    };
}

type TicTacToeMachineEvent =
    | TicTacToeSimpleActorMachineActions
    | { type: "START" }
    | { type: "CONTINUE"; turnOrder: "actor1" | "actor2" }
    | { type: "END"; winCombo: number[] | null }
    | { type: "RETRY" }
    | { type: "duck" };

export const ticTacToeMachine = Machine<
    TicTacToeMachineContext,
    TicTacToeMachineSchema,
    TicTacToeMachineEvent
>(
    {
        id: "ticTacToeMachine",
        initial: "init",
        context: {
            // asserting an actor here
            // because it will be the first thing we'll create
            // also https://github.com/davidkpiano/xstate/issues/849
            actor1Ref: {} as Actor,
            actor2Ref: {} as Actor,
            turnOrder: "actor1", // might be an inner context of play-state
            field: [null, null, null, null, null, null, null, null, null],
            winCombo: null,
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
                entry: "assignWin",
                on: {
                    RETRY: {
                        target: "play",
                        actions: "cleanState",
                    },
                },
            },
        },
    },
    {
        actions: {
            cleanState: assign<TicTacToeMachineContext, TicTacToeMachineEvent>({
                field: [null, null, null, null, null, null, null, null, null],
                winCombo: null,
            }),
            createActors: assign<
                TicTacToeMachineContext,
                TicTacToeMachineEvent
            >({
                // https://github.com/davidkpiano/xstate/issues/849
                actor1Ref: () =>
                    spawn(ticTacToeSimpleActorMachine as Spawnable, "actor1"),
                actor2Ref: () =>
                    spawn(ticTacToeSimpleActorMachine as Spawnable, "actor2"),
            }),

            letActor1Play: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field }) => ({
                    type: "PLAY",
                    indexesToChooseFrom: field
                        .map((value, index) => (value === null ? index : null))
                        .filter(v => v !== null) as number[],
                }),
                {
                    to: ({ actor1Ref }) => actor1Ref,
                },
            ),
            letActor2Play: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field }) => ({
                    type: "PLAY",
                    indexesToChooseFrom: field
                        .map((value, index) => (value === null ? index : null))
                        .filter(v => v !== null) as number[],
                }),
                { to: ({ actor2Ref }) => actor2Ref },
            ),

            writeActorTurn: assign<
                TicTacToeMachineContext,
                TicTacToeMachineEvent
            >({
                // TURN_MADE
                field: ({ field, turnOrder }, event) =>
                    event.type === "TURN_MADE"
                        ? [
                              ...field.slice(0, event.selectedIndex),
                              turnOrder === "actor1" ? "x" : "0",
                              ...field.slice(
                                  event.selectedIndex + 1,
                                  field.length,
                              ),
                          ]
                        : field,
            }),
            switchTurn: assign<TicTacToeMachineContext, TicTacToeMachineEvent>({
                turnOrder: ({ turnOrder }) => {
                    console.info("turn is made by", turnOrder);
                    return turnOrder === "actor1" ? "actor2" : "actor1";
                },
            }),
            continueOrEnd: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field, turnOrder }, event) => {
                    if (event.type !== "TURN_MADE") {
                        return { type: "duck" };
                    }

                    console.info(field, event.selectedIndex);
                    const combinations = [
                        [0, 1, 2],
                        [3, 4, 5],
                        [6, 7, 8],
                        [0, 3, 6],
                        [1, 4, 7],
                        [2, 5, 8],
                        [0, 4, 8],
                        [2, 4, 6],
                    ];
                    const someCombo = combinations.find(combination => {
                        const [a, b, c] = combination;
                        if (
                            field[a] &&
                            field[a] === field[b] &&
                            field[a] === field[c]
                        ) {
                            return true;
                        }
                        return false;
                    });

                    const hasFreeSpace = field.some(value => value === null);
                    if (someCombo || !hasFreeSpace) {
                        return { type: "END", winCombo: someCombo || null };
                    } else {
                        return { type: "CONTINUE", turnOrder };
                    }
                },
            ),

            assignWin: assign<TicTacToeMachineContext, TicTacToeMachineEvent>({
                winCombo: ({ winCombo }, event) =>
                    event.type === "END" ? event.winCombo : winCombo,
            }),
        },
    },
);
