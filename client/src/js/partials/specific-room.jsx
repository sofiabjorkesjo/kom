import React, { Component } from 'react';
import {connect} from "react-redux"; //read
import {bindActionCreators} from "redux"; //write
import event from "../actions/busy-state";

import $ from "jquery"

import Duration from "./durationSelector";
import Confirm from "./confirm";
import Book from "./book";

class room extends Component {
    constructor(props) {
        super(props)
        this.props.busy(this.props.room.available);
        $( document ).ready(function() {
            $("#book").submit((e) => {
                e.preventDefault()

                let data = {};
                let buttons = $(".btn-group").children();
                let active
                $.each(buttons, function(key, value) {
                    if($(value).hasClass("active") === true) {
                        active = value;
                    }
                });

                //username, time, duration
                data.username = $("#username").val();
                data.time = $("#currentTime").val();
                data.duration = $($(active).children()[0]).val();

                fetch($(e.target).attr("action"), {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                    });
            })
        });
    }

    stateHeader() {
        let available = this.props.room.available;
        let toReturn;
        if(available === true) {
            toReturn = (<h1 id="state" className="text-center animated fadeIn" data-toggle="tooltip" data-placement="top" title="This room is currently available!">Available</h1>);
        } else if(available === false) {
            toReturn = (<h1 id="state" className="text-center animated fadeIn" data-toggle="tooltip" data-placement="top" title="This room is currently available!">Unavailable</h1>);
        }
        return toReturn;
    }

    clock() {
        return(<h1 id="clock" className="text-center animated slideInUp" data-toggle="tooltip" data-placement="top" title="Current time!"></h1>);
    }

    booking() {
        let available = this.props.room.available;
        if(available === true) {
            return (
                <div id="book" className="animated fadeIn">
                    <div className="row justify-content-center">
                        <form id="bookingForm" className="form-inline" action={"http://www.localhost:2000/" + this.props.room.room.name} method="post">
                            <input type="time" id="currentTime" name="time" hidden/>
                            <Book/>
                            <div className="col-md-auto">
                                <div className="btn-group btn-group-toggle" data-toggle="buttons">
                                    <Duration duration="1"/>
                                    <Duration duration="2"/>
                                    <Duration duration="3"/>
                                </div>
                            </div>
                            <Confirm room={this.props.room.room.name}/>
                        </form>
                    </div>
                </div>);
        }
    }

    async getUpdatedInfo() {
        let room = this.props.submit;
        let info = await fetch("http://localhost:2000/" + room);
        info = await info.json();
        console.log(info);
    }

    render() {
        let room = this.props.room.room;
        console.log(this.props.submit);
        if(this.props.submit != null) {
            this.getUpdatedInfo();
        }
        return (
        <div>
            {this.stateHeader()}
            <div class="text-center">
                <i class="fas fa-users fa-2x" title="Capacity"></i><span class="h3">5</span>
                <i class="fas fa-laptop fa-2x mr-2" title="Computer equipment"></i>
                <i class="fab fa-product-hunt fa-2x mr-2" title="Projector"></i>
            </div>
            {this.booking()}
            {this.clock()}
        </div>
        );
    }
}

function read(db) {
    return{
        submit: db.submit
    };
}
  
function write(dispatch) {
    return bindActionCreators({
        busy: event
    }, dispatch);
}
  
export default connect(read, write)(room);
  
