import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch, Link } from "react-router-dom";

import StatefullUI from "./page/StatefullUI";
import TicTacToe from "./page/TicTacToe";
import PingPong from "./page/PingPong";

const LINK_CLASSES =
    "flex flex-col border border-dashed border-black p-1 hover:shadow";

function App() {
    return (
        <BrowserRouter>
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
                    </div>
                </Route>
                <Route path="/x-buttons" component={StatefullUI} />
                <Route path="/x-tictactoe" component={TicTacToe} />
                <Route path="/x-pingpong" component={PingPong} />
            </Switch>
        </BrowserRouter>
    );
}

ReactDOM.render(<App />, document.getElementById("app"));

console.log("hello!");
