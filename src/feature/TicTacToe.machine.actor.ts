import sample from "lodash.sample";
import { Machine, assign, sendParent } from "xstate";

interface TicTacToeSimpleActorMachineSchema {
    states: {
        idle: {};
        makingTurn: {};
    };
}

interface TicTacToeSimpleActorMachineContext {
    field: ("x" | "0" | null)[];
}

export type TicTacToeSimpleActorMachineActions =
    | { type: "PLAY"; field: ("x" | "0" | null)[] }
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
            field: [null, null, null, null, null, null, null, null, null],
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
                field: ({ field }, event) =>
                    event.type === "PLAY" ? event.field : field,
            }),
            turn: sendParent(
                ({ field }: TicTacToeSimpleActorMachineContext) => ({
                    type: "TURN_MADE",
                    selectedIndex: sample(
                        field
                            .map((value, index) =>
                                value === null ? index : null,
                            )
                            .filter(v => v !== null) as number[],
                    ),
                }),
                { delay: 300 },
            ),
        },
    },
);
