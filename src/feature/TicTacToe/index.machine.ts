import { Machine, assign, spawn, send, Actor, Spawnable } from "xstate";
import { SimpleActorEvent, FIELD } from "./index.common";
import {
    ticTacToeSimpleActorMachine,
    ticTacToeGreedyActorMachine,
} from "./Actor.imperative";
import { declarativePerfectActor as ticTacToePerfectActorMachine } from "./Actor.declarative";

export type TicTacToeMachineActorTypes =
    | "greedy"
    | "simple"
    | "perfect"
    | "player";
type TicTacToeMachineActorTypesContext = [
    TicTacToeMachineActorTypes,
    TicTacToeMachineActorTypes,
];

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
                        chooseFirst: {};
                        actor1: {};
                        actor2: {};
                        player1: {};
                        player2: {};
                    };
                };
                evaluate: {};
            };
        };
        finale: {};
    };
}

type TicTacToeMachineEvent =
    | SimpleActorEvent
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
                "simple",
                "perfect",
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
                        initial: "chooseFirst",
                        states: {
                            chooseFirst: {
                                on: {
                                    "": [
                                        {
                                            target: "player1",
                                            cond: ({ actorTypes }) =>
                                                actorTypes[0] === "player",
                                        },
                                        {
                                            target: "actor1",
                                        },
                                    ],
                                },
                            },
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
                            player1: {
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
                                            target: "player1",
                                        },
                                    ],
                                },
                            },
                            player2: {
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
                                            target: "player2",
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
                                    cond: ({ actorTypes }, { turnOrder }) =>
                                        actorTypes[0] !== "player" &&
                                        turnOrder === "x",
                                },
                                {
                                    target: "turn.actor2",
                                    cond: ({ actorTypes }, { turnOrder }) =>
                                        actorTypes[1] !== "player" &&
                                        turnOrder === "0",
                                },
                                {
                                    target: "turn.player1",
                                    cond: (_, { turnOrder }) =>
                                        turnOrder === "x",
                                },
                                {
                                    target: "turn.player2",
                                    cond: (_, { turnOrder }) =>
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
                actor1Ref: ({ actorTypes }) =>
                    spawn(selectActor(actorTypes[0]), "actor1"),
                actor2Ref: ({ actorTypes }) =>
                    spawn(selectActor(actorTypes[1]), "actor2"),
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
                    spawn(selectActor(actorTypes[0]), "actor1"),
                actor2Ref: ({ actorTypes }) =>
                    spawn(selectActor(actorTypes[1]), "actor2"),
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
                    const someCombo = FIELD.COMBINATIONS.find(combination => {
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

export function isPlayerTurn(
    field: ("x" | "0" | null)[],
    actorTypes: TicTacToeMachineActorTypesContext,
) {
    return actorTypes[getTurnOrder(field) === "x" ? 0 : 1] === "player";
}

function selectActor(actorType: TicTacToeMachineActorTypes): Spawnable {
    switch (actorType) {
        case "greedy":
            return ticTacToeGreedyActorMachine;
        case "perfect":
            return ticTacToePerfectActorMachine;
        case "simple":
        default:
            return ticTacToeSimpleActorMachine;
    }
}
