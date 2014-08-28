function AuthPlugin(bot) {
	var self = this;
	self.name = "auth";
	self.help = "Authentication/admin plugin";
	self.depend = ["cmd", "nickserv"];

	self.accounts = {};

	self.load = function(data) {
		self.accounts = data;
	};

	self.save = function() {
		return self.accounts;
	};

	self.match = function(cur, mask) {
		var esc = "\\[]{}^|";
		for (var i = 0; i < esc.length; i++) {
			mask = mask.replace(esc[i], "\\" + esc[i], "g");
		}
		var re = new RegExp("^" + mask.replace(/\./g, "\.").replace(/\?/g, ".").replace(/\*/g, ".*") + "$", "i");
		return re.test(cur);
	};

	self.getLevel = function(message, callback) {
		// TODO: return highest level the user could get, not the first one

		var level = 0;
		matching:
		for (var key in self.accounts) {
			var account = self.accounts[key];
			if (account.masks) {
				for (var i = 0; i < account.masks.length; i++) {
					if (self.match(message.prefix, account.masks[i])) {
						level = account.level;
						break matching;
					}
				}
			}
		}

		if (level > 0)
			callback(level);
		else {
			bot.plugins.nickserv.identified(message.nick, function(NSaccount) {
				matching2:
				for (var key in self.accounts) {
					var account = self.accounts[key];
					if (account.nickservs) {
						for (var i = 0; i < account.nickservs.length; i++) {
							if (account.nickservs[i] == NSaccount) {
								level = account.level;
								break matching2;
							}
						}
					}
				}

				callback(level);
			});
		}
	};

	self.check = function(reqLevel, message, callback) {
		self.getLevel(message, function(level) {
			callback(level >= reqLevel);
		});
	};

	self.proxy = function(reqLevel, listener) {
		return function(nick, to, args, message) {
			var args = Array.prototype.slice.call(arguments);
			self.check(reqLevel, args[args.length - 1], function(check) {
				if (check)
					listener.apply(listener, args);
			});
		};
	};

	self.events = {
		"cmd#myauth": function(nick, to, args, message) {
			self.getLevel(message, function(level) {
				bot.say(to, nick + ": your auth level is " + level);
			});
		}
	};

};
module.exports = AuthPlugin;
