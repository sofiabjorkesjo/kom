import {
    GET_ROOM,
    UPDATE_ROOM,
  } from '../js/actions/room-state'


let rooms = {};

init();

async function init() {
    let list = await getAllRooms();
    console.log(list);
    populate(rooms, list);
    console.log(rooms); 
}

async function populate(obj, rooms) {
    rooms.forEach((row) => {
        row = row["cols"];
        row.forEach((col) => {
            obj[col.room.name] = {available: col.available, name: col.room.name};
        });
    });
}

async function getAllRooms() {
    let rooms = await fetch("/rooms");
    rooms = await rooms.json();
    return rooms["rows"];
}

async function cancel(name, user) {
    let data = {};
    data.room = name;
    data.cancel = true;
    data.username = user;

    fetch(`/room/${name}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    console.log("sent cancel request for " + name);
}

async function checkin(name, user) {
    let data = {};
    data.room = name;
    data.user = user;
    fetch(`/checkIn/${name}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    console.log("sent checkin request for " + name);
}

export default function(state = null, action) {
    switch(action.type) {
        case "CHECK_IN":
            checkin(action.value.name, action.value.user);
            break;
        case "BOOKING_CANCELED":
            cancel(action.value.name, action.value.user);
            break;
        case GET_ROOM:
            return rooms;
        case "ROOM_BOOKED":
            rooms[action.value].available = false;
            break;
        case UPDATE_ROOM:
            rooms[action.value.name] = action.value;
            return true;
        default:
            return rooms;
    }
}