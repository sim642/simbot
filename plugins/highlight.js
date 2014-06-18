function HighlightPlugin(bot) {
	var self = this;
	self.name = "highlight";
	self.help = "Highlight plugin";
	self.depend = ["cmd", "pushbullet"];

	self.highlights = {};
	/*
	nick : {
		online: true/false
	}
	*/

	self.load = function(data) {
		if (data)
			self.highlights = data.highlights;
	};

	self.save = function() {
		return {
			"highlights": self.highlights
		};
	}

	self.events = {
		"message": function(nick, to, text) {
			for (var hinick in self.highlights) {
				if (text.indexOf(hinick) != -1 && !(!self.highlights[hinick].online && (hinick in bot.chans[to].users))) {
					bot.plugins.pushbullet.pushnote(hinick, "Highlighted in " + to, "<" + nick + "> " + text);
				}
			}
		},

		"cmd#sethighlight": function(nick, to, args) {
			if (nick in bot.plugins.pushbullet.emails) {
				switch (args[1]) {
				case "online":
					if (!(nick in self.highlights))
						self.highlights[nick] = {};
					self.highlights[nick].online = true;
					bot.say(nick, "highlights set to online");
					break;
				case "offline":
					if (!(nick in self.highlights))
						self.highlights[nick] = {};
					self.highlights[nick].online = false;
					bot.say(nick, "highlights set to offline");
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
