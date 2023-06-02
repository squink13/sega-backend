export function getDiscordTag(username, discriminator) {
  // Convert discriminator to string in case it's a number
  const discString = String(discriminator);

  // Pad with leading zeroes to ensure 4 digits
  const paddedDiscriminator = discString.padStart(4, "0");

  // Combine username and padded discriminator with '#'
  return `${username}#${paddedDiscriminator}`;
}

export function generateAvatarUrl(id, avatar) {
  let format = "png";
  if (avatar && avatar.startsWith("a_")) {
    format = "gif";
  }
  return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${format}`;
}
