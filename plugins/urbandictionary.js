var request = require("request");

function UrbanDictionaryPlugin(bot) {
	var self = this;
	self.name = "urbandictionary";
	self.help = "Urban Dictionary plugin";
	self.depend = ["cmd", "util"];

	self.strip = function(str) {
		return str.replace(/\[([^\]]+)\]/g, "\x1F$1\x1F").replace(/\r?\n/g, " ");
	};

	self.formatDefinition = function(str) {
		return bot.plugins.util.ellipsize(self.strip(str), 350);
	};

	self.events = {
		"cmd#ud": function(nick, to, args) {
			if (!args[0]) {
				request("https://api.urbandictionary.com/v0/random", function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (j.list !== undefined && j.list.length !== 0) {
							var item = j.list[0];
							bot.say(to, "\x02" + item.word + "\x02 [random]: " + self.formatDefinition(item.definition));
						}
					}
				});
			}
			else {
				var match = args[0].match(/^(.*)\s+(\d+)\s*$/);
				var str;
				var i;
				if (match) {
					str = match[1];
					i = parseInt(match[2]) - 1;
				}
				else {
					str = args[0];
					i = 0;
				}
				str = str.trim();

				var pageSize = 10;
				var page = Math.floor(i / pageSize);
				var offset = i % pageSize;

				request({
						uri: "https://api.urbandictionary.com/v0/define",
						qs: {
							term: str,
							page: page + 1
						}
					}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (j.list !== undefined && j.list.length !== 0) {
							if (offset >= 0 && offset < j.list.length) {
								var item = j.list[offset];

								request({
										uri: "https://api.urbandictionary.com/v0/define",
										qs: {
											term: str,
											page: page + 1 + 1
										}
									}, function(err, res, body) {
									if (!err && res.statusCode == 200) {
										var j2 = JSON.parse(body);
										var hasMore = j2.list !== undefined && j2.list.length !== 0;

										bot.say(to, "\x02" + item.word + "\x02 [" + (i + 1) + "/" + (pageSize * page + j.list.length) + (hasMore ? "+" : "") + "]: " + self.formatDefinition(item.definition));
									}
								});
							}
							else
								bot.say(to, nick + ": \x02" + str + "\x02 [" + (i + 1) + "/" + (pageSize * page + j.list.length) + "] invalid result index");
						}
						else {
							if (i >= pageSize) {
								request({
										uri: "https://api.urbandictionary.com/v0/define",
										qs: {
											term: str
											// page 0 + 1
										}
									}, function(err, res, body) {
									if (!err && res.statusCode == 200) {
										var j2 = JSON.parse(body);
										var hasAny = j2.list !== undefined && j2.list.length !== 0;

										if (hasAny)
											bot.say(to, nick + ": \x02" + str + "\x02 [" + (i + 1) + "/?] invalid result index");
										else
											bot.say(to, nick + ": couldn't find \x02" + str + "\x02");
									}
								});
							}
							else
								bot.say(to, nick + ": couldn't find \x02" + str + "\x02");
						}
					}
					else if (!err && res.statusCode == 500) {
						var j = JSON.parse(body);
						bot.say(to, nick + ": \x02" + str + "\x02 [" + (i + 1) + "/?] " + j.error);
					}
				});
			}
		}
	};
}

module.exports = UrbanDictionaryPlugin;
