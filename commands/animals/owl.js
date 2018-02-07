const Social = require(`${process.cwd()}/base/Social.js`);
const { get } = require("snekfetch");
class Owl extends Social {
  constructor(client) {
    super(client, {
      name: "owl",
      description: "Post a randomly selected image of a owl.",
      category: "Animals",
      usage: "owl",
      extended: "This command will return a beautiful owl.",
      cost: 5,
      cooldown: 10,
      aliases: ["hoot"]
    });
  }

  async run(message, args, level) { // eslint-disable-line no-unused-vars
    const msg = await message.channel.send(`<a:typing:397490442469376001> **${message.member.displayName}** is petting an owl...`);
    const owl = await get("http://pics.floofybot.moe/owl").then(r => r.body.image); // API Provided by Lewdcario
    await msg.edit({ embed: { "title": "Click here if the image failed to load.", "url": owl, "color": message.guild.me.roles.highest.color || 5198940, "image": { "url": owl } } });
  }
}

module.exports = Owl;