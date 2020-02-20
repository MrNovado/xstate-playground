import sample from "lodash.sample";
import React, { useReducer } from "react";
import { Button, BinaryToggle, TernaryToggle } from "../component/Button";

type BtnVariant = "binary" | "ternary";
type BtnVariantList = BtnVariant[];
const btnVariantList: BtnVariantList = ["binary", "ternary"];

function shuffleBtns() {
    let btns: BtnVariantList = [];
    for (let i = 0; i < 10; i++) {
        btns.push(sample(btnVariantList) as BtnVariant);
    }
    return btns;
}

type Action = "shuffle-btns";
function btnListReducer(
    state: BtnVariantList,
    action: Action,
): BtnVariantList {
    switch (action) {
        case "shuffle-btns":
            return shuffleBtns();
        default:
            return state;
    }
}

export default function StatefullButtons() {
    const [state, send] = useReducer(btnListReducer, shuffleBtns());
    return (
        <div className="v-list-1">
            <>
                {state.map(function renderButtons(type, index) {
                    switch (type) {
                        case "binary":
                            return <BinaryToggle key={index} />;
                        case "ternary":
                            return <TernaryToggle key={index} />;
                        default:
                            return null;
                    }
                })}
            </>
            <Button onClick={() => send("shuffle-btns")}>Shuffle</Button>
        </div>
    );
}
