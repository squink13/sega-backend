import axios from "axios";

let accessToken;
let expiresIn = 0;

async function getAccessToken() {
  let seconds = Math.floor(new Date().getTime() / 1000);

  if (seconds >= expiresIn) {
    let data = {
      client_id: process.env.OSU_CLIENT_ID,
      client_secret: process.env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    };

    try {
      let response = await axios.post("https://osu.ppy.sh/oauth/token", data);

      expiresIn = Math.floor(new Date().getTime() / 1000) + response.data.expires_in;
      accessToken = response.data.access_token;

      console.log("Got access token");
    } catch (error) {
      console.error("Error getting access token", error);
    }
  }

  return accessToken;
}

export async function getOsuUser(id) {
  try {
    let response = await axios.get(`https://osu.ppy.sh/api/v2/users/${id}/osu`, {
      headers: {
        Authorization: `Bearer ${await getAccessToken()}`,
      },
    });
    console.log(`Got osu data for user ${id}, ${response.data.username}`);
    return response.data;
  } catch (error) {
    console.error("Error getting osu data", error);
  }
}
