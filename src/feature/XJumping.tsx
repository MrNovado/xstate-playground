import React from 'react';
import { createMachine } from "xstate";
import { useMachine } from "@xstate/react";

const machine = createMachine({
  context: { Y: 0, jumpEffectId: null, doEffect: null },
  states: {
    idling: {
      on: {
        "jump-requested": {
          target: 'jump-preparing',
          actions: ['assignDoEffectPrepareJump']
        }
      }
    },
    'jump-preparing': {
      on: {
        "jump-started": {
          target: 'jumping',
          actions: ['assignJumpEffectId']
        }
      }
    },
    'jumping': {
      on: {
        "rised": {},
        "falled": {},
      }
    },
    'grounding': {
      on: {
        "grounded": {
          target: 'idling',
          actions: ['clearJumpingContext']
        }
      }
    }
  }
}, {
  // TODO:
  
  // actions: {
  //   assignDoEffectPrepareJump: () => ...
  // }
});

export default function() {
  const [state, send] = useMachine(machine);

  // React.useEffect -> jump effect

  return {}
}