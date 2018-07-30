var request = require("request");

function UrbanDictionaryPlugin(bot) {
	var self = this;
	self.name = "urbandictionary";
	self.help = "Urban Dictionary plugin";
	self.depend = ["cmd", "util"];

	self.strip = function(str) {
		return str.replace(/\[([^\]]+)\]/g, "$1").replace(/\r?\n/g, " ");
	};

	self.formatDefinition = function(str) {
		return bot.plugins.util.ellipsize(self.strip(str), 350);
	};

	self.events = {
		"cmd#ud": function(nick, to, args) {
			if (args[1] == "random") {
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
					i = parseInt(match[2]);
				}
				else {
					str = args[0];
					i = 1;
				}
				str = str.trim();

				request({
						uri: "https://api.urbandictionary.com/v0/define",
						qs: {
							term: str
						}
					}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (j.list !== undefined && j.list.length !== 0) {
							if (i - 1 >= 0 && i - 1 < j.list.length) {
								var item = j.list[i - 1];
								bot.say(to, "\x02" + item.word + "\x02 [" + i + "/" + j.list.length + "]: " + self.formatDefinition(item.definition));
							}
							else
								bot.say(to, nick + ": \x02" + str + "\x02 [" + i + "/" + j.list.length + "] invalid result index");
						}
						else
							bot.say(to, nick + ": couldn't find \x02" + str + "\x02");
					}
				});
			}
		}
	};
}

module.exports = UrbanDictionaryPlugin;
