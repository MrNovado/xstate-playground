const { Machine, interpret } = require("xstate");

const config = {
    initial: "initial",
    states: {
        initial: {
            on: {
                PLAY: [
                    // first try to return an action (or a list) wins
                    {
                        // coupled action and condition:
                        // (context, event) => action | false
                        trys: "try1",
                    },
                    {
                        trys: "try2",
                    },
                    {
                        trys: "try3",
                    },
                    {
                        // list of trys like that makes no sense?
                        // would it then make more sense to have try as a
                        // (context, event) => action | action[] | false
                        trys: ["try1", "try2", "try3", "try4"],
                    },
                ],
            },
        },
    },
};

const machine1 = Machine(config, {
    trys: {
        action1: () => Math.random() > 0.2 ? console.log("try1") : false,
        action2: () => Math.random() > 0.2 ? console.log("try2") : false,
        action3: () => Math.random() > 0.2 ? console.log("try3") : false,
        action4: () => console.log("try4"),
    },
});

const ms1 = interpret(machine1).onTransition(() => console.log("==="));

ms1.start();
ms1.send("PLAY");
ms1.send("PLAY");
ms1.stop();
