import Ably from "ably";

let appState = "paused";

const ably = new Ably.Realtime.Promise(process.env.ABLY_API_KEY);
await ably.connection.once("connected");
console.log("Ably connected");

// get the channel to subscribe to
const channel = ably.channels.get("draft");

/* 
  Subscribe to a channel. 
  The promise resolves when the channel is attached 
  (and resolves synchronously if the channel is already attached).
*/
await channel.subscribe("update", (message) => {
  if (message.data.state === "paused") {
    appState = "paused";
  }
});

await channel.publish("greeting", "hello!");

const UR_MULTIPLIER_BASE = 1.07;
const SSR_MULTIPLIER_BASE = 1.07;
const SR_MULTIPLIER_BASE = 1.07;

const UR_EXPONENT = 1.2;
const SSR_EXPONENT = 1.3;
const SR_EXPONENT = 1.15;

const UR_BASE_PROB = 1.3;
const SSR_BASE_PROB = 2;
const SR_BASE_PROB = 8;
const R_BASE_PROB = 33.7;
const C_BASE_PROB = 55;

const starting_total = { UR: 16, SSR: 24, SR: 32, R: 40, C: 64 };

let captains = [];

let UR_Count = 0;
let SSR_Count = 0;
let SR_Count = 0;
let R_Count = 0;
let C_Count = 0;

class Captain {
  constructor(id, username, ably, channel) {
    this.id = id;
    this.username = username;
    this.ably = ably;
    this.channel = channel;
    this.total_ur_drawn = 0;
    this.total_ssr_drawn = 0;
    this.total_sr_drawn = 0;
    this.pity_system = { UR: 1, SSR: 1, SR: 1, R: 1, C: 1 }; // initial pity system weights for each captain
    this.team = []; // team for each captain
  }

  async choose(drawn_players) {
    if (appState === "paused") {
      console.log("Draft is paused");
      // Set up the promise to wait for a response
      const response = new Promise((resolve) => {
        const handler = (message) => {
          // Check if the response is for this captain
          if (message.data.state === "running") {
            resolve(message.data.state);
            // And unsubscribe from the channel
            channel.unsubscribe("update", handler);
          }
        };
        channel.subscribe("update", handler);
      });
      appState = await response;
      console.log("Draft is resuming...");
    }

    console.log(`Captain ${this.id} is choosing...`);
    console.log(drawn_players);

    // Publish a message to the channel
    await channel.publish("choose_event", { captainId: this.id, drawnPlayers: drawn_players });

    // Set up a promise that resolves after a certain amount of time
    const timer = new Promise((resolve) => {
      setTimeout(async () => {
        console.log(`Captain ${this.id}'s turn has been skipped.`);
        const tier_order = { UR: 1, SSR: 2, SR: 3, R: 4, C: 5 };
        const chosenPlayer = drawn_players.sort((a, b) => tier_order[a["tier"]] - tier_order[b["tier"]])[0];

        await channel.publish("skip_event", { captainId: this.id, chosenPlayer: chosenPlayer });

        resolve(chosenPlayer);
      }, 65000); // Set this to the amount of time to wait before skipping the captain's turn
    });

    // Set up the promise to wait for a response
    const response = new Promise((resolve) => {
      const handler = (message) => {
        // Check if the response is for this captain
        if (message.data.captainId == this.id) {
          console.log(`Captain ${this.id} received response`);
          // If it is, resolve the promise with the chosen player
          resolve(message.data.chosenPlayer);
          // And unsubscribe from the channel
          channel.unsubscribe("response_event", handler);
        }
      };
      channel.subscribe("response_event", handler);
    });

    // Use Promise.race to choose the winner between the timer and the response
    let chosenPlayer = await Promise.race([timer, response]);

    console.log(`Captain ${this.id} chose ${chosenPlayer.id}`);

    return chosenPlayer;
  }
}

const draw_player = (undrawn_pool, drawn_pool, captain, rem_rounds, rem_captains) => {
  // Calculates the probability of drawing each player and normalizes the probabilities
  let draw_prob = [];

  let tiers = ["UR", "SSR", "SR", "R", "C"];

  tiers.forEach((tier) => {
    if (undrawn_pool[tier] && undrawn_pool[tier].length) {
      let rem_players = undrawn_pool[tier].length;
      let normalize_weight = starting_total[tier] / rem_players;
      undrawn_pool[tier].forEach((player) => {
        let prob = player["base_prob"] * normalize_weight;
        prob *= captain.pity_system[tier];
        if (rem_rounds === 0) {
          if (tier === "UR" && captain.total_ur_drawn === 0) {
            prob *= 1.25 + (16 - rem_captains) / 4;
            if (rem_captains === 0) {
              prob *= 999999;
            }
          }
          if (tier === "SSR") {
            prob *= 1.5 + (16 - rem_captains) / 4;
            if (rem_captains === 0) {
              prob *= 999999;
            }
          }
          if (tier === "SR") {
            prob *= 4 + (16 - rem_captains) / 4;
            if (rem_captains === 0) {
              prob *= 999999;
            }
          }
          if (tier === "R") {
            prob *= 5 + (16 - rem_captains) / 4;
            if (rem_captains === 0) {
              prob *= 999999;
            }
          }
          if (tier === "C") {
            prob *= 10 + (16 - rem_captains) / 4;
            if (rem_captains === 0) {
              prob *= 999999;
            }
          }
        }
        draw_prob.push({ player, prob });
      });
    } else if (drawn_pool[tier] && drawn_pool[tier].length) {
      let rem_players = drawn_pool[tier].length;
      let normalize_weight = starting_total[tier] / rem_players;
      drawn_pool[tier].forEach((player) => {
        let prob = player["base_prob"] * normalize_weight;
        prob *= captain.pity_system[tier];
        draw_prob.push({ player, prob });
      });
    }
  });

  let total_prob = draw_prob.reduce((total, value) => total + value.prob, 0);
  let draw_prob_normalized = draw_prob.map(({ player, prob }) => ({ player, prob: prob / total_prob }));

  // Chooses a player based on probabilities
  let player_to_draw = weightedRandom(
    draw_prob_normalized,
    draw_prob_normalized.map((value) => value.prob),
    1
  )[0].player;

  if (player_to_draw["tier"] === "UR") {
    UR_Count++;
  } else if (player_to_draw["tier"] === "SSR") {
    SSR_Count++;
  } else if (player_to_draw["tier"] === "SR") {
    SR_Count++;
  } else if (player_to_draw["tier"] === "R") {
    R_Count++;
  } else if (player_to_draw["tier"] === "C") {
    C_Count++;
  }
  return player_to_draw;
};

// A JavaScript equivalent for Python's random.choices with weights
// Reference: https://stackoverflow.com/a/843712
function weightedRandom(list, weight, k) {
  let result = [];
  for (let i = 0; i < k; i++) {
    let randomNum = Math.random();
    let s = 0;
    let lastIndex = 0;

    for (let j = 0; j < weight.length; j++) {
      s += weight[j];
      if (randomNum <= s) {
        lastIndex = j;
        break;
      }
    }
    result.push(list[lastIndex]);
  }
  return result;
}

const draft_players = async (tier_pool, rounds = 7) => {
  let undrawn_pool = JSON.parse(JSON.stringify(tier_pool)); // deep copy

  let drawn_pool = {
    UR: [],
    SSR: [],
    SR: [],
    R: [],
    C: [],
  }; // keeps track of drawn players

  // loops through the draft rounds
  for (let round = 0; round < rounds; round++) {
    console.log(`Round ${round + 1}`);
    for (let captain of captains) {
      let drawn_players = [];
      // draws 4 players for each captain
      for (let _ = 0; _ < 4; _++) {
        let cur_drawn_player = draw_player(
          undrawn_pool,
          drawn_pool,
          captain,
          rounds - (round + 1),
          captains.length - (captains.indexOf(captain) + 1)
        );
        if (cur_drawn_player["tier"] === "UR") {
          captain.total_ur_drawn += 1;
        } else if (cur_drawn_player["tier"] === "SSR") {
          captain.total_ssr_drawn += 1;
        } else if (cur_drawn_player["tier"] === "SR") {
          captain.total_sr_drawn += 1;
        }

        drawn_players.push(cur_drawn_player);

        // removes current drawn player from undrawn_pool and adds them to drawn_pool
        let undrawn_players_of_current_tier = undrawn_pool[cur_drawn_player["tier"]];
        if (undrawn_players_of_current_tier.includes(cur_drawn_player)) {
          undrawn_pool[cur_drawn_player["tier"]] = undrawn_players_of_current_tier.filter(
            (player) => player !== cur_drawn_player
          );
          drawn_pool[cur_drawn_player["tier"]].push(cur_drawn_player);
        }

        update_pity_system(captain, cur_drawn_player, undrawn_pool, drawn_pool); // updates the captain's pity system weights
      }

      let chosen_player = await captain.choose(drawn_players); // captain chooses a player
      captain.team.push(chosen_player); // adds the chosen player to the team

      // Check if the chosen player exists in the undrawn or drawn pool and remove them accordingly
      let undrawn_players_of_chosen_tier = undrawn_pool[chosen_player["tier"]];
      let drawn_players_of_chosen_tier = drawn_pool[chosen_player["tier"]];

      if (undrawn_players_of_chosen_tier.includes(chosen_player)) {
        undrawn_pool[chosen_player["tier"]] = undrawn_players_of_chosen_tier.filter(
          (player) => player !== chosen_player
        );
      } else {
        drawn_pool[chosen_player["tier"]] = drawn_players_of_chosen_tier.filter((player) => player !== chosen_player);
      }
    }
  }
  console.log("=======================================");
  /* captains.forEach((captain) => {
    console.log(`Captain: ${captain.id} Players: ${captain.team.map((player) => player["id"]).join()}`);
  }); */
  console.log("Players left in undrawn: ", countPlayersInPool(undrawn_pool));
  console.log("Players left in drawn:   ", countPlayersInPool(drawn_pool));
  console.log("Remaining in pool:       ", countPlayersNotInTeams(tier_pool));
  console.log("Total UR drawn:          ", UR_Count);
  console.log("Total SSR drawn:         ", SSR_Count);
  console.log("Total SR drawn:          ", SR_Count);
  console.log("Total R drawn:           ", R_Count);
  console.log("Total C drawn:           ", C_Count);
};

const update_pity_system = (captain, drawn_player, undrawn_pool, drawn_pool) => {
  // pity system limit 1 UR per captain, reset pity if UR is drawn
  if (captain.total_ur_drawn >= 1) {
    captain.pity_system["UR"] = 1;
    if (drawn_player["tier"] === "UR" && captain.total_ur_drawn > 1) {
      console.log(
        `Captain ${captain.id} pulled an UR after hitting max pity of 1! Total UR: ${captain.total_ur_drawn}`
      );
    }
  } else if (captain.pity_system["UR"] === 1 || drawn_player["tier"] === "UR") {
    captain.pity_system["UR"] = Math.pow(UR_MULTIPLIER_BASE, UR_EXPONENT);
  } else if (undrawn_pool["UR"].length || drawn_pool["UR"].length) {
    captain.pity_system["UR"] = Math.pow(captain.pity_system["UR"], UR_EXPONENT);
  } else {
    captain.pity_system["UR"] = 1;
  }

  // pity system limit 2 SSR per captain, reset pity if SSR is drawn
  if (captain.total_ssr_drawn >= 2) {
    captain.pity_system["SSR"] = 1;
    if (drawn_player["tier"] === "SSR" && captain.total_ssr_drawn > 2) {
      console.log(
        `Captain ${captain.id} pulled a SSR after hitting max pity of 2! Total SSR: ${captain.total_ssr_drawn}`
      );
    }
  } else if (captain.pity_system["SSR"] === 1 || drawn_player["tier"] === "SSR") {
    captain.pity_system["SSR"] = Math.pow(SSR_MULTIPLIER_BASE, SSR_EXPONENT);
  } else if (undrawn_pool["SSR"].length || drawn_pool["SSR"].length) {
    captain.pity_system["SSR"] = Math.pow(captain.pity_system["SSR"], SSR_EXPONENT);
  } else {
    captain.pity_system["SSR"] = 1;
  }

  // reset pity if SR is drawn
  if (drawn_player["tier"] === "SR") {
    captain.pity_system["SR"] = 1;
  } else if (captain.pity_system["SR"] === 1) {
    captain.pity_system["SR"] = Math.pow(SR_MULTIPLIER_BASE, SR_EXPONENT);
  } else if (undrawn_pool["SR"].length || drawn_pool["SR"].length) {
    captain.pity_system["SR"] = Math.pow(captain.pity_system["SR"], SR_EXPONENT);
  } else {
    captain.pity_system["SR"] = 1;
  }
};

function countPlayersNotInTeams(tierPool) {
  let tierCounts = { UR: 0, SSR: 0, SR: 0, R: 0, C: 0 };
  let playersInTeams = new Set();

  // Create a set of player ids currently in teams
  for (let captain of captains) {
    for (let player of captain.team) {
      playersInTeams.add(player["id"]);
    }
  }

  // Count the number of players in each tier from the pool
  for (let players of Object.values(tierPool)) {
    for (let player of players) {
      if (!playersInTeams.has(player["id"])) {
        tierCounts[player["tier"]] += 1;
      }
    }
  }

  return tierCounts;
}

function countPlayersInPool(tierPool) {
  let tierCounts = { UR: 0, SSR: 0, SR: 0, R: 0, C: 0 };

  // Loop over all players in tierPool
  for (let players of Object.values(tierPool)) {
    for (let player of players) {
      tierCounts[player["tier"]] += 1;
    }
  }

  return tierCounts;
}

export default async function RunDraft() {
  if (appState === "paused") {
    console.log("Draft is paused");
    // Set up the promise to wait for a response
    const response = new Promise((resolve) => {
      const handler = (message) => {
        // Check if the response is for this captain
        if (message.data.state === "running") {
          resolve(message.data.state);
          // And unsubscribe from the channel
          channel.unsubscribe("update", handler);
        }
      };
      channel.subscribe("update", handler);
    });
    appState = await response;
    console.log("Draft is resuming...");
  }

  captains.push(new Captain(114017, "KRZY", ably, channel));
  captains.push(new Captain(5426640, "nanawo", ably, channel));
  captains.push(new Captain(10137131, "BlankTap", ably, channel));
  captains.push(new Captain(7119659, "Amuro", ably, channel));
  captains.push(new Captain(14041375, "yenator07", ably, channel));
  captains.push(new Captain(10659233, "BTG4", ably, channel));
  captains.push(new Captain(6017901, "netnesanya", ably, channel));
  captains.push(new Captain(2200982, "muji", ably, channel));
  captains.push(new Captain(11706972, "Matt4132", ably, channel));
  captains.push(new Captain(9362168, "Seleen", ably, channel));
  captains.push(new Captain(1429071, "LolForest", ably, channel));
  captains.push(new Captain(17467899, "Qumania", ably, channel));
  captains.push(new Captain(11245184, "Lexonox", ably, channel)); // -Atour-'s ID!!
  captains.push(new Captain(12090610, "Tatze", ably, channel));
  captains.push(new Captain(14806365, "chests", ably, channel));
  captains.push(new Captain(11371245, "aahoff", ably, channel));

  let playerIds = [
    18092331, 5309981, 6671641, 9323821, 2317789, 14447878, 7537133, 15173952, 11234706, 4519494, 6283858, 2312106,
    9924405, 3898396, 16436446, 6989615, 7374212, 7587763, 14919428, 8151359, 7701428, 4316633, 14592820, 14398471,
    1775182, 6398160, 11786864, 10157694, 8150535, 8414284, 7457788, 3493804, 5281485, 16538717, 7810180, 2012039,
    9265990, 20630250, 8445602, 9604150, 12296128, 5154946, 11940767, 6951719, 757783, 10325072, 12904237, 10958852,
    12585858, 7249644, 8105655, 12329311, 10459580, 13951894, 10728620, 5182623, 15274893, 10458639, 14255332, 9919528,
    5968633, 10516802, 15242810, 15441612, 11749569, 15271985, 5442251, 7586334, 6906789, 2035254, 8953955, 3674590,
    7249261, 14963905, 10509043, 7748891, 9192260, 11186709, 11238108, 12086452, 3115283, 11920994, 4673649, 8926244,
    11836334, 10463129, 21653406, 13206785, 11398156, 13310147, 11137291, 14282987, 20501126, 3621226, 5472693, 8006029,
    9560694, 12115298, 9732417, 17958667, 7807935, 1788022, 12270069, 18131614, 15646924, 2367495, 12352050, 10656864,
    14518295, 12537417, 13627426, 9317938, 10204748, 8431549, 9878349, 14024115, 1433427, 14165027, 8840382, 24270105,
    8170022, 12476276, 9845103, 10472784, 6600809, 20276851, 7115794, 14547194, 10748381, 8589120, 10869615, 13925698,
    2504750, 7351448, 11461810, 9526124, 8112433, 7449949, 9548110, 14390731, 8828875, 2629617, 6178640, 19857248,
    10029074, 10571200, 6772887, 6652874, 6571991, 11648117, 5334278, 12016150, 15975275, 2854598, 6843383, 4039647,
    14309415, 10997439, 13659816, 3999831, 17663666, 1274798, 8226107, 2282145, 10722794, 11113067, 10626955, 11536421,
    13626098, 6124459, 11959709, 9364594, 17707354, 4860447, 18781432, 7989469,
  ];

  let tier_pool = {
    UR: [],
    SSR: [],
    SR: [],
    R: [],
    C: [],
  };

  let total = 0;

  // Populate tier_pool
  for (let i = 0; i < starting_total["UR"]; i++) {
    tier_pool["UR"].push({ id: playerIds[total + i], tier: "UR", base_prob: UR_BASE_PROB / starting_total["UR"] });
  }

  total += starting_total["UR"];

  for (let i = 0; i < starting_total["SSR"]; i++) {
    tier_pool["SSR"].push({ id: playerIds[total + i], tier: "SSR", base_prob: SSR_BASE_PROB / starting_total["SSR"] });
  }

  total += starting_total["SSR"];

  for (let i = 0; i < starting_total["SR"]; i++) {
    tier_pool["SR"].push({ id: playerIds[total + i], tier: "SR", base_prob: SR_BASE_PROB / starting_total["SR"] });
  }

  total += starting_total["SR"];

  for (let i = 0; i < starting_total["R"]; i++) {
    tier_pool["R"].push({ id: playerIds[total + i], tier: "R", base_prob: R_BASE_PROB / starting_total["R"] });
  }

  total += starting_total["R"];

  for (let i = 0; i < starting_total["C"]; i++) {
    tier_pool["C"].push({ id: playerIds[total + i], tier: "C", base_prob: C_BASE_PROB / starting_total["C"] });
  }

  await draft_players(tier_pool);
}
