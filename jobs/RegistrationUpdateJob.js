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

let task;
const endDate = new Date(Date.UTC(2023, 5, 13, 0, 10)); // June 12, 2023 @ 00:10:00 UTC

export function startRegistrationUpdateJob() {
  // This will run the job every 4 hours
  cron.schedule(
    "0 */6 * * *",
    () => {
      console.log("Running registration update cron job...");
      registrationUpdateJob();
    },
    {
      scheduled: true,
      timezone: "UTC",
    }
  );

  sendDirectMessage("194198021829951489", "Project successfully built & initialized.");

  // TESTING ONLY
  registrationUpdateJob();
}

async function registrationUpdateJob() {
  const now = new Date();
  if (now > endDate) {
    console.log("Warning: end date has been reached.");
  } else {
    await sendDirectMessage("194198021829951489", "Registration update cron job started.");
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
        /* if (!member) {
          // If not, remove their registration
          console.log(`User ${registration.id} is not in the discord server. Removing their registration.`);
          await removeRegistration(registration, member, "User is not in the discord server", true);
          continue;
        } */

        // Get updated osu user data
        const osuUser = await getOsuUser(registration.osu.id);

        // Check if user's bws rank is outside of 1000 to 30000
        /* const bwsRank = BwsRankCalc(osuUser.statistics.global_rank, BadgeFilter(osuUser));
        if (bwsRank < 1000 || bwsRank > 30000) {
          // If so, remove their registration
          console.log(`User ${registration.id} is outside of the rank range. Removing their registration.`);
          await removeRegistration(registration, member, "User is outside of the rank range after BWS", true);
          continue;
        } */

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

export async function updateUsernames() {
  await initializeSheetService();
  const members = await getAllMembers();
  const registrations = await getAllRegistrations();
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

    if (!member) {
      console.log(`User ${registration.osu.username} [${registration.id}] is not in the discord server.`);
    } else {
      const osuUser = await getOsuUser(registration.osu.id);
      await updateRegistration(registration, osuUser, member);
    }
    console.log("==================================");
  }
}
