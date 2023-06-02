import cron from "node-cron";
import { addRegisteredRole, getAllMembers, removeRegisteredRole } from "../services/DiscordService.js";
import { getOsuUser } from "../services/OsuService.js";
import { getAllRegistrations, removeRegistration, updateRegistration } from "../services/RegistrationService.js";
import { BadgeFilter, BwsRankCalc } from "../util/OsuUtils.js";

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

      for (let registration of registrations) {
        const member = members.find((m) => m.user.id === registration.discord.id);

        // Check if user is in the discord server
        if (!member) {
          // If not, remove their registration
          console.log(`User ${registration.id} is not in the discord server. Removing their registration.`);
          await removeRegistration(registration, "User is not in the discord server.", true);
          continue;
        }

        // Get updated osu user data
        const osuUser = await getOsuUser(registration.osu.id);

        // Check if user's bws rank is outside of 1000 to 30000
        const bwsRank = BwsRankCalc(osuUser.statistics.global_rank, BadgeFilter(osuUser));
        if (bwsRank < 1000 || bwsRank > 30000) {
          // If so, remove their registration
          console.log(`User ${registration.id} is outside of the rank range. Removing their registration.`);
          await removeRegistration(registration, "User is outside of the rank range.", true);
          continue;
        }

        updateRegistration(registration, osuUser, member);
      }
    } catch (error) {
      console.log("Error occurred while running registration update cron job.");
      console.log(error);
    }
    console.timeEnd("cron job time:");
  }
}
