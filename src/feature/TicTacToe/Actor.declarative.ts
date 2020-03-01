import sample from "lodash.sample";
import { Machine, SendExpr, sendParent, assign } from "xstate";
import {
    SimpleActorEvent,
    COLUMNS,
    CORNER,
    DIAGONALS,
    EDGE,
    FIELD,
    PLAY,
    UNKNOWN_STATE,
    ROWS,
    getOpponent,
} from "./index.common";

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

const DELAY = { delay: 300 };

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

interface DeclarativePerfectActorContext {
    field: ("x" | "0" | null)[];
    role: "x" | "0";
}

export const declarativePerfectActor = Machine<
    DeclarativePerfectActorContext,
    DeclarativePerfectActorSchema,
    SimpleActorEvent
>(
    {
        // Newell and Simon's expert model (wanna-be) with rule ordering
        // https://en.wikipedia.org/wiki/Tic-tac-toe#Combinatorics
        // https://en.wikipedia.org/wiki/Tic-tac-toe#Strategy
        // https://doi.org/10.1016%2F0364-0213%2893%2990003-Q
        initial: "preparingFirstTurn",
        context: {
            field: [null, null, null, null, null, null, null, null, null],
            role: "x",
        },
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
                                    actions: "contextify",
                                },
                                {
                                    target: "startsSecond",
                                    actions: "contextify",
                                },
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
                id: "continue",
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
                            actions: "takeCenter",
                            cond: "checkCenterIsFree",
                        },
                        {
                            // 6. Opposite corner: If the opponent is in the corner, the player plays the opposite corner.
                            actions: "takeOppositeCorner",
                            cond: "checkOpponentInACornerAndOppositeIsFree",
                        },
                        {
                            // 7. Empty corner: The player plays in a corner square.
                            actions: "takeCorner",
                            cond: "checkFreeCorner",
                        },
                        {
                            // 8. Empty side: The player plays in a middle square on any of the 4 sides.
                            actions: "takeEmptySide",
                            cond: "checkFreeEdge",
                        },
                    ],
                },
            },
        },
    },
    {
        guards: {
            checkIfStartingFirst: (_, event) => {
                console.log("checkIfStartingFirst");
                const { role } = event as PLAY;
                return role === "x";
            },
            checkOpponentInACorner: ({ field, role }) => {
                console.log("checkOpponentInACorner");
                const opponent = getOpponent(role);
                const opponentCorner = [
                    field[CORNER.TOP_LEFT],
                    field[CORNER.TOP_RIGHT],
                    field[CORNER.BOT_LEFT],
                    field[CORNER.BOT_RIGHT],
                ].some(v => v === opponent);
                return opponentCorner;
            },
            checkOpponentInTheCenter: ({ field, role }) => {
                console.log("checkOpponentInTheCenter");
                const opponent = getOpponent(role);
                return field[FIELD.CENTER] === opponent;
            },

            checkMy2InARow: (_, event) => {
                console.log("checkMy2InARow");
                const { field, role } = event as PLAY;
                const twoInARow = findA2InARowWith1Free(field, role);
                return Boolean(twoInARow);
            },
            checkOpponent2InARow: (_, event) => {
                console.log("checkOpponent2InARow");
                const { field, role } = event as PLAY;
                const opponent = getOpponent(role);
                const twoInARow = findA2InARowWith1Free(field, opponent);
                return Boolean(twoInARow);
            },
            checkMyFork: (_, event) => {
                console.log("checkMyFork");
                const { field, role } = event as PLAY;
                return findAFork(field, role).type === "TURN_MADE";
            },
            checkOpponentsForks: (_, event) => {
                console.log("checkOpponentsForks");
                const { field, role } = event as PLAY;
                const opponent = getOpponent(role);
                return findAFork(field, opponent).type === "TURN_MADE";
            },
            checkCenterIsFree: (_, event) => {
                console.log("checkCenterIsFree");
                const { field } = event as PLAY;
                return field[FIELD.CENTER] === null;
            },
            checkOpponentInACornerAndOppositeIsFree: (_, event) => {
                console.log("checkOpponentInACornerAndOppositeIsFree");
                // if my opponent is in a corner, and
                // if the opposite corner is empty
                const { field, role } = event as PLAY;
                const opponent = getOpponent(role);
                return (
                    (field[CORNER.TOP_LEFT] === opponent &&
                        field[CORNER.BOT_RIGHT] === null) ||
                    (field[CORNER.TOP_RIGHT] === opponent &&
                        field[CORNER.BOT_LEFT] === null) ||
                    (field[CORNER.BOT_LEFT] === opponent &&
                        field[CORNER.TOP_RIGHT] === null) ||
                    (field[CORNER.BOT_RIGHT] === opponent &&
                        field[CORNER.TOP_LEFT] === null)
                );
            },
            checkFreeCorner: (_, event) => {
                console.log("checkFreeCorner");
                const { field } = event as PLAY;
                const freeCorner = [
                    field[CORNER.TOP_LEFT],
                    field[CORNER.TOP_RIGHT],
                    field[CORNER.BOT_LEFT],
                    field[CORNER.BOT_RIGHT],
                ].some(v => v === null);
                return freeCorner;
            },
            checkFreeEdge: (_, event) => {
                console.log("checkFreeEdge");
                const { field } = event as PLAY;
                const freeEdge = [
                    field[EDGE.TOP],
                    field[EDGE.LEFT],
                    field[EDGE.RIGHT],
                    field[EDGE.BOT],
                ].some(v => v === null);
                return freeEdge;
            },
        },
        actions: {
            contextify: assign((_, event) => {
                console.log("contextify");
                const { field, role } = event as PLAY;
                return { field, role };
            }),
            takeCorner: sendParent(
                function(context, event) {
                    console.log("takeCorner");
                    const field = (event as PLAY).field || context.field;
                    const corners = [
                        {
                            index: CORNER.TOP_LEFT,
                            value: field[CORNER.TOP_LEFT],
                        },
                        {
                            index: CORNER.TOP_RIGHT,
                            value: field[CORNER.TOP_RIGHT],
                        },
                        {
                            index: CORNER.BOT_LEFT,
                            value: field[CORNER.BOT_LEFT],
                        },
                        {
                            index: CORNER.BOT_RIGHT,
                            value: field[CORNER.BOT_RIGHT],
                        },
                    ];
                    const anyCorner = sample(
                        corners.filter(({ value }) => value === null),
                    ) as { index: number };

                    return {
                        type: "TURN_MADE",
                        // warn: no typeguard for selectedIndex, even though
                        // SimpleActorEvent models it as a number...
                        selectedIndex: anyCorner.index,
                    };
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            takeCornerNextToX: sendParent(
                function({ field }) {
                    console.log("takeCornerNextToX");
                    // opponentInAnEdge [1,3,5,7]
                    // warn: the list of cases is exhaustive for the 3x3 use-case
                    // but does not consider a broken state
                    switch (true) {
                        case field[EDGE.TOP] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex:
                                    Math.random() > 0.5
                                        ? CORNER.TOP_LEFT
                                        : CORNER.TOP_RIGHT,
                            };
                        case field[EDGE.LEFT] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex:
                                    Math.random() > 0.5
                                        ? CORNER.TOP_LEFT
                                        : CORNER.BOT_LEFT,
                            };
                        case field[EDGE.RIGHT] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex:
                                    Math.random() > 0.5
                                        ? CORNER.TOP_RIGHT
                                        : CORNER.BOT_RIGHT,
                            };
                        case field[EDGE.BOT] === "x":
                        default:
                            return {
                                type: "TURN_MADE",
                                selectedIndex:
                                    Math.random() > 0.5
                                        ? CORNER.BOT_LEFT
                                        : CORNER.BOT_RIGHT,
                            };
                    }
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            takeEdgeOppositeToX: sendParent(
                function({ field }) {
                    console.log("takeEdgeOppositeToX");
                    // opponentInAnEdge [1,3,5,7]
                    // warn: the list of cases is exhaustive for the 3x3 use-case
                    // but does not consider a broken state
                    switch (true) {
                        case field[EDGE.TOP] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex: EDGE.BOT,
                            };
                        case field[EDGE.LEFT] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex: EDGE.RIGHT,
                            };
                        case field[EDGE.RIGHT] === "x":
                            return {
                                type: "TURN_MADE",
                                selectedIndex: EDGE.LEFT,
                            };
                        case field[EDGE.BOT] === "x":
                        default:
                            return {
                                type: "TURN_MADE",
                                selectedIndex: EDGE.TOP,
                            };
                    }
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),

            // next
            win: sendParent(
                function(_, event) {
                    console.log("win");
                    const { field, role } = event as PLAY;
                    const selectedIndex = findAFreeSpotIn2InARow(field, role);
                    return {
                        type: "TURN_MADE",
                        selectedIndex,
                    };
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            block: sendParent(
                function(_, event) {
                    console.log("block");
                    const { field, role } = event as PLAY;
                    const opponent = getOpponent(role);
                    const selectedIndex = findAFreeSpotIn2InARow(
                        field,
                        opponent,
                    );
                    return {
                        type: "TURN_MADE",
                        selectedIndex,
                    };
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            fork: sendParent(
                function(_, event) {
                    console.log("fork");
                    const { field, role } = event as PLAY;
                    return findAFork(field, role);
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            blockOpponentFork: sendParent(
                function(_, event) {
                    console.log("blockOpponentFork");
                    const { field, role } = event as PLAY;
                    const opponent = getOpponent(role);
                    return findAFork(field, opponent);
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            takeCenter: sendParent(
                function() {
                    console.log("takeCenter");
                    return {
                        type: "TURN_MADE",
                        selectedIndex: FIELD.CENTER,
                    };
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            takeOppositeCorner: sendParent(
                function(_, event) {
                    console.log("takeOppositeCorner");
                    // if my opponent is in a corner, and
                    // if the opposite corner is empty
                    const { field, role } = event as PLAY;
                    const opponent = getOpponent(role);
                    switch (true) {
                        case field[CORNER.TOP_LEFT] === opponent &&
                            field[CORNER.BOT_RIGHT] === null:
                            return {
                                type: "TURN_MADE",
                                selectedIndex: CORNER.BOT_RIGHT,
                            };
                        case field[CORNER.TOP_RIGHT] === opponent &&
                            field[CORNER.BOT_LEFT] === null:
                            return {
                                type: "TURN_MADE",
                                selectedIndex: CORNER.BOT_LEFT,
                            };
                        case field[CORNER.BOT_LEFT] === opponent &&
                            field[CORNER.TOP_RIGHT] === null:
                            return {
                                type: "TURN_MADE",
                                selectedIndex: CORNER.TOP_RIGHT,
                            };
                        case field[CORNER.BOT_RIGHT] === opponent &&
                            field[CORNER.TOP_LEFT] === null:
                        default:
                            return {
                                type: "TURN_MADE",
                                selectedIndex: CORNER.TOP_LEFT,
                            };
                    }
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
            takeEmptySide: sendParent(
                function(_, event) {
                    console.log("takeEmptySide");
                    const { field } = event as PLAY;
                    return {
                        type: "TURN_MADE",
                        selectedIndex: sample(
                            [EDGE.TOP, EDGE.LEFT, EDGE.RIGHT, EDGE.BOT].filter(
                                edge => field[edge] === null,
                            ),
                        ),
                    };
                } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
                DELAY,
            ),
        },
    },
);

// warn: is there a way to cut on checking or assignment?
function findAFork(
    field: ("x" | "0" | null)[],
    role: "x" | "0",
): SimpleActorEvent {
    // if there are two intersecting rows, columns, or diagonals
    // with one of my pieces and two blanks,
    // =====================================
    //  [*,X,*]
    //  [X,_,_] <- 2 blanks on row 2
    //  [*,_,*]
    //     ^- 2 blanks on col 2
    //  cell 4 (center) is an intersection
    // =====================================
    // and if the intersecting space is empty
    const oneTakenAnd2Blanks = (line: number[]) =>
        line.reduce(
            (acc, index) =>
                field[index] === role
                    ? acc + 1
                    : field[index] === null
                    ? acc
                    : acc - 1,
            0,
        ) === 1;
    const rows = ROWS.filter(oneTakenAnd2Blanks);
    const columns = COLUMNS.filter(oneTakenAnd2Blanks);
    const diagonals = DIAGONALS.filter(oneTakenAnd2Blanks);

    if (rows.length) {
        for (let row of rows) {
            for (let index of row) {
                for (let column of columns) {
                    const intersection = index in column;
                    const intersectionEmpty = field[index] === null;
                    if (intersection && intersectionEmpty) {
                        return {
                            type: "TURN_MADE",
                            selectedIndex: index,
                        };
                    }
                }
                for (let diag of diagonals) {
                    const intersection = index in diag;
                    const intersectionEmpty = field[index] === null;
                    if (intersection && intersectionEmpty) {
                        return {
                            type: "TURN_MADE",
                            selectedIndex: index,
                        };
                    }
                }
            }
        }
    }

    if (columns.length) {
        for (let column of columns) {
            for (let index of column) {
                for (let diag of diagonals) {
                    const intersection = index in diag;
                    const intersectionEmpty = field[index] === null;
                    if (intersection && intersectionEmpty) {
                        return {
                            type: "TURN_MADE",
                            selectedIndex: index,
                        };
                    }
                }
            }
        }
    }

    if (diagonals.length === 2 && field[FIELD.CENTER] === null) {
        return {
            type: "TURN_MADE",
            selectedIndex: FIELD.CENTER,
        };
    }

    // warn: throwing would break a contract of a guard
    // which will ommit the guard and throw 'Unable to elevate condition!'
    // throw "should not be reachable!";
    return {
        type: "UNKNOWN_STATE",
        origin: "declarativePerfectActor",
        message: `findAFork is invoked, but all options are exhausted without resolution!
        either condition-guard didn't work, or the event is wrong, or the flow is completely broken`,
    };
}

function findA2InARowWith1Free(field: ("x" | "0" | null)[], role: "x" | "0") {
    const opponent = getOpponent(role);
    return FIELD.COMBINATIONS.find(
        row =>
            row.reduce(
                (acc, index) =>
                    field[index] === role
                        ? acc + 1
                        : field[index] === opponent
                        ? acc - 1
                        : acc,
                0,
            ) === 2,
    ) as number[];
}

function findAFreeSpotIn2InARow(field: ("x" | "0" | null)[], role: "x" | "0") {
    const twoInARow = findA2InARowWith1Free(field, role);
    return twoInARow.find(index => field[index] === null) as number;
}
