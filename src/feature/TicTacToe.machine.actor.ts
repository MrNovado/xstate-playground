import sample from "lodash.sample";
import { Machine, MachineConfig, SendExpr, sendParent } from "xstate";

interface TicTacToeSimpleActorMachineSchema {
    states: {
        playing: {};
    };
}

interface TicTacToeSimpleActorMachineContext {}

export type TicTacToeSimpleActorMachineEvent =
    | { type: "PLAY"; field: ("x" | "0" | null)[]; role: "x" | "0" }
    | { type: "TURN_MADE"; selectedIndex: number }
    | { type: "duck" };

// it can literally be made as a simple callback-machine (single state),
// but we assume the makingTurn-state is overly complicated (will take some work)
// for the sake of exploring the actor pattern
const ticTacToeSimpleActorMachineConfig: MachineConfig<
    TicTacToeSimpleActorMachineContext,
    TicTacToeSimpleActorMachineSchema,
    TicTacToeSimpleActorMachineEvent
> = {
    id: "ticTacToeSimpleActorMachine",
    initial: "playing",
    context: {},
    states: {
        playing: {
            on: {
                PLAY: {
                    actions: "turn",
                },
            },
        },
    },
};

function ticTacToeSimpleActorPlay(
    field: ("x" | "0" | null)[],
    role: "x" | "0",
) {
    const nonOccupiedCount = field.filter(v => v === null).length;
    const takingMagicSpot = field[4] === null && Math.random() > 0.5;

    switch (true) {
        case takingMagicSpot:
            return 4;
        case nonOccupiedCount <= 3:
            return field.findIndex(v => v === null);
        default:
            return sample(
                field
                    .map(function nonOccupiedIndexes(value, index) {
                        return value === null ? index : null;
                    })
                    .filter(function identity(v) {
                        return v !== null;
                    }) as number[],
            ) as number;
    }
}

export const ticTacToeSimpleActorMachine = Machine<
    TicTacToeSimpleActorMachineContext,
    TicTacToeSimpleActorMachineSchema,
    TicTacToeSimpleActorMachineEvent
>(ticTacToeSimpleActorMachineConfig, {
    actions: {
        turn: sendParent(
            // warn: no idea why TS cannot infer it as a SendExpr
            function play(_, event) {
                return event.type === "PLAY"
                    ? {
                          type: "TURN_MADE",
                          // warn: no guard checks for selectedIndex for whatever reason!
                          // supposed to be a number, but wont argue against any other type!?
                          selectedIndex: ticTacToeSimpleActorPlay(
                              event.field,
                              event.role,
                          ),
                      }
                    : { type: "duck" };
            } as SendExpr<
                TicTacToeSimpleActorMachineContext,
                TicTacToeSimpleActorMachineEvent
            >,
            { delay: 300 },
        ),
    },
});

export const ticTacToeGreedyActorMachine = Machine<
    TicTacToeSimpleActorMachineContext,
    TicTacToeSimpleActorMachineSchema,
    TicTacToeSimpleActorMachineEvent
>(ticTacToeSimpleActorMachineConfig, {
    actions: {
        turn: sendParent(
            function play(_, event) {
                switch (event.type) {
                    case "PLAY": {
                        // [0,1,2]
                        // [3,4,5]
                        // [6,7,8]
                        const { field, role } = event;
                        const favouriteSpot = 4;
                        const [
                            preferred1,
                            preferred2,
                            preferred3,
                            preferred4,
                            ...leftover
                        ] = [
                            [3, favouriteSpot, 5],
                            [1, favouriteSpot, 7],
                            [0, favouriteSpot, 8],
                            [2, favouriteSpot, 6],
                            [0, 1, 2],
                            [6, 7, 8],
                            [0, 3, 6],
                            [2, 5, 8],
                        ];

                        const filterNonOccupied = (combos: number[][]) =>
                            combos.filter(
                                combo =>
                                    combo.find(
                                        index =>
                                            field[index] ===
                                            (role === "x" ? "0" : "x"),
                                    ) === undefined,
                            );

                        const weightCombos = (combos: number[][]) => {
                            return combos.reduce((weights, combo) => {
                                return [
                                    ...weights,
                                    combo.reduce(
                                        (weight, index) =>
                                            field[index] === role
                                                ? weight + 1
                                                : weight,
                                        0,
                                    ),
                                ];
                            }, []);
                        };

                        const desideOnIndex = (
                            fallbackIndex: number,
                            combos: number[][],
                        ) => {
                            const nonOccupied = filterNonOccupied(combos);

                            console.log("nonOccupied", nonOccupied);

                            if (nonOccupied.length) {
                                const weights = weightCombos(nonOccupied);
                                const mostWeighted = weights.reduce(
                                    (acc, weight, index, array) =>
                                        weight >
                                        (index === 0 ? acc : array[index - 1])
                                            ? index
                                            : acc,
                                    0,
                                );

                                console.log(
                                    "weights-and-most",
                                    weights,
                                    mostWeighted,
                                );

                                const newIndex = nonOccupied[mostWeighted].find(
                                    index => field[index] === null,
                                );

                                console.log(
                                    "nonOccupied[mostWeighted]",
                                    nonOccupied[mostWeighted],
                                );

                                return newIndex === undefined
                                    ? fallbackIndex
                                    : newIndex;
                            }

                            return fallbackIndex;
                        };

                        console.group(`greedy-${role}`);

                        const favouriteSpotIsFree =
                            field[favouriteSpot] === null;
                        let selectedIndex: number = favouriteSpotIsFree
                            ? favouriteSpot
                            : ticTacToeSimpleActorPlay(field, role);

                        if (field[favouriteSpot] === role) {
                            selectedIndex = desideOnIndex(selectedIndex, [
                                preferred1,
                                preferred2,
                                preferred3,
                                preferred4,
                            ]);
                            // if favourite spot isnt free, then there's little
                            // motivation to play selectively
                        } else if (
                            !favouriteSpotIsFree &&
                            Math.random() > 0.9
                        ) {
                            selectedIndex = desideOnIndex(
                                selectedIndex,
                                leftover,
                            );
                        }

                        console.log(selectedIndex);
                        console.groupEnd();

                        return {
                            type: "TURN_MADE",
                            selectedIndex,
                        };
                    }
                    default:
                        return { type: "duck" };
                }
            } as SendExpr<
                TicTacToeSimpleActorMachineContext,
                TicTacToeSimpleActorMachineEvent
            >,
            { delay: 300 },
        ),
    },
});
