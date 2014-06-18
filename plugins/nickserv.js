function NickServPlugin(bot) {
	var self = this;
	self.name = "nickserv";
	self.help = "NickServ plugin";
	self.depend = [];

	self.password = null;

	self.load = function(data) {
		self.password = data.password;
	};

	self.callbacks = {};
	self.identified = function(nick, callback) {
		if (!(nick in self.callbacks)) {
			bot.say("NickServ", "ACC " + nick);
			self.callbacks[nick] = callback;
		}
	};


	self.events = {
		"registered": function() {
			bot.say("NickServ", "IDENTIFY " + self.password);
		},

		"notice": function(nick, to, text) {
			if (nick == "NickServ") {
				var parts = text.split(" ");
				if (parts[0] in self.callbacks) {
					self.callbacks[parts[0]](parts[2] == "3");
					delete self.callbacks[parts[0]];
				}
			}
		}
	}
}

module.exports = NickServPlugin;
