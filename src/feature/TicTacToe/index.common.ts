export interface SimpleActorSchema {
    states: {
        playing: {};
    };
}

export interface SimpleActorContext {}

export type PLAY = { type: "PLAY"; field: ("x" | "0" | null)[]; role: "x" | "0" };
export type TURN_MADE = { type: "TURN_MADE"; selectedIndex: number };
export type __ignore__ = { type: "__ignore__" };

export type SimpleActorEvent = PLAY | TURN_MADE | __ignore__;

export enum CORNER {
    TOP_LEFT = 0,
    TOP_RIGHT = 2,
    BOT_LEFT = 6,
    BOT_RIGHT = 8,
}

export enum EDGE {
    TOP = 1,
    LEFT = 3,
    RIGHT = 5,
    BOT = 8,
}

export const ROWS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
];

export const COLUMNS = [
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
];

export const DIAGONALS = [
    [0, 4, 8],
    [2, 4, 6],
];

export const FIELD = {
    CORNERS: CORNER,
    EDGES: EDGE,
    CENTER: 4,
    COMBINATIONS: [...ROWS, ...COLUMNS, ...DIAGONALS],
    ROWS,
    COLUMNS,
    DIAGONALS,
};

export function getOpponent(role: "x" | "0") {
    return role === "x" ? "0" : "x";
}