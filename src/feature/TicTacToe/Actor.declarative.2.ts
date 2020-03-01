import sample from "lodash.sample";
import { Machine, sendParent, assign } from "xstate";
import {
    SimpleActorEvent,
    UNKNOWN_STATE,
    COLUMNS,
    CORNER,
    DIAGONALS,
    EDGE,
    FIELD,
    PLAY,
    ROWS,
    getOpponent,
} from "./index.common";

const DELAY = { delay: 300 };

interface DeclarativePerfectActorSchema {
    states: {
        awaitingTurn: {};
        win: {
            states: { check: {}; act: {} };
        };
        blockWin: {
            states: { check: {}; act: {} };
        };
        fork: {
            states: { check: {}; act: {} };
        };
        blockFork: {
            states: { check: {}; act: {} };
        };
        takeCenter: {
            states: { check: {}; act: {} };
        };
        takeOppositeCornter: {
            states: { check: {}; act: {} };
        };
        takeCorner: {
            states: { check: {}; act: {} };
        };
        takeEmptySide: {
            states: { check: {}; act: {} };
        };
    };
}

interface DeclarativePerfectActorContext {
    field: ("x" | "0" | null)[];
    role: "x" | "0";
    buffer:
        | null
        | { type: "win"; combination: number[] }
        | { type: "blockWin"; combination: number[] }
        | { type: "fork"; intersection: number }
        | { type: "blockFork"; intersection: number }
        | { type: "takeCenter" }
        | { type: "takeOppositeCornter"; corner: number }
        | { type: "takeCorner" }
        | { type: "takeEmptySide" };
}

export const declarativePerfectActor2 = Machine<
    DeclarativePerfectActorContext,
    DeclarativePerfectActorSchema,
    SimpleActorEvent
>(
    {
        initial: "awaitingTurn",
        context: {
            field: [null, null, null, null, null, null, null, null, null],
            role: "x",
            buffer: null,
        },
        states: {
            awaitingTurn: {
                id: "awaitingTurn",
                on: {
                    PLAY: {
                        target: "win",
                        actions: "contextifyPlayEvent",
                    },
                },
            },
            win: {
                id: "win",
                initial: "check",
                states: {
                    check: {
                        entry: "assignMy2InARow",
                        on: {
                            "": [
                                {
                                    cond: ({ buffer }) =>
                                        buffer?.type === "win",
                                    target: "act",
                                },
                                {
                                    target: "#blockWin",
                                },
                            ],
                        },
                    },
                    act: {
                        on: {
                            "": {
                                target: "#awaitingTurn",
                                actions: "win",
                            },
                        },
                    },
                },
            },
            blockWin: {
                id: "blockWin",
                initial: "check",
                states: {
                    check: {
                        entry: "assignOpponent2InARow",
                        on: {
                            "": [
                                {
                                    cond: ({ buffer }) =>
                                        buffer?.type === "blockWin",
                                    target: "act",
                                },
                                {
                                    target: "#fork",
                                },
                            ],
                        },
                    },
                    act: {
                        on: {
                            "": {
                                target: "#awaitingTurn",
                                actions: "blockWin",
                            },
                        },
                    },
                },
            },
            fork: {
                id: "fork",
                initial: "check",
                states: {
                    check: {
                        entry: "assignMyFork",
                        on: {
                            "": [
                                {
                                    cond: ({ buffer }) =>
                                        buffer?.type === "fork",
                                    target: "act",
                                },
                                {
                                    target: "#blockFork",
                                },
                            ],
                        },
                    },
                    act: {
                        on: {
                            "": {
                                target: "#awaitingTurn",
                                actions: "fork",
                            },
                        },
                    },
                },
            },
            blockFork: {
                id: "blockFork",
                initial: "check",
                states: { check: {}, act: {} },
            },
            takeCenter: {
                id: "takeCenter",
                initial: "check",
                states: { check: {}, act: {} },
            },
            takeOppositeCornter: {
                id: "takeOppositeCornter",
                initial: "check",
                states: { check: {}, act: {} },
            },
            takeCorner: {
                id: "takeCorner",
                initial: "check",
                states: { check: {}, act: {} },
            },
            takeEmptySide: {
                id: "takeEmptySide",
                initial: "check",
                states: { check: {}, act: {} },
            },
        },
    },
    {
        actions: {
            contextifyPlayEvent: assign((context, event) => {
                switch (event.type) {
                    case "PLAY": {
                        const { field, role } = event;
                        return { field, role };
                    }
                    default:
                        return context;
                }
            }),
            assignMy2InARow: assign({
                buffer: ({ field, role }) => {
                    const combination = findA2InARowWith1Free(field, role);
                    return combination ? { type: "win", combination } : null;
                },
            }),
            assignOpponent2InARow: assign({
                buffer: ({ field, role }) => {
                    const opponent = getOpponent(role);
                    const combination = findA2InARowWith1Free(field, opponent);
                    return combination
                        ? { type: "blockWin", combination }
                        : null;
                },
            }),
            assignMyFork: assign({
                buffer: ({ field, role }) => {
                    const fork = findAFork(field, role);
                    return fork.type === "TURN_MADE"
                        ? { type: "fork", intersection: fork.selectedIndex }
                        : null;
                },
            }),
            assignOpponentFork: assign({
                buffer: ({ field, role }) => {
                    const opponent = getOpponent(role);
                    const fork = findAFork(field, opponent);
                    return fork.type === "TURN_MADE"
                        ? { type: "blockFork", intersection: fork.selectedIndex }
                        : null;
                },
            }),

            win: sendParent(
                ({ buffer, field }: DeclarativePerfectActorContext) => {
                    switch (buffer?.type) {
                        case "win": {
                            const selectedIndex = buffer.combination.find(
                                i => field[i] === null,
                            );
                            return { type: "TURN_MADE", selectedIndex };
                        }
                        default:
                            return {
                                type: "UNKNOWN_STATE",
                                origin: "declarativePerfectActor2",
                                message:
                                    "win is invoked, but buffer is not there!",
                            };
                    }
                },
                DELAY,
            ),
            blockWin: sendParent(
                ({ buffer, field }: DeclarativePerfectActorContext) => {
                    switch (buffer?.type) {
                        case "blockWin": {
                            const selectedIndex = buffer.combination.find(
                                i => field[i] === null,
                            );
                            return { type: "TURN_MADE", selectedIndex };
                        }
                        default:
                            return {
                                type: "UNKNOWN_STATE",
                                origin: "declarativePerfectActor2",
                                message:
                                    "blockWin is invoked, but buffer is not there!",
                            };
                    }
                },
                DELAY,
            ),
            fork: sendParent(({ buffer }: DeclarativePerfectActorContext) => {
                switch (buffer?.type) {
                    case "fork": {
                        return {
                            type: "TURN_MADE",
                            selectedIndex: buffer.intersection,
                        };
                    }
                    default:
                        return {
                            type: "UNKNOWN_STATE",
                            origin: "declarativePerfectActor2",
                            message:
                                "fork is invoked, but buffer is not there!",
                        };
                }
            }, DELAY),
            blockFork: sendParent(({ buffer }: DeclarativePerfectActorContext) => {
                switch (buffer?.type) {
                    case "fork": {
                        return {
                            type: "TURN_MADE",
                            selectedIndex: buffer.intersection,
                        };
                    }
                    default:
                        return {
                            type: "UNKNOWN_STATE",
                            origin: "declarativePerfectActor2",
                            message:
                                "fork is invoked, but buffer is not there!",
                        };
                }
            }, DELAY),
        },
    },
    // {
    //     guards: {
    //         checkIfStartingFirst: (_, event) => {
    //             console.log("checkIfStartingFirst");
    //             const { role } = event as PLAY;
    //             return role === "x";
    //         },
    //         checkOpponentInACorner: ({ field, role }) => {
    //             console.log("checkOpponentInACorner");
    //             const opponent = getOpponent(role);
    //             const opponentCorner = [
    //                 field[CORNER.TOP_LEFT],
    //                 field[CORNER.TOP_RIGHT],
    //                 field[CORNER.BOT_LEFT],
    //                 field[CORNER.BOT_RIGHT],
    //             ].some(v => v === opponent);
    //             return opponentCorner;
    //         },
    //         checkOpponentInTheCenter: ({ field, role }) => {
    //             console.log("checkOpponentInTheCenter");
    //             const opponent = getOpponent(role);
    //             return field[FIELD.CENTER] === opponent;
    //         },

    //         checkMy2InARow: (_, event) => {
    //             console.log("checkMy2InARow");
    //             const { field, role } = event as PLAY;
    //             const twoInARow = findA2InARowWith1Free(field, role);
    //             return Boolean(twoInARow);
    //         },
    //         checkOpponent2InARow: (_, event) => {
    //             console.log("checkOpponent2InARow");
    //             const { field, role } = event as PLAY;
    //             const opponent = getOpponent(role);
    //             const twoInARow = findA2InARowWith1Free(field, opponent);
    //             return Boolean(twoInARow);
    //         },
    //         checkMyFork: (_, event) => {
    //             console.log("checkMyFork");
    //             const { field, role } = event as PLAY;
    //             return findAFork(field, role).type === "TURN_MADE";
    //         },
    //         checkOpponentsForks: (_, event) => {
    //             console.log("checkOpponentsForks");
    //             const { field, role } = event as PLAY;
    //             const opponent = getOpponent(role);
    //             return findAFork(field, opponent).type === "TURN_MADE";
    //         },
    //         checkCenterIsFree: (_, event) => {
    //             console.log("checkCenterIsFree");
    //             const { field } = event as PLAY;
    //             return field[FIELD.CENTER] === null;
    //         },
    //         checkOpponentInACornerAndOppositeIsFree: (_, event) => {
    //             console.log("checkOpponentInACornerAndOppositeIsFree");
    //             // if my opponent is in a corner, and
    //             // if the opposite corner is empty
    //             const { field, role } = event as PLAY;
    //             const opponent = getOpponent(role);
    //             return (
    //                 (field[CORNER.TOP_LEFT] === opponent &&
    //                     field[CORNER.BOT_RIGHT] === null) ||
    //                 (field[CORNER.TOP_RIGHT] === opponent &&
    //                     field[CORNER.BOT_LEFT] === null) ||
    //                 (field[CORNER.BOT_LEFT] === opponent &&
    //                     field[CORNER.TOP_RIGHT] === null) ||
    //                 (field[CORNER.BOT_RIGHT] === opponent &&
    //                     field[CORNER.TOP_LEFT] === null)
    //             );
    //         },
    //         checkFreeCorner: (_, event) => {
    //             console.log("checkFreeCorner");
    //             const { field } = event as PLAY;
    //             const freeCorner = [
    //                 field[CORNER.TOP_LEFT],
    //                 field[CORNER.TOP_RIGHT],
    //                 field[CORNER.BOT_LEFT],
    //                 field[CORNER.BOT_RIGHT],
    //             ].some(v => v === null);
    //             return freeCorner;
    //         },
    //         checkFreeEdge: (_, event) => {
    //             console.log("checkFreeEdge");
    //             const { field } = event as PLAY;
    //             const freeEdge = [
    //                 field[EDGE.TOP],
    //                 field[EDGE.LEFT],
    //                 field[EDGE.RIGHT],
    //                 field[EDGE.BOT],
    //             ].some(v => v === null);
    //             return freeEdge;
    //         },
    //     },
    //     actions: {
    //         contextifyPlayEvent: assign((_, event) => {
    //             console.log("contextifyPlayEvent");
    //             const { field, role } = event as PLAY;
    //             return { field, role };
    //         }),
    //         takeCorner: sendParent(
    //             function(context, event) {
    //                 console.log("takeCorner");
    //                 const field = (event as PLAY).field || context.field;
    //                 const corners = [
    //                     {
    //                         index: CORNER.TOP_LEFT,
    //                         value: field[CORNER.TOP_LEFT],
    //                     },
    //                     {
    //                         index: CORNER.TOP_RIGHT,
    //                         value: field[CORNER.TOP_RIGHT],
    //                     },
    //                     {
    //                         index: CORNER.BOT_LEFT,
    //                         value: field[CORNER.BOT_LEFT],
    //                     },
    //                     {
    //                         index: CORNER.BOT_RIGHT,
    //                         value: field[CORNER.BOT_RIGHT],
    //                     },
    //                 ];
    //                 const anyCorner = sample(
    //                     corners.filter(({ value }) => value === null),
    //                 ) as { index: number };

    //                 return {
    //                     type: "TURN_MADE",
    //                     // warn: no typeguard for selectedIndex, even though
    //                     // SimpleActorEvent models it as a number...
    //                     selectedIndex: anyCorner.index,
    //                 };
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         takeCornerNextToX: sendParent(
    //             function({ field }) {
    //                 console.log("takeCornerNextToX");
    //                 // opponentInAnEdge [1,3,5,7]
    //                 // warn: the list of cases is exhaustive for the 3x3 use-case
    //                 // but does not consider a broken state
    //                 switch (true) {
    //                     case field[EDGE.TOP] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex:
    //                                 Math.random() > 0.5
    //                                     ? CORNER.TOP_LEFT
    //                                     : CORNER.TOP_RIGHT,
    //                         };
    //                     case field[EDGE.LEFT] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex:
    //                                 Math.random() > 0.5
    //                                     ? CORNER.TOP_LEFT
    //                                     : CORNER.BOT_LEFT,
    //                         };
    //                     case field[EDGE.RIGHT] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex:
    //                                 Math.random() > 0.5
    //                                     ? CORNER.TOP_RIGHT
    //                                     : CORNER.BOT_RIGHT,
    //                         };
    //                     case field[EDGE.BOT] === "x":
    //                     default:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex:
    //                                 Math.random() > 0.5
    //                                     ? CORNER.BOT_LEFT
    //                                     : CORNER.BOT_RIGHT,
    //                         };
    //                 }
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         takeEdgeOppositeToX: sendParent(
    //             function({ field }) {
    //                 console.log("takeEdgeOppositeToX");
    //                 // opponentInAnEdge [1,3,5,7]
    //                 // warn: the list of cases is exhaustive for the 3x3 use-case
    //                 // but does not consider a broken state
    //                 switch (true) {
    //                     case field[EDGE.TOP] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: EDGE.BOT,
    //                         };
    //                     case field[EDGE.LEFT] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: EDGE.RIGHT,
    //                         };
    //                     case field[EDGE.RIGHT] === "x":
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: EDGE.LEFT,
    //                         };
    //                     case field[EDGE.BOT] === "x":
    //                     default:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: EDGE.TOP,
    //                         };
    //                 }
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),

    //         // next
    //         win: sendParent(
    //             function(_, event) {
    //                 console.log("win");
    //                 const { field, role } = event as PLAY;
    //                 const selectedIndex = findAFreeSpotIn2InARow(field, role);
    //                 return {
    //                     type: "TURN_MADE",
    //                     selectedIndex,
    //                 };
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         block: sendParent(
    //             function(_, event) {
    //                 console.log("block");
    //                 const { field, role } = event as PLAY;
    //                 const opponent = getOpponent(role);
    //                 const selectedIndex = findAFreeSpotIn2InARow(
    //                     field,
    //                     opponent,
    //                 );
    //                 return {
    //                     type: "TURN_MADE",
    //                     selectedIndex,
    //                 };
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         fork: sendParent(
    //             function(_, event) {
    //                 console.log("fork");
    //                 const { field, role } = event as PLAY;
    //                 return findAFork(field, role);
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         blockOpponentFork: sendParent(
    //             function(_, event) {
    //                 console.log("blockOpponentFork");
    //                 const { field, role } = event as PLAY;
    //                 const opponent = getOpponent(role);
    //                 return findAFork(field, opponent);
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         takeCenter: sendParent(
    //             function() {
    //                 console.log("takeCenter");
    //                 return {
    //                     type: "TURN_MADE",
    //                     selectedIndex: FIELD.CENTER,
    //                 };
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         takeOppositeCorner: sendParent(
    //             function(_, event) {
    //                 console.log("takeOppositeCorner");
    //                 // if my opponent is in a corner, and
    //                 // if the opposite corner is empty
    //                 const { field, role } = event as PLAY;
    //                 const opponent = getOpponent(role);
    //                 switch (true) {
    //                     case field[CORNER.TOP_LEFT] === opponent &&
    //                         field[CORNER.BOT_RIGHT] === null:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: CORNER.BOT_RIGHT,
    //                         };
    //                     case field[CORNER.TOP_RIGHT] === opponent &&
    //                         field[CORNER.BOT_LEFT] === null:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: CORNER.BOT_LEFT,
    //                         };
    //                     case field[CORNER.BOT_LEFT] === opponent &&
    //                         field[CORNER.TOP_RIGHT] === null:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: CORNER.TOP_RIGHT,
    //                         };
    //                     case field[CORNER.BOT_RIGHT] === opponent &&
    //                         field[CORNER.TOP_LEFT] === null:
    //                     default:
    //                         return {
    //                             type: "TURN_MADE",
    //                             selectedIndex: CORNER.TOP_LEFT,
    //                         };
    //                 }
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //         takeEmptySide: sendParent(
    //             function(_, event) {
    //                 console.log("takeEmptySide");
    //                 const { field } = event as PLAY;
    //                 return {
    //                     type: "TURN_MADE",
    //                     selectedIndex: sample(
    //                         [EDGE.TOP, EDGE.LEFT, EDGE.RIGHT, EDGE.BOT].filter(
    //                             edge => field[edge] === null,
    //                         ),
    //                     ),
    //                 };
    //             } as SendExpr<DeclarativePerfectActorContext, SimpleActorEvent>,
    //             DELAY,
    //         ),
    //     },
    // },
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
    );
}
