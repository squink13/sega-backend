import axios from "axios";

const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = "1089693219383676948";
const registeredRoleId = "1100250097008246876";

export function getDiscordUser() {}

export async function getAllMembers() {
  let members = [];
  let after = 0;

  while (true) {
    try {
      const response = await axios.get(`https://discord.com/api/guilds/${guildId}/members`, {
        params: {
          limit: 1000,
          after: after,
        },
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      });

      // If the server doesn't have any more members, break the loop
      if (response.data.length === 0) {
        break;
      }

      // Add the returned members to our members array
      members = members.concat(response.data);
      // Set 'after' to the id of the last member returned in this batch
      after = response.data[response.data.length - 1].user.id;
    } catch (error) {
      console.log("Error getting members", error.config);
      break;
    }
  }

  return members;
}

export async function addRegisteredRole(member) {
  // Check if user already has role first if not then run this
  if (!member.roles.includes(registeredRoleId)) {
    try {
      await axios.put(
        `https://discord.com/api/guilds/${guildId}/members/${member.user.id}/roles/${registeredRoleId}`,
        {},
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`Added registered role to member ${member.user.id}`);
    } catch (error) {
      console.log(`Error adding registered role to member ${member.user.id}`, error.config);
    }
  }
  return;
}

export async function removeRegisteredRole(member) {
  if (member.roles.includes(registeredRoleId)) {
    try {
      await axios.delete(
        `https://discord.com/api/guilds/${guildId}/members/${member.user.id}/roles/${registeredRoleId}`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`Removed registered role from member ${member.user.id}`);
    } catch (error) {
      console.log(`Error removing registered role from member ${member.user.id}`, error.config);
    }
  }
  return;
}

export async function updateDiscordNickname(newName, member) {
  let data = {
    nick: newName,
  };

  if (newName === member.user.username) {
    // To remove the nickname, we need to send a null value for nick.
    data.nick = null;
  }

  try {
    await axios.patch(`https://discord.com/api/guilds/${guildId}/members/${member.user.id}`, data, {
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log(`Nickname updated successfully for user ${member.user.id}`);
  } catch (error) {
    console.error(`Error updating nickname for user ${member.user.id}:`, error);
  }
}

export async function sendDirectMessage(userId, message) {
  try {
    // Step 1: Create a DM channel with the user.
    let response = await axios.post(
      `https://discord.com/api/users/@me/channels`,
      { recipient_id: userId },
      {
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Check if response is successful
    if (response.data && response.data.id) {
      let dmChannelId = response.data.id;

      // Step 2: Send a message to the created DM channel.
      await axios.post(
        `https://discord.com/api/channels/${dmChannelId}/messages`,
        { content: message },
        {
          headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`Message sent successfully to user ${userId}`);
    } else {
      console.error(`Error creating DM channel with user ${userId}`);
    }
  } catch (error) {
    console.error(`Error sending direct message to user ${userId}`);
  }
}
