import sample from "lodash.sample";
import { Machine, MachineConfig, SendExpr, sendParent } from "xstate";

/**
 * ============================================================================
 * IMPERATIVE ACTORS
 * ============================================================================
 */

interface TicTacToeSimpleActorMachineSchema {
    states: {
        playing: {};
    };
}

interface TicTacToeSimpleActorMachineContext {}

export type TicTacToeSimpleActorMachineEvent =
    | { type: "PLAY"; field: ("x" | "0" | null)[]; role: "x" | "0" }
    | { type: "TURN_MADE"; selectedIndex: number }
    | { type: "__ignore__" };

// it can literally be made as a simple callback-machine (single state),
// but we assume the playing-state is overly complicated (will take some work)
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
                switch (event.type) {
                    case "PLAY":
                        const { field, role } = event;
                        console.group(`simple-${role}`);
                        const selectedIndex = ticTacToeSimpleActorPlay(
                            field,
                            role,
                        );
                        console.groupEnd();
                        return {
                            type: "TURN_MADE",
                            // warn: no guard checks for selectedIndex for whatever reason!
                            // supposed to be a number, but wont argue against any other type!?
                            selectedIndex,
                        };
                    default:
                        return { type: "__ignore__" };
                }
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
                        return { type: "__ignore__" };
                }
            } as SendExpr<
                TicTacToeSimpleActorMachineContext,
                TicTacToeSimpleActorMachineEvent
            >,
            { delay: 300 },
        ),
    },
});

/**
 * ============================================================================
 * DECLARATIVE ACTORS
 * ============================================================================
 *
 * There seems to be a couple ways of making a declarative ttt-agent:
 *
 * 1. You can describe an entire (min-max or a full) decision tree (which you better be generating)
 * 2. Or you can try to describe a strategy for an agent to implement (which is lighter on nodes, but harder to design)
 */

export const declarativePerfectActor = Machine({
    // https://en.wikipedia.org/wiki/Tic-tac-toe#Combinatorics
    // https://en.wikipedia.org/wiki/Tic-tac-toe#Strategy
    initial: "preparingFirstTurn",
    states: {
        preparingFirstTurn: {
            initial: "waitingToStart",
            states: {
                waitingToStart: {
                    on: {
                        PLAY: [
                            {
                                target: "startsFirst",
                                cond: "checkIfStartingFirst",
                            },
                            "startsSecond",
                        ],
                    },
                },
                startsFirst: {
                    on: { "": { target: "#continue", actions: "takeCorner" } },
                },
                startsSecond: {
                    states: {
                        opponentInACorner: {
                            on: {
                                "": {
                                    target: "#continue",
                                    actions: "takeCenter",
                                },
                            },
                        },
                        opponentInTheCenter: {
                            on: {
                                "": {
                                    target: "#continue",
                                    actions: "takeCorner",
                                },
                            },
                        },
                        opponentInAnEdge: {
                            on: {
                                "": [
                                    {
                                        target: "#continue",
                                        actions: "takeCornerNextToX",
                                        cond: () => Math.random() > 0.8,
                                    },
                                    {
                                        target: "#continue",
                                        actions: "takeEdgeOppositeToX",
                                        cond: () => Math.random() > 0.8,
                                    },
                                    {
                                        target: "#continue",
                                        actions: "takeCenter",
                                        cond: () => true,
                                    },
                                ],
                            },
                        },
                    },
                },
            },
        },
        continue: {
            /**
             * 1. Win: If the player has two in a row, they can place a third to get three in a row.
             * 2. Block: If the opponent has two in a row, the player must play the third themselves to block the opponent.
             * 3. Fork: Create an opportunity where the player has two ways to win (two non-blocked lines of 2).
             * 4. Blocking an opponent's fork: If there is only one possible fork for the opponent, the player should block it. Otherwise, the player should block all forks in any way that simultaneously allows them to create two in a row. Otherwise, the player should create a two in a row to force the opponent into defending, as long as it doesn't result in them creating a fork. For example, if "X" has two opposite corners and "O" has the center, "O" must not play a corner in order to win. (Playing a corner in this scenario creates a fork for "X" to win.)
             * 5. Center: A player marks the center. (If it is the first move of the game, playing on a corner gives the second player more opportunities to make a mistake and may therefore be the better choice, however, it makes no difference between perfect players.)
             * 6. Opposite corner: If the opponent is in the corner, the player plays the opposite corner.
             * 7. Empty corner: The player plays in a corner square.
             * 8. Empty side: The player plays in a middle square on any of the 4 sides.
             */
            on: {
                PLAY: [
                    {
                        actions: "win",
                        cond: "checkSelf2InARow",
                    },
                    {
                        actions: "block",
                        cond: "checkOpponent2InARow",
                    },
                    {
                        actions: "fork",
                        cond: "check2NonBlockedLinesOf2",
                    },
                    {
                        actions: "blockOpponentFork",
                        cond: "checkOpponentsForks",
                    },
                    {
                        actions: "center",
                        cond: "checkCenterIsFree",
                    },
                    {
                        actions: "oppositeCorner",
                        cond: "checkOpponentIsInCorner",
                    },
                    {
                        actions: "emptyCorner",
                        cond: "checkFreeCorner",
                    },
                    {
                        actions: "emptySide",
                        cond: "checkFreeEdge",
                    },
                ],
            },
        },
    },
});
