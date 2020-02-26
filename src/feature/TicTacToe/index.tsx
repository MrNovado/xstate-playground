import React, { useMemo, useEffect } from "react";
import { useMachine } from "@xstate/react";
import {
    ticTacToeMachine,
    getTurnOrder,
    isPlayerTurn,
    TicTacToeMachineActorTypes,
} from "./index.machine";

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
                    return <h1>{`${winSymbol} wins!`}</h1>;
                } else {
                    return <h1>It's a draw!</h1>;
                }
            }
            default:
                return (
                    <h1>
                        {getTurnOrder(field)}
                        {" : "}
                        {isPlayerTurn(field, actorTypes)
                            ? "Player!"
                            : "AI"}
                    </h1>
                );
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
            <BehaviorSelector
                name="X"
                defaultValue={actorTypes[0]}
                onChange={e =>
                    send({
                        type: "BEHAVIOR",
                        actor: "x",
                        actorType: e.target.value as TicTacToeMachineActorTypes,
                    })
                }
            />
            <BehaviorSelector
                name="0"
                defaultValue={actorTypes[1]}
                onChange={e =>
                    send({
                        type: "BEHAVIOR",
                        actor: "0",
                        actorType: e.target.value as TicTacToeMachineActorTypes,
                    })
                }
            />
            {turnOrder}
            <div className="grid grid-cols-3">
                {state.context.field.map((cell, index) => (
                    <div
                        onClick={
                            isPlayerTurn(field, actorTypes)
                                ? () =>
                                      send({
                                          type: "TURN_MADE",
                                          selectedIndex: index,
                                      })
                                : undefined
                        }
                        className="border h-10 flex flex-col justify-center items-center cursor-pointer"
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

function BehaviorSelector(props: {
    defaultValue: TicTacToeMachineActorTypes;
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    name: string;
}) {
    return (
        <select defaultValue={props.defaultValue} onChange={props.onChange}>
            <option value="simple">{props.name} is simple</option>
            <option value="greedy">{props.name} is greedy</option>
            <option value="perfect">{props.name} is perfect</option>
            <option value="player">{props.name} is player</option>
        </select>
    );
}
