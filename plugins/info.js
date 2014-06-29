function InfoPlugin(bot) {
	var self = this;
	self.name = "info";
	self.help = "Info plugin";
	self.depend = ["cmd"];
	
	self.callbacks = [];

	self.info = function(nick, callback) {
		bot.say("infobot", "!info " + nick);
		self.callbacks.push({"nick": nick, "callback": callback});
	};

	self.invalidRe = /^Invalid target\. Was (.+) identified with NickServ when it was \!added\?$/;

	self.events = {
		"notice": function(nick, to, text, message) {
			if (nick == "infobot" && to == bot.nick && self.callbacks.length > 0) {
				var callback = self.callbacks.shift();
				if (text.match(self.invalidRe))
					text = undefined;
				callback.callback(text, callback.nick);
			}
		},

		"cmd#infobot": function(nick, to, args, message) {
			self.info(args[1], function(text, nick) {
				bot.say(to, "Info of " + nick + ": " + text);
			});
		}
	}
}

module.exports = InfoPlugin;
