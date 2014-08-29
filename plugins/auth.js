function AuthPlugin(bot) {
	var self = this;
	self.name = "auth";
	self.help = "Authentication/admin plugin";
	self.depend = ["cmd", "nickserv", "watch"];

	self.accounts = {};
	self.nicks = {};

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

	self.findMask = function(mask) {
		var level = 0;

		for (var key in self.accounts) {
			var account = self.accounts[key];
			if (account.masks) {
				for (var i = 0; i < account.masks.length; i++) {
					if (self.match(mask, account.masks[i])) {
						level = Math.max(level, account.level);
					}
				}
			}
		}

		return level;
	};

	self.findNickserv = function(NSaccount) {
		var level = 0;

		for (var key in self.accounts) {
			var account = self.accounts[key];
			if (account.nickservs) {
				for (var i = 0; i < account.nickservs.length; i++) {
					if (account.nickservs[i] == NSaccount) {
						level = Math.max(level, account.level);
					}
				}
			}
		}

		return level;
	};

	self.getLevel = function(message, callback) {
		var nick = message.nick;
		var level = 0;

		if (nick in self.nicks) {
			level = self.findNickserv(self.nicks[nick]);

			if (level > 0) {
				callback(level, "nscache");
				return;
			}
		}

		level = self.findMask(message.prefix);
		if (level > 0)
			callback(level, "mask");
		else {
			bot.plugins.nickserv.identified(nick, function(NSaccount) {
				level = self.findNickserv(NSaccount);

				if (level > 0) {
					self.nicks[nick] = NSaccount;
					bot.plugins.watch.add(nick);

					callback(level, "nickserv");
				}
				else
					callback(level, "none");
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
		"nick": function(oldnick, newnick, channels, message) {
			if (oldnick in self.nicks) {
				self.nicks[newnick] = self.nicks[oldnick];
				delete self.nicks[oldnick];
				bot.plugins.watch.change(oldnick, newnick);
			}
		},

		"watch#logoff": function(watch) {
			if (watch.nick in self.nicks) {
				delete self.nicks[watch.nick];
				bot.plugins.watch.remove(watch.nick);
			}
		},

		"cmd#myauth": function(nick, to, args, message) {
			self.getLevel(message, function(level, method) {
				bot.say(to, nick + ": your auth level is " + level + " (" + method + ")");
			});
		}
	};

};
module.exports = AuthPlugin;
