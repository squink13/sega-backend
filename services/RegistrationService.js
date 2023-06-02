import { XataClient } from "../xata.js";
import { addSheetRow, removeSheetRow, updateSheetRow } from "./SheetService.js";

const xata = new XataClient();

export async function getAllRegistrations() {
  try {
    const records = await xata.db.registered.select(["*", "osu.*", "discord.*"]).getAll();
    return records;
  } catch (error) {
    console.log("Error getting all registrations", error);
  }
  return [];
}

export async function removeRegistration(registration, reason, canReapply) {
  // TODO: implement removeRegistration()
  // remove the registration from the db
  // remove the registration from the sheet
  // remove the registered role from the user
  // also message user to let them know they've been removed on discord + reason + canReapply
}

export function updateRegistration(registration, osuUser, member) {
  // TODO: implement updateRegistration()
  // check for changes to any of osu.username, osu.country_code, osu.rank, osu.badges,
  // discord.username, discord.discriminator, discord.avatar
  // if so, update those values in the db.
  // if so, check if their row exists and update their row in the sheet, if it doesn't exist add it
  // if username changes, update their discord nickname
}
