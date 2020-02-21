import React, { useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import { ticTacToeMachine } from "./TicTacToe.machine";

export default function TicTacToe() {
    const [state, send] = useMachine(ticTacToeMachine);
    const { winCombo, field, turnOrder } = state.context;

    const controls = useMemo(() => {
        switch (true) {
            case state.matches("init"):
                return <button onClick={() => send("START")}>START</button>;
            case state.matches("finale"):
                return <button onClick={() => send("RETRY")}>RETRY</button>;
            default:
                return (
                    <button disabled className="opacity-50">
                        IN PROGRESS
                    </button>
                );
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
            <h1>{turnOrder === "actor1" ? "X" : "O"}:</h1>
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
