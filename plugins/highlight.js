function HighlightPlugin(bot) {
	var self = this;
	self.name = "highlight";
	self.help = "Highlight plugin";
	self.depend = ["cmd", "pushbullet"];

	self.highlights = {};
	/*
	nick : {
		level: online/away/offline
	}
	*/

	self.load = function(data) {
		if (data)
			self.highlights = data.highlights;

		for (var nick in self.highlights) {
			if (self.highlights[nick].online !== undefined) {
				self.highlights[nick].level = self.highlights[nick].online ? "online" : "offline";
				delete self.highlights[nick].online;
			}
		}
	};

	self.save = function() {
		return {
			"highlights": self.highlights
		};
	}

	self.events = {
		"message": function(nick, to, text) {
			for (var hinick in self.highlights) {
				var level = self.highlights[hinick].level;
				if (text.match(new RegExp("\\b" + hinick)) && !(!(level == "online" || level == "away") && (hinick in bot.chans[to].users))) {
					switch (level) {
					case "online":
						bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + nick + "> " + text);
						break;
					case "offline":
						if (!(hinick in bot.chans[to].users)) {
							bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + nick + "> " + text);
						}
						break;
					case "away":
						if (!(hinick in bot.chans[to].users)) {
							bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + nick + "> " + text);
						}
						else {
							bot.whois(hinick, function(info) {
								if (info.away !== undefined) {
									bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + nick + "> " + text);
								}
							});
						}
						break;
					}
				}
			}
		},

		"cmd#sethighlight": function(nick, to, args) {
			if (nick in bot.plugins.pushbullet.emails) {
				switch (args[1]) {
				case "online":
				case "away":
				case "offline":
					if (!(nick in self.highlights))
						self.highlights[nick] = {};
					self.highlights[nick].level = args[1];
					bot.say(nick, "highlights set to " + args[1]);
					break;
				case "off":
					if (nick in self.highlights) {
						delete self.highlights[nick];
						bot.say(nick, "highlights turned off");
					}
					break;
				}
			}
			else
				bot.say(nick, "pushbullet must be set to use this feature");
		}
	}
}

module.exports = HighlightPlugin;
