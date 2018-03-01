const { MessageEmbed, GuildMember, User} = require("discord.js");

const EMOJIS = {
  "1234": "🔢",
  right: "▶",
  forward: "▶",
  backward: "◀",
  left: "◀",
  up: "🔼",
  down: "🔽",
  play: "▶",
  pause: "⏸",
  square: "⏹",
  circle: "⏺",
  next: "⏭",
  prev: "⏮",
  right_double: "⏩",
  fast_forward: "⏩",
  left_double: "⏪",
  rewind: "⏪",
  up_double: "⏫",
  down_double: "⏬",
  point_right: "➡",
  right_arrow: "➡",
  point_left: "⬅",
  left_arrow: "⬅",
  point_up: "⬆",
  up_arrow: "⬆",
  point_down: "⬇",
  down_arrow: "⬇",
  up_right_arrow: "↗",
  point_up_right: "↗",
  down_right_arrow: "↘",
  point_down_right: "↘",
  down_left_arrow: "↙",
  point_down_left: "↙",
  up_left_arrow: "↖",
  point_up_left: "↖",
  hook_right: "↪",
  hook_left: "↩",
  arrow_clockwise: "🔃",
  reload: "🔃"
};

const peutil = class PagedEmbedUtil {
  constructor(options = {}) {

    this.pages = [];
    this.currentPage = 0;

    this.responseMap = new Map(); //map, mapping emoji to action or function to be called, for example it might map ▶ to nextPage
    this.reactions = []; //array with emojis in order of how they should appear on the message

    this.message = options.message || null; 
    this.channel = options.channel || null;
    // if its a TextChannel, the message will be sent with the first page when the pagedembed is executed.

    const caller = options.caller;
    if (caller instanceof GuildMember) this.caller = caller;
    if (caller instanceof User) this.caller = this.channel.guild.member(caller);
    if (typeof caller === "string") this.caller = this.channel.guild.members.get(caller);
    if (!caller) throw new TypeError("Option \"caller\" must be the member or user who instantiated the command");

    this.collector = null;
    this.collectorOptions = options.collectorOptions || {}; 
  }

  addPage(embed) {
    this.pages.push(embed);
    return this;
  }

  addPages(embeds) {
    this.pages = this.pages.concat(embeds);
    return this;
  }

  setPages(embeds) {
    this.pages = embeds;
    return this;
  }

  clearPages() {
    this.pages = [];
    return this;
  }

  useReaction(emoji, action) {
    const position = this.reactions.indexOf(emoji);
    if (position !== -1) this.reactions.splice(position, 1);
    this.reactions.push(emoji);
    if (typeof action === "string") {
      if (["nextpage", "next"].indexOf(action) !== -1) action = this.nextPage.bind(this);
      if (["prevpage", "prev"].indexOf(action) !== -1) action = this.prevPage.bind(this);
      if (["prompt", "goto", "gotopage", "ask"].indexOf(action) !== -1) action = this.createPrompt.bind(this);
    }
    this.responseMap.set(emoji, action);
    return this;
  }

  clearReactions() {
    this.responseMap.clear();
    this.reactions = [];
    return this;
  }

  nextPage() {
    this.currentPage++;
    if (this.currentPage >= this.pages.length) this.currentPage = 0;
    return this._update();
  }

  prevPage() {
    this.currentPage--;
    if (this.currentPage < 0) this.currentPage = this.pages.length - 1;
    return this._update();
  }

  pageTo(page) {
    if (typeof page === "string") page = Number(page);
    if (!Number.isInteger(page)) throw new TypeError("Argument must be an integer");
    page--; // users will assume its 1-indexed and not 0-indexed
    if (page < 0 || page >= this.pages.length) throw new RangeError("Out of page range");
    this.currentPage = page;
    return this._update();
  }

  prompt() {
    this.channel.client.awaitReply(this.message, "What page do you want to see? (Say `cancel` to cancel this prompt)", m => m.author.id === this.caller.user.id, undefined, null)
    .then(response => {
      if (response.toLowerCase().trim() === "cancel") return;
      const page = Number(response);
      if (isNaN(page)) return this.channel.send("That is not a valid response.");
      return this.pageTo(page).catch(() => this.channel.send("That page does not exist."));
    });
  }

  async run() {
    if (!this.message) {
      const embed = this.pages[this.currentPage];
      if (!embed) return;
      embed.footer = {
        text: `${this.currentPage + 1}/${this.pages.length}` 
      };
      this.message = await this.channel.send({ embed: this.pages[this.currentPage] });
    }
    for (const emoji of this.reactions) {
      await this.message.react(emoji);
    }

    this.collector = this.message.createReactionCollector((reaction, user) => user === this.caller.user && this.reactions.indexOf(reaction.emoji.name) !== -1, {time: 15 * 60 * 1000}, this.collectorOptions);

    this.collector.on("collect", r => {
      const perms = this.channel.permissionsFor(this.channel.guild.me).has("MANAGE_REACTIONS");
      if (perms) r.users.remove(this.caller.user);
      const cb = this.responseMap.get(r.emoji.name);
      if (!cb) throw new TypeError(`Invalid action for emoji ${r.emoji.name}, must be a function or recognised string`);
      cb();
    });

    this.collector.on("end", () => {
      const perms = this.channel.permissionsFor(this.channel.guild.me).has("MANAGE_REACTIONS");
      if (perms) this.message.clearReactions();
      else this.message.reactions.map(r => r.remove());
    });
  }

  _update() {
    const embed = this.pages[this.currentPage];
    if (!embed) return;
    embed.footer = {
      text: `${this.currentPage + 1}/${this.pages.length}` 
    };
    return this.message.edit({ embed });
  }

  static splitFields(string, embed, perPage = 2, fieldTitle = "\u200b") {
    
    const split = string.split(/(\n|\.)/).reduce((acc, b, i) => {
      if (i % 2 === 1) acc.push(b);
      else acc[acc.length - 1] += b;
      return acc;
    }, []).reduce((acc, b) => {
      if (acc[acc.length - 1].length + b.length > 1024) acc.push(b);
      else acc[acc.length - 1] += b;
      return acc;
    }, []);

    if (!embed) return split;
    return split.reduce((acc, b, i) => {
      if (acc % perPage === 1) acc.push(this.cloneEmbed(embed));
      acc[acc.length - 1].addField(i === 1 ? fieldTitle : "\u200b");
    }, []);


  }

  static cloneEmbed(embed) {
    return Object.assign(new MessageEmbed(), embed);
  }
};

peutil.EMOJIS = EMOJIS;

module.exports = peutil;