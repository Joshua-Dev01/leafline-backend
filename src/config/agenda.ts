import Agenda from "agenda";
import mongoose from "mongoose";
import { sendEventReminder } from "../services/Events/controller/eventReminder.cron";

// Connect Agenda to MongoDB (reuse your existing mongoose connection)
export const agenda = new Agenda({
    mongo: (global as any).mongoose.connection,
    db: { collection: "agendaJobs" },
});

// Define the job
agenda.define("send-24h-event-reminder", async (job) => {
    const { eventId } = job.attrs.data as { eventId: string };
    await sendEventReminder(eventId);
});

// Start Agenda
(async function () {
    await agenda.start();
})();
