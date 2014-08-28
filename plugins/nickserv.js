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
			bot.say("NickServ", "ACC " + nick + " *");
			self.callbacks[nick] = callback;
		}
	};

	self.nickCallbacks = {};
	self.nickIdentified = function(nick, callback) {
		if (!(nick in self.nickCallbacks)) {
			bot.say("NickServ", "ACC " + nick);
			self.nickCallbacks[nick] = callback;
		}
	};


	self.events = {
		"registered": function() {
			bot.say("NickServ", "IDENTIFY " + self.password);
		},

		"notice": function(nick, to, text) {
			if (nick == "NickServ") {
				var parts = text.split(" ");
				// multiple callbacks for same nick don't work
				if (parts[0] in self.callbacks) {
					self.callbacks[parts[0]](parts[4] == "3" ? parts[2] : null);
					delete self.callbacks[parts[0]];
				}
				else if (parts[0] in self.nickCallbacks) {
					self.nickCallbacks[parts[0]](parts[2] == "3");
					delete self.nickCallbacks[parts[0]];
				}
			}
		}
	}
}

module.exports = NickServPlugin;
