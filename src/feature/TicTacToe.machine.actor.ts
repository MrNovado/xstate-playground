import sample from "lodash.sample";
import { Machine, MachineConfig, SendExpr, sendParent } from "xstate";

// [0,1,2]
// [3,4,5]
// [6,7,8]

enum CORNER {
    TOP_LEFT = 0,
    TOP_RIGHT = 2,
    BOT_LEFT = 6,
    BOT_RIGHT = 8,
}

enum EDGE {
    TOP = 1,
    LEFT = 3,
    RIGHT = 5,
    BOT = 8,
}

const FIELD = {
    CORNERS: CORNER,
    EDGES: EDGE,
    CENTER: 4,
    COMBINATIONS: [
        [3, 4, 5],
        [1, 4, 7],
        [0, 4, 8],
        [2, 4, 6],
        [0, 1, 2],
        [6, 7, 8],
        [0, 3, 6],
        [2, 5, 8],
    ],
};

function getOpponent(role: "x" | "0") {
    return role === "x" ? "0" : "x";
}

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

type PLAY = { type: "PLAY"; field: ("x" | "0" | null)[]; role: "x" | "0" };
type TURN_MADE = { type: "TURN_MADE"; selectedIndex: number };
type __ignore__ = { type: "__ignore__" };

export type TicTacToeSimpleActorMachineEvent = PLAY | TURN_MADE | __ignore__;

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
 * 2. Or you can try to describe a strategy for an agent to implement (which is lighter on nodes, but harder to design):
 * -- more like describe an algorithm with phases (states) and actions schemas
 */

// [0,1,2]
// [3,4,5]
// [6,7,8]

interface DeclarativePerfectActorSchema {
    states: {
        preparingFirstTurn: {
            states: {
                waitingToStart: {};
                startsFirst: {};
                startsSecond: {
                    states: {
                        reflectOnOpponentsTurn: {};
                        opponentInACorner: {};
                        opponentInTheCenter: {};
                        opponentInAnEdge: {};
                    };
                };
            };
        };
        continue: {};
    };
}

interface DeclarativePerfectActorContext {}

export const declarativePerfectActor = Machine<
    DeclarativePerfectActorContext,
    DeclarativePerfectActorSchema,
    TicTacToeSimpleActorMachineEvent
>(
    {
        // Newell and Simon's expert model (wanna-be) with rule ordering
        // https://en.wikipedia.org/wiki/Tic-tac-toe#Combinatorics
        // https://en.wikipedia.org/wiki/Tic-tac-toe#Strategy
        // https://doi.org/10.1016%2F0364-0213%2893%2990003-Q
        initial: "preparingFirstTurn",
        context: {},
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
                        on: {
                            "": {
                                target: "#continue",
                                actions: "takeCorner",
                            },
                        },
                    },
                    startsSecond: {
                        initial: "reflectOnOpponentsTurn",
                        states: {
                            reflectOnOpponentsTurn: {
                                on: {
                                    "": [
                                        {
                                            target: "opponentInACorner",
                                            cond: "checkOpponentInACorner",
                                        },
                                        {
                                            target: "opponentInTheCenter",
                                            cond: "checkOpponentInTheCenter",
                                        },
                                        {
                                            target: "opponentInAnEdge",
                                        },
                                    ],
                                },
                            },
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
                on: {
                    PLAY: [
                        {
                            // 1. Win: If the player has two in a row,
                            // they can place a third to get three in a row.
                            actions: "win",
                            cond: "checkMy2InARow",
                        },
                        {
                            // 2. Block: If the opponent has two in a row,
                            // the player must play the third themselves to block
                            // the opponent.
                            actions: "block",
                            cond: "checkOpponent2InARow",
                        },
                        {
                            // 3. Fork: Create an opportunity where the player
                            // has two ways to win (two non-blocked lines of 2).
                            actions: "fork",
                            cond: "checkMyFork",
                        },
                        {
                            // 4. Blocking an opponent's fork: If there is only one
                            // possible fork for the opponent, the player should block it.
                            // Otherwise, the player should block all forks in any way that
                            // simultaneously allows them to create two in a row.
                            // Otherwise, the player should create a two in a row to force
                            // the opponent into defending, as long as it doesn't result in them
                            // creating a fork. For example, if "X" has two opposite corners and "O"
                            // has the center, "O" must not play a corner in order to win.
                            // (Playing a corner in this scenario creates a fork for "X" to win.)
                            actions: "blockOpponentFork",
                            cond: "checkOpponentsForks",
                        },
                        {
                            // 5. Center: A player marks the center.
                            // (If it is the first move of the game, playing on a corner gives the second player
                            // more opportunities to make a mistake and may therefore be the better choice,
                            // however, it makes no difference between perfect players.)
                            actions: "center",
                            cond: "checkCenterIsFree",
                        },
                        {
                            // 6. Opposite corner: If the opponent is in the corner, the player plays the opposite corner.
                            actions: "oppositeCorner",
                            cond: "checkOpponentInACornerAndOppositeIsFree",
                        },
                        {
                            // 7. Empty corner: The player plays in a corner square.
                            actions: "emptyCorner",
                            cond: "checkFreeCorner",
                        },
                        {
                            // 8. Empty side: The player plays in a middle square on any of the 4 sides.
                            actions: "emptySide",
                            cond: "checkFreeEdge",
                        },
                    ],
                },
            },
        },
    },
    {
        guards: {
            // first turn
            checkIfStartingFirst: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { role } = event;
                        return role === "x";
                    default:
                        return false;
                }
            },
            checkOpponentInACorner: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field, role } = event;
                        const opponent = getOpponent(role);
                        const opponentCorner = [
                            field[CORNER.TOP_LEFT],
                            field[CORNER.TOP_RIGHT],
                            field[CORNER.BOT_LEFT],
                            field[CORNER.BOT_RIGHT],
                        ].find(v => v === opponent);
                        return Boolean(opponentCorner);
                    default:
                        return false;
                }
            },
            checkOpponentInTheCenter: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field, role } = event;
                        const opponent = getOpponent(role);
                        return field[FIELD.CENTER] === opponent;
                    default:
                        return false;
                }
            },

            // next
            checkMy2InARow: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field, role } = event;
                        const twoInARow = FIELD.COMBINATIONS.find(
                            row =>
                                row.reduce(
                                    (acc, index) =>
                                        field[index] === role ? acc + 1 : acc,
                                    0,
                                ) === 2,
                        );
                        return Boolean(twoInARow);
                    default:
                        return false;
                }
            },
            checkOpponent2InARow: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field, role } = event;
                        const twoInARow = FIELD.COMBINATIONS.find(
                            row =>
                                row.reduce(
                                    (acc, index) =>
                                        field[index] !== null &&
                                        field[index] !== role
                                            ? acc + 1
                                            : acc,
                                    0,
                                ) === 2,
                        );
                        return Boolean(twoInARow);
                    default:
                        return false;
                }
            },
            checkMyFork: () => true,
            checkOpponentsForks: () => true,
            checkCenterIsFree: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        return field[FIELD.CENTER] === null;
                    default:
                        return false;
                }
            },
            checkOpponentInACornerAndOppositeIsFree: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        // if my opponent is in a corner, and
                        // if the opposite corner is empty
                        const { field, role } = event;
                        const opponent = getOpponent(role);
                        switch (true) {
                            case field[CORNER.TOP_LEFT] === opponent:
                                return field[CORNER.BOT_RIGHT] === null;
                            case field[CORNER.TOP_RIGHT] === opponent:
                                return field[CORNER.BOT_LEFT] === null;
                            case field[CORNER.BOT_LEFT] === opponent:
                                return field[CORNER.TOP_RIGHT] === null;
                            case field[CORNER.BOT_RIGHT] === opponent:
                                return field[CORNER.TOP_LEFT] === null;
                        }
                    default:
                        return false;
                }
            },
            checkFreeCorner: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        const freeCorner = [
                            field[CORNER.TOP_LEFT],
                            field[CORNER.TOP_RIGHT],
                            field[CORNER.BOT_LEFT],
                            field[CORNER.BOT_RIGHT],
                        ].find(v => v === null);
                        return Boolean(freeCorner);
                    default:
                        return false;
                }
            },
            checkFreeEdge: (_, event) => {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        const freeEdge = [
                            field[EDGE.TOP],
                            field[EDGE.LEFT],
                            field[EDGE.RIGHT],
                            field[EDGE.BOT],
                        ].find(v => v === null);
                        return Boolean(freeEdge);
                    default:
                        return false;
                }
            },
        },
        actions: {
            // first turn
            takeCenter: sendParent(function(_, event) {
                switch (event.type) {
                    case "PLAY":
                        return {
                            type: "TURN_MADE",
                            selectedIndex: 4,
                        };

                    default:
                        return { type: "__ignore__" };
                }
            } as SendExpr<
                DeclarativePerfectActorContext,
                TicTacToeSimpleActorMachineEvent
            >),
            takeCorner: sendParent(function(_, event) {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        const corners = [
                            { index: 0, value: field[0] },
                            { index: 2, value: field[2] },
                            { index: 6, value: field[6] },
                            { index: 8, value: field[8] },
                        ];
                        const anyCorner = corners.find(
                            ({ value }) => value === null,
                        ) as { index: number };

                        return {
                            type: "TURN_MADE",
                            // warn: no typeguard for selectedIndex, even though
                            // TicTacToeSimpleActorMachineEvent models it as a number...
                            selectedIndex: anyCorner.index,
                        };

                    default:
                        return { type: "__ignore__" };
                }
            } as SendExpr<
                DeclarativePerfectActorContext,
                TicTacToeSimpleActorMachineEvent
            >),
            takeCornerNextToX: sendParent(function(_, event) {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        // opponentInAnEdge [1,3,5,7]
                        // warn: the list of cases is exhaustive for the 3x3 use-case
                        // but does not consider a broken state
                        switch (true) {
                            case field[1] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: Math.random() > 0.5 ? 0 : 2,
                                };
                            case field[3] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: Math.random() > 0.5 ? 0 : 6,
                                };
                            case field[5] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: Math.random() > 0.5 ? 2 : 8,
                                };
                            case field[7] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: Math.random() > 0.5 ? 6 : 8,
                                };
                        }

                    default:
                        return { type: "__ignore__" };
                }
            } as SendExpr<
                DeclarativePerfectActorContext,
                TicTacToeSimpleActorMachineEvent
            >),
            takeEdgeOppositeToX: sendParent(function(_, event) {
                switch (event.type) {
                    case "PLAY":
                        const { field } = event;
                        // opponentInAnEdge [1,3,5,7]
                        // warn: the list of cases is exhaustive for the 3x3 use-case
                        // but does not consider a broken state
                        switch (true) {
                            case field[1] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: 7,
                                };
                            case field[3] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: 5,
                                };
                            case field[5] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: 3,
                                };
                            case field[7] === "x":
                                return {
                                    type: "TURN_MADE",
                                    selectedIndex: 1,
                                };
                        }

                    default:
                        return { type: "__ignore__" };
                }
            } as SendExpr<
                DeclarativePerfectActorContext,
                TicTacToeSimpleActorMachineEvent
            >),

            // next
            win: () => {},
            block: () => {},
            fork: () => {},
            blockOpponentFork: () => {},
            center: () => {},
            oppositeCorner: () => {},
            emptyCorner: () => {},
            emptySide: () => {},
        },
    },
);
