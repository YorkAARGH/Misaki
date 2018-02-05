const Social = require(`${process.cwd()}/base/Social.js`);
const snek = require("snekfetch");

class Lizard extends Social {
  constructor(client) {
    super(client, {
      name: "lizard",
      description: "Post a randomly selected image of a lizard.",
      category: "Animals",
      usage: "lizard",
      extended: "This command will return a beautiful lizard.",
      cost: 5,
      cooldown: 10,
      aliases: []
    });
  }

  async run(message, args, level) { // eslint-disable-line no-unused-vars

    const msg = await message.channel.send(`<a:typing:397490442469376001> **${message.member.displayName}** is looking for a lizard...`);

    if (message.settings.socialSystem === "true") {
      await this.cmdPay(message, message.author.id, this.help.cost, { msg });
    }

    const { body } = await snek.get("https://nekos.life/api/lizard");
    await msg.edit({
      embed: {
        "title": "Click here if the image failed to load.",
        "url": body.url,
        "color": message.guild.me.roles.highest.color || 5198940,
        "image": {
          "url": body.url
        }
      }
    });
  }
}

module.exports = Lizard;