function HighlightPlugin(bot) {
	var self = this;
	self.name = "highlight";
	self.help = "Highlight plugin";
	self.depend = ["cmd", "messenger", "util"];

	self.highlights = {};
	/*
	nick : {
		level: online/away/offline
		activity: [secs]/null(to disable)
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
			if (self.highlights[nick].activity === undefined)
				self.highlights[nick].activity = null;
		}
	};

	self.save = function() {
		return {
			"highlights": self.highlights
		};
	};

	self.send = function(hinick, to, op, nick, text) {
		text = bot.plugins.util.stripColors(text);

		// bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + op + nick + "> " + text);
		bot.plugins.messenger.sendTextMessage(hinick, to + " <" + op + nick + "> " + text);
	};

	self.events = {
		"message": function(nick, to, text, message) {
			var tolow = to.toLowerCase();
			if (tolow == bot.nick.toLowerCase())
				return;

			for (var hinick in self.highlights) {
				var level = self.highlights[hinick].level;
				var activity = self.highlights[hinick].activity;

				var op;
				try {
					if ((tolow in bot.chans) && (nick in bot.chans[tolow].users))
						op = bot.chans[tolow].users[nick].substr(0, 1);
					else // handle out of channel messages
						op = "";
				}
				catch (e) {
					bot.out.error("highlight", message);
					return;
				}

				if (text.match(new RegExp("\\b" + hinick + "(?=\\b|[_|])", "i"))) {
					if (Object.keys(bot.chans[tolow].users).map(function(elem) { return elem.toLowerCase(); }).indexOf(hinick) == -1)
						self.send(hinick, to, op, nick, text);
					else if (level != "offline") {
						if (activity !== null || level == "away") { // needs whois
							var hinick2 = hinick;
							bot.whois(hinick2, function(info) {
								var good = true;
								if (level == "away" && info.away === undefined) {
									good = false;
								}

								if (info.idle !== undefined) {
									if (activity !== null && parseInt(info.idle) < (activity * 60)) {
										good = false;
									}
								}
								else
									bot.out.error("highlight", "no idle data in WHOIS reply", info, message);

								if (good)
									self.send(hinick2, to, op, nick, text);
							});
						}
						else
							self.send(hinick, to, op, nick, text);
					}
				}
			}
		},

		"cmd#sethighlight": function(nick, to, args) {
			var lnick = nick.toLowerCase();
			switch (args[1]) {
				case "online":
				case "away":
				case "offline":
					if (!(lnick in self.highlights))
						self.highlights[lnick] = {};
					self.highlights[lnick].level = args[1];
					var activity = parseInt(args[2]);
					self.highlights[lnick].activity = activity ? activity : null;
					bot.notice(nick, "highlights set to " + args[1] + (activity ? " (" + activity.toString() + "mins)": ""));
					break;
				case "off":
					if (lnick in self.highlights) {
						delete self.highlights[lnick];
						bot.notice(nick, "highlights turned off");
					}
					break;
				default:
					var user = self.highlights[lnick];
					bot.notice(nick, "highlights set to " + user.level + (user.activity ? " (" + user.activity.toString() + "mins)": ""));
					break;
			}
		}
	};
}

module.exports = HighlightPlugin;
