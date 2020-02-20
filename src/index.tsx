import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Route, Switch, Link } from "react-router-dom";

import StatefullUI from "./page/StatefullUI";

function App() {
    return (
        <BrowserRouter>
            <Switch>
                <Route exact path="/">
                    <div className="v-list-1">
                        <span className="flex flex-col border border-solid border-black p-1 hover:shadow">
                            <Link to="/x-buttons">
                                Statefull buttons experiment
                            </Link>
                        </span>
                    </div>
                </Route>
                <Route path="/x-buttons" component={StatefullUI} />
            </Switch>
        </BrowserRouter>
    );
}

ReactDOM.render(<App />, document.getElementById("app"));
