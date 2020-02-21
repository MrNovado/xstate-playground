import sample from "lodash.sample";
import { Machine, assign, sendParent, AnyEventObject } from "xstate";

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
export const ticTacToeSimpleActorMachine = Machine<
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
