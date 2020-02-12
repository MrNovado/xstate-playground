import sample from "lodash.sample";
import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import { Button, BinaryToggle, TernaryToggle } from "./Button";

type BtnVariantList = ("binary" | "ternary")[];
const btnVariantList: BtnVariantList = ["binary", "ternary"];

function shuffleBtns() {
    return Array(10)
        .fill(0)
        .map(_it => sample(btnVariantList)) as BtnVariantList;
}

type AppActionVariant = "shuffle-btns";
function btnListReducer(
    state: BtnVariantList,
    action: AppActionVariant,
): BtnVariantList {
    switch (action) {
        case "shuffle-btns":
            return shuffleBtns();
        default:
            return state;
    }
}

function App() {
    const [state, send] = useReducer(btnListReducer, shuffleBtns());
    return (
        <div className="flex flex-col flex-gap-1">
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

ReactDOM.render(<App />, document.getElementById("app"));
