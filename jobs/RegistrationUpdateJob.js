import cron from "node-cron";
import { getAllRegistrations } from "../services/DatabaseService.js";
import { addRegisteredRole, getAllMembers, removeRegisteredRole } from "../services/DiscordService.js";

const endDate = new Date(Date.UTC(2023, 5, 12)); // June 12, 2023 @ 00:00:00 UTC

let task;

export function startRegistrationUpdateJob() {
  // This will run the job every 4 hours
  task = cron.schedule("0 */4 * * *", registrationUpdateJob, {
    scheduled: true,
    timezone: "UTC",
  });

  // TESTING ONLY
  registrationUpdateJob();

  task.start();
}

async function registrationUpdateJob() {
  const now = new Date();
  if (now > endDate) {
    console.log("Stopping cron job as the end date has been reached.");
    task.stop();
  } else {
    console.log("Running registration update cron job...");
    console.time("cron job time:");
    try {
      const registrations = await getAllRegistrations();
      const members = await getAllMembers();

      console.log("Registrations: ", registrations.length);
      console.log("Members: ", members.length);

      // Add or remove registration role
      for (let member of members) {
        const registration = registrations.find((reg) => reg.discord.id === member.user.id);

        if (registration) {
          if (registration.discord.id === member.user.id) {
            await addRegisteredRole(member);
          }
        } else {
          await removeRegisteredRole(member);
        }
      }

      /*
      for each registration:
        a. check if they are in the discord server, if not run removeRegistration (remove their registration from db, remove the role from discord, and remove their row in the sheet). return.
        b. update their osu and discord data with helper functions for both
        c. if bwsRank is outside of 1000 to 30000 run removeRegistration. return.
        d. if there are changes to any of osu.username, osu.country_code, osu.rank, osu.badges, discord.username, discord.discriminator, discord.avatar update those values in the db.
        e. check if their row exists and update their row in the sheet, if it doesn't exist add it
        c. if osu.username changed updateDiscordNickname()
      */
    } catch (error) {
      console.log("Error occurred while running registration update cron job.");
      console.log(error);
    }
    console.timeEnd("cron job time:");
  }
}
