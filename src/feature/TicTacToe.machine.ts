import {
    Machine,
    assign,
    spawn,
    send,
    Interpreter,
    AnyEventObject,
} from "xstate";

import { ticTacToeSimpleActorMachine } from "./TicTacToe.machine.actor";

type TicTacToeMachineContext = {
    actor1Ref: Interpreter<any, any, any, any>;
    actor2Ref: Interpreter<any, any, any, any>;
    turnOrder: "actor1" | "actor2";
    field: ("x" | "0" | null)[];
    winCombo: number[] | null;
};

export const ticTacToeMachine = Machine<TicTacToeMachineContext>(
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
            cleanState: assign<TicTacToeMachineContext>({
                field: [null, null, null, null, null, null, null, null, null],
                winCombo: null,
            }),
            createActors: assign<TicTacToeMachineContext>({
                // https://github.com/davidkpiano/xstate/issues/849
                actor1Ref: () => spawn(ticTacToeSimpleActorMachine, "actor1"),
                actor2Ref: () => spawn(ticTacToeSimpleActorMachine, "actor2"),
            }),

            letActor1Play: send<TicTacToeMachineContext, AnyEventObject>(
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
            letActor2Play: send<TicTacToeMachineContext, AnyEventObject>(
                ({ field }) => ({
                    type: "PLAY",
                    indexesToChooseFrom: field
                        .map((value, index) => (value === null ? index : null))
                        .filter(v => v !== null) as number[],
                }),
                { to: ({ actor2Ref }) => actor2Ref },
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
                turnOrder: ({ turnOrder }) => {
                    console.info("turn is made by", turnOrder);
                    return turnOrder === "actor1" ? "actor2" : "actor1";
                },
            }),
            continueOrEnd: send<TicTacToeMachineContext, AnyEventObject>(
                ({ field, turnOrder }, { selectedIndex }) => {
                    console.info(field, selectedIndex);
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
                        return { type: "END", winCombo: someCombo };
                    } else {
                        return { type: "CONTINUE", turnOrder };
                    }
                },
            ),

            assignWin: assign({
                winCombo: (_context, event) => event.winCombo,
            }),
        },
    },
);
