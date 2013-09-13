function AuthPlugin(bot) {
	var self = this;
	self.name = "auth";
	self.help = "Authentication/admin plugin";
	self.depend = ["cmd"];

	self.accounts = {};

	self.load = function(data) {
		self.accounts = data;
	};

	self.unload = function() {
		return self.accounts;
	};

	self.match = function(cur, mask) {
		var re = new RegExp("^" + mask.replace(".", "\.").replace("?", ".").replace("*", ".*") + "$", "i");
		return re.test(cur);
	};

	self.getLevel = function(message) {
		var level = 0;
		matching:
		for (var key in self.accounts) {
			var account = self.accounts[key];
			for (var i = 0; i < account.masks.length; i++) {
				if (self.match(message.prefix, account.masks[i])) {
					level = account.level;
					break matching;
				}
			}
		}
		return level;
	};

	self.check = function(reqLevel, message) {
		return (self.getLevel(message) >= reqLevel);
	};

	self.proxy = function(reqLevel, listener) {
		return function(nick, to, args, message) {
			var args = Array.prototype.slice.call(arguments);
			if (self.check(reqLevel, args[args.length - 1])) {
				listener.apply(listener, args);
			}
		};
	};

	self.events = {
		"cmd#myauth": function(nick, to, args, message) {
			bot.say(to, nick + ": your auth level is " + self.getLevel(message));
		}
	};

};
module.exports = AuthPlugin;
