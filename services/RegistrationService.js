import fetch from "node-fetch";
import { generateAvatarUrl, getDiscordTag } from "../util/DiscordUtils.js";
import { BadgeFilter } from "../util/OsuUtils.js";
import { XataClient } from "../xata.js";
import { removeRegisteredRole, sendDirectMessage, updateDiscordNickname } from "./DiscordService.js";
import { createOrUpdateSheetRow, removeSheetRow } from "./SheetService.js";

const xata = new XataClient({ fetch: fetch });

export async function getAllRegistrations() {
  try {
    const records = await xata.db.registered.select(["*", "osu.*", "discord.*"]).getAll();
    return records;
  } catch (error) {
    console.log("Error getting all registrations", error);
  }
  return [];
}

export async function removeRegistration(registration, member, reason, canReapply) {
  // remove the registered role from the user
  if (member) {
    await removeRegisteredRole(member);
  }

  // remove the registration from the sheet
  await removeSheetRow(registration.id);

  // remove the registration from the db
  const record = await xata.db.registered.delete(registration.id);

  // send a dm to the user
  if (record) {
    try {
      await sendDirectMessage(
        registration.discord.id,
        `${
          registration.discord.username
        }, your registration for Squink's Epic Gacha Showdown has been removed. Reason: ${reason}. ${
          canReapply
            ? "You may reapply if you are still interested in participating."
            : "At this time you cannot reapply."
        }\nThis bot does not read messages, please contact Squink#7672 for more information.`
      );
    } catch (error) {
      console.error(`Failed to send DM to user: ${registration.discord.id}`);
    }
  }
}

export async function updateRegistration(registration, osuUser, member) {
  let newRegistration = JSON.parse(JSON.stringify(registration)); // Deep clone the object
  let changes = { discord: {}, osu: {} };

  newRegistration.created_at = new Date(newRegistration.created_at); // ensure data type is correct
  newRegistration.osu.rank = parseInt(newRegistration.osu.rank, 10); // ensure data type is correct

  // Check for changes to the osu user
  const osuFields = ["username", "country_code", "rank", "badges"];

  const osuFieldValues = {
    username: osuUser.username,
    country_code: osuUser.country_code,
    rank: parseInt(osuUser.statistics.global_rank, 10),
    badges: BadgeFilter(osuUser),
  };

  osuFields.forEach((field) => {
    if (osuFieldValues[field] !== newRegistration.osu[field]) {
      changes.osu[field] = osuFieldValues[field]; // Set on changes.osu
      newRegistration.osu[field] = osuFieldValues[field];
    }
  });

  // Check for changes to the discord member
  const discordFields = ["username", "discriminator", "avatar"];

  const discordFieldValues = {
    username: member.user.username,
    discriminator: parseInt(member.user.discriminator, 10),
    avatar: member.user.avatar,
  };

  discordFields.forEach((field) => {
    if (discordFieldValues[field] !== newRegistration.discord[field]) {
      changes.discord[field] = discordFieldValues[field]; // Set on changes.discord
      newRegistration.discord[field] = discordFieldValues[field];
    }
  });

  // If any username has changed, update their discord nickname
  if (changes.discord.username || changes.osu.username) {
    console.log("running update discord nickname...");
    await updateDiscordNickname(osuUser.username, member);
  }

  // If avatar has changed, update their discord avatar url
  if (changes.discord.avatar) {
    console.log("updating avatar url");
    newRegistration.discord.avatar_url = generateAvatarUrl(member.user.id, member.user.avatar);
    changes.discord.avatar_url = generateAvatarUrl(member.user.id, member.user.avatar);
  }

  // If there are any changes, update the db and sheet.
  if (Object.keys(changes).length > 0) {
    console.log(`User ${newRegistration.id} data has changed. Updating their registration.`);
    console.log(changes);

    // update the db
    try {
      const discordChanges = changes.discord || {};
      const osuChanges = changes.osu || {};

      if (Object.keys(discordChanges).length > 0) {
        await xata.db.discord_profile.update(`${newRegistration.discord.id}`, discordChanges);
        console.log("Discord profile updated in db");
      }

      if (Object.keys(osuChanges).length > 0) {
        await xata.db.osu_profile.update(`${newRegistration.osu.id}`, osuChanges);
        console.log("Osu profile updated in db");
      }
    } catch (error) {
      console.log("Error updating registration in db", error);
    }

    // update the sheet
    const row = {
      Timestamp: newRegistration.created_at.toISOString().slice(0, -1),
      ID: newRegistration.id,
      Username: newRegistration.osu.username,
      Flag: newRegistration.osu.country_code,
      Rank: newRegistration.osu.rank,
      Badges: newRegistration.osu.badges,
      Discord: getDiscordTag(newRegistration.discord.username, newRegistration.discord.discriminator),
      Timezone: newRegistration.tz,
      Title: newRegistration.title,
      Aim: newRegistration.aim,
      Control: newRegistration.control,
      Speed: newRegistration.speed,
      Reading: newRegistration.reading,
      Stamina: newRegistration.stamina,
      Tech: newRegistration.tech,
    };
    await createOrUpdateSheetRow(row);
  }
}
