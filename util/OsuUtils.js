export function BadgeFilter(osuPlayerData) {
  const filteredWords = [
    "contrib",
    "nomination",
    "assessment",
    "moderation",
    "spotlight",
    "mapper",
    "mapping",
    "aspire",
    "monthly",
    "exemplary",
    "outstanding",
    "longstanding",
    "idol",
    "pending",
    "gmt",
    "global moderators",
    "trivium",
    "pickem",
    "fanart",
    "fan art",
    "skinning",
    "labour of love",
    "community choice",
    "community favourite",
    "taiko",
  ];

  const ignoredBadges = new RegExp(filteredWords.join("|"), "i");

  let badges = 0;
  for (let badge of osuPlayerData.badges) {
    let awardedAt = new Date(badge.awarded_at);
    if (awardedAt.getFullYear() >= 2021 && !ignoredBadges.test(badge.description.toLowerCase())) {
      badges++;
    }
  }

  return badges;
}

export function BwsRankCalc(globalRank, badgeCount) {
  let BWS = Math.pow(globalRank, Math.pow(0.9937, Math.pow(badgeCount, 1.7)));
  return BWS;
}
