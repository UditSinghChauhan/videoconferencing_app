import { Meeting } from "../models/meeting.model.js";

const addMeetingToHistory = async ({ meetingCode, username }) => {
    const newMeeting = new Meeting({
        user_id: username,
        meetingCode
    });

    await newMeeting.save();
};

const getMeetingHistory = async (username) => {
    return Meeting.find({ user_id: username }).sort({ date: -1 });
};

export { addMeetingToHistory, getMeetingHistory };
