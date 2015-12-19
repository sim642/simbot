function AuthPlugin(bot) {
	var self = this;
	self.name = "auth";
	self.help = "Authentication/admin plugin";
	self.depend = ["cmd", "nickserv", "watch"];

	self.accounts = {};
	self.channels = {};

	self.nicks = {};

	self.load = function(data) {
		self.accounts = data.accounts;
		self.channels = data.channels;
	};

	self.save = function() {
		return {accounts: self.accounts, channels: self.channels};
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

	self.findChannel = function(chan, nick) {
		var level = 0;

		if (nick in bot.chans[chan].users) {
			var modes = bot.chans[chan].users[nick];

			for (var key in self.channels) {
				var channel = self.channels[key];
				if (self.match(chan, key)) { // match channels with wildcards
					for (var i = 0; i < modes.length; i++) {
						level = Math.max(level, channel[bot.modeForPrefix[modes[i]]] || 0);
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
				else {
					if (!message.authChannel) { // fill in current channel as target
						if (message.command == "PRIVMSG" || message.command == "NOTICE")
							message.authChannel = message.args[0];
					}

					level = self.findChannel(message.authChannel, nick);

					if (level > 0)
						callback(level, "channel");
					else
						callback(level, "none");
				}
			});
		}
	};

	self.check = function(reqLevel, message, callback) {
		self.getLevel(message, function(level) {
			callback(level >= reqLevel);
		});
	};

	self.proxy = function(reqLevel, message, callback) {
		self.check(reqLevel, message, function(check) {
			if (check)
				callback();
		});
	};

	self.proxyEvent = function(reqLevel, listener) {
		return function(nick, to, args, message) {
			var args = Array.prototype.slice.call(arguments);
			self.proxy(reqLevel, args[args.length - 1], function() {
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
			if (args[1])
				message.authChannel = args[1];

			self.getLevel(message, function(level, method) {
				bot.say(to, nick + ": your auth level for " + (args[1] ? args[1] : to) + " is " + level + " (" + method + ")");
			});
		}
	};

}

module.exports = AuthPlugin;
