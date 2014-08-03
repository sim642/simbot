function InfoPlugin(bot) {
	var self = this;
	self.name = "info";
	self.help = "Info plugin";
	self.depend = ["cmd"];
	
	self.callbacks = [];

	self.info = function(nicks, callback) {
		bot.say("infobot", "!mquery " + nicks.join(","));
		for (var i = 0; i < nicks.length; i++) {
			var item = {"nick": nicks[i], "callback": callback};
			if (self.callbacks[nicks[i]] === undefined)
				self.callbacks[nicks[i]] = [item];
			else
				self.callbacks[nicks[i]].push(item);
		}
	};

	self.invalidRe = /^Invalid target\. Was (.+) identified with NickServ when it was \!added\?$/;
	self.nickRe = /^([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*): (.*)$/i;

	self.events = {
		"notice": function(nick, to, text, message) {
			if (nick == "infobot" && to == bot.nick) {
				var m = text.match(self.nickRe);
				if (m[1] in self.callbacks) {
					var callback = self.callbacks[m[1]];
					for (var i = 0; i < callback.length; i++) {
						var info = m[2];
						if (info.match(self.invalidRe))
							info = undefined;
						callback[i].callback(info, callback[i].nick);
					}
					delete self.callbacks[m[1]];
				}
			}
		},

		"cmd#infobot": function(nick, to, args, message) {
			self.info(args[1].split(","), function(text, nick) {
				bot.say(to, "Info of " + nick + ": " + text);
			});
		}
	}
}

module.exports = InfoPlugin;
