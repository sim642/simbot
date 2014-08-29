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
		var level = self.findMask(message.prefix);

		if (level > 0)
			callback(level, "mask");
		else {
			bot.plugins.nickserv.identified(message.nick, function(NSaccount) {
				level = self.findNickserv(NSaccount);
				callback(level, "nickserv");
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
			self.getLevel(message, function(level, method) {
				bot.say(to, nick + ": your auth level is " + level + " (" + method + ")");
			});
		}
	};

};
module.exports = AuthPlugin;
