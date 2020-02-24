import sample from "lodash.sample";
import { Machine, assign, spawn, send, Actor, Spawnable } from "xstate";

import {
    ticTacToeSimpleActorMachine,
    ticTacToeGreedyActorMachine,
    TicTacToeSimpleActorMachineEvent,
} from "./TicTacToe.machine.actor";

type TicTacToeMachineActorTypes = "greedy" | "simple";
type TicTacToeMachineActorTypesContext = [
    TicTacToeMachineActorTypes,
    TicTacToeMachineActorTypes,
];
const ticTacToeMachineActorTypes: ["greedy", "simple"] = ["greedy", "simple"];

interface TicTacToeMachineContext {
    actorTypes: TicTacToeMachineActorTypesContext;
    actor1Ref: Actor;
    actor2Ref: Actor;
    field: ("x" | "0" | null)[];
    // win-combo makes sence only as a computed state;
    // or at the very least -- as a local context of the finale-state;
    // (no idea how to type local context though...)
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
    | TicTacToeSimpleActorMachineEvent
    | { type: "START" }
    | { type: "CONTINUE"; turnOrder: "x" | "0" }
    | { type: "END"; winCombo: number[] | null }
    | { type: "RETRY" }
    | {
          type: "BEHAVIOR";
          actor: "x" | "0";
          actorType: TicTacToeMachineActorTypes;
      }
    | { type: "__ignore__" };

export const ticTacToeMachine = Machine<
    TicTacToeMachineContext,
    TicTacToeMachineSchema,
    TicTacToeMachineEvent
>(
    {
        id: "ticTacToeMachine",
        initial: "init",
        context: {
            actorTypes: [
                sample(ticTacToeMachineActorTypes),
                sample(ticTacToeMachineActorTypes),
            ] as TicTacToeMachineActorTypesContext,
            // asserting an actor here
            // because it will be the first thing we'll create
            // also https://github.com/davidkpiano/xstate/issues/849
            actor1Ref: {} as Actor,
            actor2Ref: {} as Actor,
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
                                on: {
                                    TURN_MADE: [
                                        {
                                            target: "#evaluate",
                                            cond: (
                                                { field },
                                                { selectedIndex },
                                            ) => field[selectedIndex] === null,
                                        },
                                        {
                                            target: "actor1",
                                        },
                                    ],
                                },
                            },
                            actor2: {
                                entry: "letActor2Play",
                                on: {
                                    TURN_MADE: [
                                        {
                                            target: "#evaluate",
                                            cond: (
                                                { field },
                                                { selectedIndex },
                                            ) => field[selectedIndex] === null,
                                        },
                                        {
                                            target: "actor2",
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    evaluate: {
                        id: "evaluate",
                        entry: ["writeActorTurn", "continueOrEnd"],
                        on: {
                            CONTINUE: [
                                {
                                    target: "turn.actor1",
                                    cond: (_context, { turnOrder }) =>
                                        turnOrder === "x",
                                },
                                {
                                    target: "turn.actor2",
                                    cond: (_context, { turnOrder }) =>
                                        turnOrder === "0",
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
        on: {
            BEHAVIOR: { actions: ["changeBehavior", "createActors"] },
        },
    },
    {
        actions: {
            cleanState: assign<TicTacToeMachineContext, TicTacToeMachineEvent>({
                field: [null, null, null, null, null, null, null, null, null],
                winCombo: () => {
                    console.group("Round");
                    return null;
                },
            }),
            changeBehavior: assign<
                TicTacToeMachineContext,
                TicTacToeMachineEvent
            >({
                actorTypes: ({ actorTypes }, event) => {
                    const newTypes =
                        event.type === "BEHAVIOR"
                            ? ([
                                  event.actor === "x"
                                      ? event.actorType
                                      : actorTypes[0],
                                  event.actor === "0"
                                      ? event.actorType
                                      : actorTypes[1],
                              ] as TicTacToeMachineActorTypesContext)
                            : actorTypes;
                    return newTypes;
                },
            }),
            createActors: assign<
                TicTacToeMachineContext,
                TicTacToeMachineEvent
            >({
                // https://github.com/davidkpiano/xstate/issues/849
                actor1Ref: ({ actorTypes }) =>
                    spawn(
                        (actorTypes[0] === "simple"
                            ? ticTacToeSimpleActorMachine
                            : ticTacToeGreedyActorMachine) as Spawnable,
                        "actor1",
                    ),
                actor2Ref: ({ actorTypes }) =>
                    spawn(
                        (actorTypes[1] === "simple"
                            ? ticTacToeSimpleActorMachine
                            : ticTacToeGreedyActorMachine) as Spawnable,
                        "actor2",
                    ),
            }),

            letActor1Play: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field }) => ({
                    type: "PLAY",
                    field,
                    role: "x",
                }),
                {
                    to: ({ actor1Ref }) => actor1Ref,
                },
            ),
            letActor2Play: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field }) => ({
                    type: "PLAY",
                    field,
                    role: "0",
                }),
                { to: ({ actor2Ref }) => actor2Ref },
            ),

            // TURN_MADE -begin
            writeActorTurn: assign<
                TicTacToeMachineContext,
                TicTacToeMachineEvent
            >({
                field: ({ field }, event) =>
                    event.type === "TURN_MADE"
                        ? [
                              ...field.slice(0, event.selectedIndex),
                              getTurnOrder(field),
                              ...field.slice(
                                  event.selectedIndex + 1,
                                  field.length,
                              ),
                          ]
                        : field,
            }),
            continueOrEnd: send<TicTacToeMachineContext, TicTacToeMachineEvent>(
                ({ field }, event) => {
                    if (event.type !== "TURN_MADE") {
                        return { type: "__ignore__" };
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
                        return {
                            type: "CONTINUE",
                            turnOrder: getTurnOrder(field),
                        };
                    }
                },
            ),
            // TURN_MADE -end

            assignWin: assign<TicTacToeMachineContext, TicTacToeMachineEvent>({
                winCombo: ({ winCombo }, event) => {
                    console.groupEnd();
                    return event.type === "END" ? event.winCombo : winCombo;
                },
            }),
        },
    },
);

export function getTurnOrder(field: ("x" | "0" | null)[]) {
    return field.filter(v => v === null).length % 2 === 0 ? "0" : "x";
}
