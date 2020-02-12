import sample from "lodash.sample";
import React, { useReducer } from "react";
import ReactDOM from "react-dom";
import { Button, BinaryToggle, TernaryToggle } from "./Button";

type BtnVariant = "binary" | "ternary";
type BtnVarianList = BtnVariant[];
const btnVariant: BtnVarianList = ["binary", "ternary"];

function shuffleBtns() {
    return Array(10).fill(0).map(_it => sample(btnVariant)) as BtnVarianList;
}

type AppActionVariant = "shuffle-btns";
function btnListReducer(
    state: BtnVarianList,
    action: AppActionVariant,
): BtnVarianList {
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
                {state.map((type, index) =>
                    type === "binary" ? (
                        <BinaryToggle key={index} />
                    ) : (
                        <TernaryToggle key={index} />
                    ),
                )}
            </>
            <Button onClick={() => send("shuffle-btns")}>Shuffle</Button>
        </div>
    );
}

ReactDOM.render(<App />, document.getElementById("app"));
