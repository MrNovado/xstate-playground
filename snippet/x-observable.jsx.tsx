/**
 * Atoms to generate schema typings
 * (and implementation as well?) for the actual actors.
 *
 * Process:
 * 1. Describe a machine using components.
 * 2. Compile a machine into schema typings.
 * 3. Use the schema to create an actor.
 */

function Actor(props) {
    return null;
}

function StateNode(props) {
    return null;
}

function Machine(props) {
    return (
        <Actor
            context={
                {
                    /* context obj */
                }
            }
            initial="init"
            states={[
                <StateNode name="init">
                    <StateNode></StateNode>
                    <StateNode></StateNode>
                    <StateNode></StateNode>
                    <StateNode></StateNode>
                </StateNode>,
            ]}
            on={
                {
                    /* event-to-effect map */
                }
            }
        />
    );
}
