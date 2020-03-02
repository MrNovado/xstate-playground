const { Machine, interpret } = require("xstate");

const config = {
    initial: "initial",
    states: {
        initial: {
            on: {
                PLAY: [
                    // switch(true) { case transition.cond: ... } basically
                    {
                        cond: "check1",
                        actions: "action1",
                    },
                    {
                        cond: "check2",
                        actions: "action2",
                    },
                    {
                        cond: "check3",
                        actions: "action3",
                    },
                    {
                        cond: "check4",
                        actions: ["action1", "action2", "action3", "action4"],
                    },
                ],
            },
        },
    },
};

const machine1 = Machine(config, {
    guards: {
        check1: () => console.log("check1") && false,
        check2: () => console.log("check2") && false,
        check3: () => console.log("check3") && false,
        check4: () => console.log("check4") || true,
    },
    actions: {
        action1: () => console.log("action1"),
        action2: () => console.log("action2"),
        action3: () => console.log("action3"),
        action4: () => console.log("action4"),
    },
});

const ms1 = interpret(machine1).onTransition(() => console.log("==="));

ms1.start();
ms1.send("PLAY");
ms1.send("PLAY");
ms1.stop();
