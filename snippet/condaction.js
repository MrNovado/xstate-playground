const config = {
    initial: "initial",
    states: {
        initial: {
            on: {
                PLAY: [
                    // it's a WHEN statement!
                    // switch(true) { case transition.cond: ... }
                    // only one transition will win!
                    {
                        cond: "check1",
                        // but action is also conditioned
                        actions: { cond: "cond1", action: "action1" },
                    },
                    {
                        cond: "check2",
                        // contitioned actions create a WHENEVER statement
                        actions: [
                            // all of these actions could be executed
                            { cond: "cond2", action: "action2" },
                            { cond: "cond3", action: "action3" },
                            "action4",
                            "action5",
                        ],
                    },
                ],
            },
        },
    },
};
