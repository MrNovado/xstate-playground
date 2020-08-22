import React from "react";
import { useLocation, useHistory } from "react-router-dom";

export function PageContainer(props: { children: React.ReactNode }) {
    const { pathname } = useLocation();
    const history = useHistory();
    const goBack = () => history.replace('/');
    return (
        <div>
            <div className="v-list-1">
                <button className="bg-orange-400" onClick={goBack}>GoBack</button>
                <h1>{pathname}</h1>
                <hr className="border-red-400 border-dashed"/>
            </div>
            <div>{props.children}</div>
        </div>
    );
}
