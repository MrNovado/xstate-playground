import React, { useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import { ticTacToeMachine, getTurnOrder } from "./TicTacToe.machine";

export default function TicTacToe() {
    const [state, send] = useMachine(ticTacToeMachine);
    const { winCombo, field, actorTypes } = state.context;

    // memo actually doesnt do anything here,
    // but wrap switch statements nicely
    const turnOrder = useMemo(() => {
        switch (true) {
            case state.matches("finale"): {
                if (winCombo) {
                    const [winCell] = winCombo;
                    const winSymbol = field[winCell];
                    return <h2>{`${winSymbol} wins!`}</h2>;
                } else {
                    return <h2>It's a draw!</h2>;
                }
            }
            default:
                return <h2>{getTurnOrder(field)}:</h2>;
        }
    }, [state]);

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
            <select
                defaultValue={actorTypes[0]}
                onChange={e =>
                    send({
                        type: "BEHAVIOR",
                        actor: "x",
                        actorType: e.target.value as "simple" | "greedy",
                    })
                }>
                <option value="simple">X is simple</option>
                <option value="greedy">X is greedy</option>
            </select>
            <select
                defaultValue={actorTypes[1]}
                onChange={e =>
                    send({
                        type: "BEHAVIOR",
                        actor: "0",
                        actorType: e.target.value as "simple" | "greedy",
                    })
                }>
                <option value="simple">0 is simple</option>
                <option value="greedy">0 is greedy</option>
            </select>
            {turnOrder}
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
