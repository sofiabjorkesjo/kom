import React, { Component } from 'react';
import Room from "./room"

class roomCollection extends Component {
    render() {
        console.log(this.props.rows.rows)
        let rows = this.props.rows.rows.map(function (row, i) {
            let cols = [];
            row.cols.map(function(col, j) {
                cols.push(<div key={"r" + i + "c" + j} className="col"><Room key={"r" + i + "c" + j + "r"} room={row.cols[j]}/></div>);
            });
            return <div key={"r" + i} className="row top-buffer mb-4">{cols}</div>
        });
        return (
            <div>
                {rows}
            </div>
        );
    }
}

export default roomCollection;
