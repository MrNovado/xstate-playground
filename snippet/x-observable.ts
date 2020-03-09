/**
 * Cannot describe heterogeneous trees using types...
 * Hence, the entire schema have to be generated from something else first!
 */

interface Context {}

type StateType = string;
type State<St extends StateType = any, Sch extends Schema = any> = {
    [K in St]: Sch;
};

interface Schema<
    Ctx extends Context = any,
    E2T extends Ev2Tr = any,
    ChildState extends State = any
> {
    context: Ctx;
    on: E2T;
    states: ChildState;
    initial: keyof ChildState;
}

type EventType = string;
type AEvent<T extends EventType, P> = { kind: "event"; type: T; payload: P };

type Transition<St extends State = any> = {
    kind: "transition";
    target: keyof St;
    try: () => {};
}[];

type Ev2Tr<Et extends EventType = any, Tr extends Transition = any> = {
    [K in Et]: Tr;
};

const Schema: Schema = {
    context: {},
    on: {},
    initial: "",
    states: {},
};
