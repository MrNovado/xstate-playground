import sample from "lodash.sample";
import React, { useMemo, useEffect } from "react";
import {
    Machine,
    assign,
    spawn,
    send,
    sendParent,
    Interpreter,
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
const ticTacToeSimpleActorMachine = Machine<
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
                on: {
                    PLAY: {
                        target: "makingTurn",
                        actions: "receiveGameOptions",
                    },
                },
            },
            makingTurn: {
                entry: "turn",
                on: { "": "idle" },
            },
        },
    },
    {
        actions: {
            receiveGameOptions: assign({
                indexesToChooseFrom: (_context, event) =>
                    event.type === "PLAY" ? event.indexesToChooseFrom : [-1],
            }),
            turn: sendParent(
                ({
                    indexesToChooseFrom,
                }: TicTacToeSimpleActorMachineContext) => ({
                    type: "TURN_MADE",
                    selectedIndex: sample(indexesToChooseFrom),
                }),
                { delay: 300 },
            ),
        },
    },
);

type TicTacToeMachineContext = {
    actor1Ref: Interpreter<any, any, any, any>;
    actor2Ref: Interpreter<any, any, any, any>;
    turnOrder: "actor1" | "actor2";
    field: ("x" | "0" | null)[];
    winCombo: number[] | null;
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

export default function TicTacToe() {
    const [state, send] = useMachine(ticTacToeMachine);
    const { winCombo, field } = state.context;

    const controls = useMemo(() => {
        switch (true) {
            case state.matches("finale"):
                return <button onClick={() => send("RETRY")}>RETRY</button>;
            case state.matches("init"):
                return <button onClick={() => send("START")}>START</button>;
            default:
                return <button disabled className="opacity-50">IN PROGRESS</button>;
        }
    }, [state]);

    useEffect(
        function congratulate() {
            if (state.matches("finale")) {
                console.info("Game ended!");
                if (winCombo) {
                    const [winCell] = winCombo;
                    const winSymbol = field[winCell];
                    console.info(`${winSymbol} wins!`);
                } else {
                    console.info("It's a draw!", field);
                }
            }
        },
        [state],
    );

    return (
        <div className="v-list-1">
            <div className="grid grid-cols-3">
                {state.context.field.map((cell, index) => (
                    <div
                        className="border h-10 flex flex-col justify-center items-center"
                        style={{
                            backgroundColor:
                                winCombo && winCombo.some(c => c === index)
                                    ? "green"
                                    : "white",
                        }}
                        key={index}>
                        {cell}
                    </div>
                ))}
            </div>
            {controls}
        </div>
    );
}
