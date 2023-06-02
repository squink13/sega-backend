import cron from "node-cron";
import {
  addRegisteredRole,
  getAllMembers,
  removeRegisteredRole,
  sendDirectMessage,
} from "../services/DiscordService.js";
import { getOsuUser } from "../services/OsuService.js";
import { getAllRegistrations, removeRegistration, updateRegistration } from "../services/RegistrationService.js";
import { getAllRows, initializeSheetService, removeSheetRow } from "../services/SheetService.js";
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
    sendDirectMessage("194198021829951489", "Registration update cron job started.");
    console.log("Running registration update cron job...");
    console.time("cron job time:");

    try {
      await initializeSheetService();

      const registrations = await getAllRegistrations();
      const members = await getAllMembers();
      const rows = await getAllRows();

      console.log("Registrations: ", registrations.length);
      console.log("Members: ", members.length);

      // Remove rows that are not in the database
      for (let row of rows) {
        // Check if this row's ID exists in registrations
        const registration = registrations.find((reg) => reg.id === row.ID);

        if (!registration) {
          // If not, remove this row from the sheet
          console.log(`Row ${row.rowIndex} does not have a matching registration. Removing it from the sheet.`);
          await removeSheetRow(row.ID);
        }
      }

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
          await removeRegistration(registration, member, "User is not in the discord server", true);
          continue;
        }

        // Get updated osu user data
        const osuUser = await getOsuUser(registration.osu.id);

        // Check if user's bws rank is outside of 1000 to 30000
        const bwsRank = BwsRankCalc(osuUser.statistics.global_rank, BadgeFilter(osuUser));
        if (bwsRank < 1000 || bwsRank > 30000) {
          // If so, remove their registration
          console.log(`User ${registration.id} is outside of the rank range. Removing their registration.`);
          await removeRegistration(registration, member, "User is outside of the rank range after BWS", true);
          continue;
        }

        await updateRegistration(registration, osuUser, member);
        console.log("==================================");
      }
    } catch (error) {
      console.log("Error occurred while running registration update cron job.");
      console.log(error);
    }
    console.timeEnd("cron job time:");
    sendDirectMessage("194198021829951489", "Registration update cron job ended.");
  }
}
