import React from "react";

type State = {
  Y: number;
  phase: "idling" | "jump-preparing" | "jumping" | "grounding";
  jumpEffectId: number | null;
  doEffect:
    | { kind: "!prepare-jump" }
    | { kind: "!ground"; jumpEffectId: number | null }
    | null;
};

type Actions =
  | { kind: "jump-requested" }
  | { kind: "jump-started"; jumpEffectId: number }
  | { kind: "rised"; inc: number }
  | { kind: "falled"; dec: number }
  | { kind: "grounded" };

function reducer(state: State, action: Actions): State {
  console.warn(action.kind);

  switch (state.phase) {
    case "idling":
      switch (action.kind) {
        case "jump-requested":
          return {
            ...state,
            phase: "jump-preparing",
            doEffect: { kind: "!prepare-jump" },
          };
      }

    case "jump-preparing": {
      switch (action.kind) {
        case "jump-started":
          return {
            ...state,
            phase: "jumping",
            jumpEffectId: action.jumpEffectId,
          };
      }
    }

    case "jumping":
      switch (action.kind) {
        case "rised":
          return { ...state, Y: state.Y + action.inc };
        case "falled":
          const fallTo = state.Y - action.dec;
          const goingUnderGround = fallTo < 0;

          if (goingUnderGround) {
            return {
              ...state,
              phase: "grounding",
              doEffect: { kind: "!ground", jumpEffectId: state.jumpEffectId },
            };
          } else {
            return { ...state, Y: fallTo };
          }
      }

    case "grounding":
      switch (action.kind) {
        case "grounded":
          return {
            ...state,
            Y: 0,
            phase: "idling",
            doEffect: null,
            jumpEffectId: null,
          };
      }
  }

  console.error(action.kind, "ignored");
  return state;
}

export default function Jumping() {
  const [state, send] = React.useReducer(reducer, {
    Y: 0,
    phase: "idling",
    doEffect: null,
    jumpEffectId: null,
  });

  console.info(state);

  React.useEffect(
    function doEffects() {
      switch (state.doEffect?.kind) {
        case "!prepare-jump":
          {
            const risingTo = 100;
            const risingTime = .2 * 1000;
            const tickTime = 10;

            const riseTicks = risingTime / tickTime;
            const riseInc = risingTo / riseTicks;

            // let Y = state.Y;
            let tickTracker = 0;

            const jumpEffectId = setInterval(function riseAndFall() {
              tickTracker += 1;

              switch (true) {
                // rised
                case tickTracker < riseTicks:
                  send({
                    kind: "rised",
                    inc: riseInc,
                  });
                  break;

                // falled
                default:
                  send({
                    kind: "falled",
                    dec: riseInc * (tickTracker - riseTicks) * 0.4,
                  });
                  break;
              }
            }, tickTime);

            send({ kind: "jump-started", jumpEffectId });
          }
          break;

        case "!ground":
          clearInterval(state.doEffect.jumpEffectId || 0);
          send({ kind: "grounded" });
          break;
      }
    },
    [state.doEffect],
  );

  const effectRef = React.useRef<number | null>(null);
  effectRef.current = state.jumpEffectId;
  React.useEffect(function onMount() {
    // do once when mounted
    console.log("mount");
    return function onUnMount() {
      // do once when un-mounted
      console.log("unmount");
      clearInterval(effectRef.current || 0);
    };
  }, []);

  return (
    <div className="v-list-1">
      <button
        className="bg-orange-400"
        onClick={() => send({ kind: "jump-requested" })}>
        Jump
      </button>
      <div
        style={{
          border: "1px solid black",
          height: 480,
          position: "relative",
        }}>
        <div
          style={{
            position: "absolute",
            bottom: state.Y,
            width: 20,
            height: 20,
            left: "50%",
            backgroundColor: "pink",
            boxShadow: "0 0 1px 1px black",
          }}
        />
      </div>
    </div>
  );
}
