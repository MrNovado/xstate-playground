import React from "react";
import { useMachine } from "@xstate/react";
import {
    binaryToggleMachine,
    ternaryToggleMachine,
    progressiveToggleMachine,
} from "./Button.machine";

import "./Button.css";

export function Button(props: {
    state?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    children?: React.ReactNode;
}) {
    return (
        <button data-state={props.state} onClick={props.onClick}>
            {props.children}
        </button>
    );
}

export function BinaryToggle() {
    const [state, send] = useMachine(binaryToggleMachine);
    switch (true) {
        case state.matches("relaxed"): {
            return (
                <Button state="relaxed" onClick={() => send("TOGGLE")}>
                    Relaxed
                </Button>
            );
        }
        case state.matches("toggled"): {
            return (
                <Button state="toggled" onClick={() => send("TOGGLE")}>
                    Toggled
                </Button>
            );
        }
        default:
            // unreachable
            return null;
    }
}

export function TernaryToggle() {
    const [state, send] = useMachine(ternaryToggleMachine);
    switch (true) {
        case state.matches("undefined"): {
            return (
                <Button state="undefined" onClick={() => send("ENABLE")}>
                    Undefined
                </Button>
            );
        }
        case state.matches("relaxed"): {
            return (
                <Button state="relaxed" onClick={() => send("TOGGLE")}>
                    Relaxed
                </Button>
            );
        }
        case state.matches("toggled"): {
            return (
                <Button state="toggled" onClick={() => send("TOGGLE")}>
                    Toggled
                </Button>
            );
        }
        default:
            // unreachable
            return null;
    }
}

export function ProgressiveButton() {
    return <Button state="undefined">TernaryToggle</Button>;
}
