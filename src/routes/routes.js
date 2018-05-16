'use strict';

let RoomHandler = require('../handlers/roomHandler');

const Scraper = require('../libs/scraper');
const getEndTimeForBooking = require('../utils/endTimebooking');
const buildTable = require('../utils/buildTable');
const add15MinutesToTime = require('../utils/addMinutesToTime');

const timeEditApi = require('timeeditApi');
const timeEdit = timeEditApi('https://se.timeedit.net/web/lnu/db1/schema1/', 4);

let router = require("express").Router();
let moment = require('moment');
moment.locale('sv');

module.exports = function (RoomModel, BookingModel) {
    let Room = new RoomHandler(RoomModel, BookingModel);

    router.route('/')
        .get(async function (req, res) {
            let rooms = await Room.getRoomsFromDB();
            let bookings = await Room.getBookingsFromDB();
            let currentTime = moment().format('LT');

            let promises = rooms.map((room, i) => {
                return new Promise((resolve, reject) => {
                    let validatedRoom = Room.validateGroupRoom(bookings, room, currentTime);
                    resolve(validatedRoom);
                })
            })

            return Promise.all(promises)
                .then((groupRooms) => {
                    let table = buildTable(groupRooms);
                    return res.status(200).json({ rows: table });
                }).catch((error) => {
                    console.log(error)
                })
        })

    router.route('/:id')
        .get(async function (req, res) {
            let room = {};
            room.name = req.params.id;
            let available = false;
            let unavailable = false;
            let currentTime = moment().format('LT');
            let currentBooking;
            room.available = true;

            let booking = await Room.getSpecificBooking(req.params.id);
            if (booking.length > 0) {
                for(let i = 0; i < booking.length; i++) {
                    if(booking[i].bookingDate === moment().format('YYYY-MM-DD')) {
                        if(booking[i].startTime > currentTime ) {
                            available = true;
                        } else {
                            currentBooking = booking[i];
                            unavailable = true;
                        }
                    }       
                }

                if(available === true && unavailable === true || unavailable === true) {
                    room.available = false;
                    room.willBeAvailable = currentBooking.endTime;
                } else {
                    room.available = true;
                }
            } 
           else {
                let roomSchedule = await Room.getSpecificScheduleTimeEdit(room.name);
                
                if (roomSchedule === null || currentTime < roomSchedule[0].time.startTime) { 
                    room.available = true 
                }  else if (currentTime > roomSchedule[0].time.startTime) { 
                    room.available = false; 
                    room.willBeAvailable = roomSchedule[0].time.endTime; 
                }
            }

            //Sätter dagens schema för ett grupprum
            room.schedule = await Room.getCompleteScheduleToday(room.name);
            res.json({room});
        })
        .post(async function (req, res) {
            if(req.body.cancel) {
                let allBookings = await Room.getSpecificBooking(req.body.room);
                let currentBooking = allBookings.sort((a, b) => a.startTime.localeCompare(b.startTime))[0]; //todo: måste kolla vilket datum också, inte bara första bästa bokningen
                await Room.removeBookingWithStartTime(currentBooking);
            } else {
                let data = {
                    username: req.body.username,
                    roomID: req.body.room,
                    startTime: req.body.time,
                    duration: req.body.duration,
                    endTime: getEndTimeForBooking({startTime: req.body.time, duration: req.body.duration}),
                    bookingDate: moment().format('YYYY-MM-DD')
                }

                let month = JSON.stringify(req.body.date.month)
                if(month.length === 1) {
                    month = '0' + month;
                }

                let date = req.body.date.year + '-' + month + '-' + req.body.date.day;

                if (req.body.bookingDate) {
                    data.isBookLater = true;
                    data.hasUserCheckedIn = false;
                    data.bookingDate = req.body.bookingDate;
                } else {
                    data.isBookLater = false;
                    data.bookingDate = date;
                }

                let status = false;

                let firstPromise = new Promise(async function(resolve, reject) {
                    let bookings = await Room.getBookingsFromDB();
                    let matchBookings = [];
                    if(bookings.length === 0) {
                        status = true;
                    } else {
                        for(let i = 0; i < bookings.length; i++) {
                            if(bookings[i].roomID === req.body.room && bookings[i].bookingDate === data.bookingDate) {
                                matchBookings.push(bookings[i]);
                            } else {
                                status = true;
                            }
                        }
                    }
                    

                    if(status === true && matchBookings.length === 0) {
                        resolve('Success')
                    }

                    let statusWrong = false;
                    let statusRight = false;
                    
                    for(let i = 0; i < matchBookings.length; i++) {
                        if(data.startTime < matchBookings[i].endTime && data.endTime > matchBookings[i].startTime) {                 
                            statusWrong = true;
                        } else {
                            statusRight = true;
                        }
                    }

                    if(statusRight === true && statusWrong === true || statusWrong === true) {
                        reject('Fail')
                    } else if(statusRight === true) {
                        resolve('Success')
                    }
                });

                firstPromise.then(async function(value) {
                    let statusWrong = false;
                    let statusRight = false;
                    if(value === 'Success') {
                        let timeEditBookings = await Room.getSpecificScheduleTimeEditByDate(req.body.room, data.bookingDate);
                        if(timeEditBookings === null) {
                            console.log('inget i timeEdit, boka här')
                            let bookRoom = new BookingModel(data)
                            bookRoom.save((err) => {
                                if (!err) {
                                    console.log('Booking saved in DB.')
                                    return res.status(200).json({message: 'Booking successfully saved in DB.'});
                                }
                            }) 
                        } else {
                            for(let i = 0; i < timeEditBookings.length; i++) {
                                if(data.startTime < timeEditBookings[i].time.endTime && data.endTime > timeEditBookings[i].time.startTime) {
                                    statusWrong = true;
                                } else {
                                    statusRight = true;
                                }
                            }
                            if(statusWrong === true && statusRight === true || statusWrong === true) {
                                console.log('felmeddelande här = ej bokas.')
                            } else if(statusRight === true) {
                                console.log('bokas asa')
                                let bookRoom = new BookingModel(data)
                                bookRoom.save((err) => {
                                    if (!err) {
                                        console.log('Booking saved in DB.')
                                        return res.status(200).json({message: 'Booking successfully saved in DB.'});
                                    }
                                }) 
                            }
                        }
                    } 
                }).catch(function(error) {
                    console.log(error);
                })
            }   
        });

    router.route('/:roomID/schedule/today')
        .get(async (req, res) => {
            let schedule = await Room.getCompleteScheduleToday(req.params.roomID);
            res.send(JSON.stringify(schedule, null, 2));
        });

    router.route('/checkIn/:room')
        .get(function(req, res) {
            let currentTime = moment().format('LT');
            BookingModel.find({roomID: req.body.room}, function(err, rooms) {
                if(err) {
                    console.log(err)
                } else {
                    let booking = rooms.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
                    if(booking.isBookLater === true) {
                        if(booking.hasUserCheckedIn === true) {
                            console.log('Nu ska bakgrunden bli röd')
                        } else if(currentTime > add15MinutesToTime(booking.startTime)) {
                            BookingModel.findOneAndRemove({roomID: req.body.room, startTime: booking.startTime}, function(err, result) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    console.log('deleted from DB')
                                }
                            })
                        }
                    }
                }
            })
        })
        .post(function(req, res) {
            //ta emot post från checka in
        })

    router.route('/room/:roomID/schedule/')
        .get(function (req, res) {
            // full schedule     
            timeEdit.getSchedule(req.params.roomID)
                .then((schedule) => {
                    let array = [];
                    for (let i = 0; i < schedule.length; i++) {
                        let data = {
                            startTime: schedule[i].time.startTime,
                            endTime: schedule[i].time.endTime,
                            bookingID: schedule[i].bookingId,
                            info: schedule[i].columns[2]
                        }
                        array.push(data);
                    }
                    res.send(JSON.stringify(array, null, 2));
                }).catch((er) => {
                    console.log(er);
                });
        });

    return router;
}
