import sample from "lodash.sample";
import { Machine, assign, sendParent } from "xstate";

interface TicTacToeSimpleActorMachineSchema {
    states: {
        idle: {};
        makingTurn: {};
    };
}

interface TicTacToeSimpleActorMachineContext {
    indexesToChooseFrom: number[];
}

export type TicTacToeSimpleActorMachineActions =
    | { type: "PLAY"; indexesToChooseFrom: number[] }
    | { type: "TURN_MADE"; selectedIndex: number };

// it can literally be made as a simple callback-machine (single state),
// but we assume the makingTurn-state is overly complicated (will take some work)
// for the sake of exploring the actor pattern
export const ticTacToeSimpleActorMachine = Machine<
    TicTacToeSimpleActorMachineContext,
    TicTacToeSimpleActorMachineSchema,
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
