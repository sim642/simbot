function AuthPlugin(bot) {
	var self = this;
	self.name = "auth";
	self.help = "Authentication/admin plugin";

	self.accounts = {};

	self.load = function(data) {
		self.accounts = data;
	};

	self.unload = function() {
		return self.accounts;
	};

	self.match = function(cur, mask) {
		var re = new RegExp("^" + mask.replace(".", "\.").replace("?", ".").replace("*", ".*") + "$");
		return re.test(cur);
	};

	self.proxy = function(reqLevel, listener) {
		return function(nick, to, args, message) {
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
			if (level >= reqLevel) {
				var args = Array.prototype.slice.call(arguments);
				listener.apply(listener, args);
			}
		};
	};

	self.events = {};

};
module.exports = AuthPlugin;
