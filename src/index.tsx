import React from "react";
import ReactDOM from "react-dom";
import { HashRouter, Route, Redirect, Switch, Link } from "react-router-dom";

import StatefullUI from "./page/StatefullUI";
import TicTacToe from "./page/TicTacToe";
import PingPong from "./page/PingPong";
import Jumping from "./page/Jumping";

const LINK_CLASSES =
    "flex flex-col border border-dashed border-black p-1 hover:shadow";

function App() {
    return (
        <HashRouter basename="/">
            <Switch>
                <Route exact path="/">
                    <div className="v-list-1">
                        <span className={LINK_CLASSES}>
                            <Link to="/x-buttons">
                                Statefull buttons experiment
                            </Link>
                        </span>
                        <span className={LINK_CLASSES}>
                            <Link to="/x-tictactoe">Tic-tac-toe game</Link>
                        </span>
                        <span className={LINK_CLASSES}>
                            <Link to="/x-pingpong">Ping-pong</Link>
                        </span>
                        <span className={LINK_CLASSES}>
                            <Link to="/jumping">Jumping</Link>
                        </span>
                    </div>
                </Route>
                <Route path="/x-buttons" component={StatefullUI} />
                <Route path="/x-tictactoe" component={TicTacToe} />
                <Route path="/x-pingpong" component={PingPong} />
                <Route path="/jumping" component={Jumping} />
                <Route>
                    <Redirect to="/" />
                </Route>
            </Switch>
        </HashRouter>
    );
}

ReactDOM.render(<App />, document.getElementById("app"));
