function auth() {
	var self = this;
	
	self.accounts = {
		'sim642': {
			level: 100,
			masks: ['sim642!*@*']
		}
	};

	self.match = function(cur, mask) {
		var re = new RegExp("^" + mask.replace('.', '\.').replace('?', '.').replace('*', '.*') + "$");
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
			console.log(nick, level, reqLevel);
			if (level >= reqLevel) {
				var args = Array.prototype.slice.call(arguments);
				listener.apply(listener, args);
			}
		};
	};

};
module.exports = new auth();
