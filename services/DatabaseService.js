import { XataClient } from "../xata.js";

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

export function removeRegistration() {
  // Implementation goes here
}

export function updateRegistration() {
  // Implementation goes here
}
