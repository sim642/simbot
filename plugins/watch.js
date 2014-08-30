function WatchPlugin(bot) {
	var self = this;
	self.name = "watch";
	self.help = "WATCH plugin";
	self.depend = [];

	self.listArray = [];
	self.listCallbacks = [];

	self.statData = {};
	self.statCallbacks = [];

	self.watch = function(args) {
		args.unshift("WATCH");
		bot.send.apply(bot, args);
	};

	self.add = function(nick) {
		self.watch(["+" + nick]);
	};

	self.remove = function(nick) {
		self.watch(["-" + nick]);
	};

	self.change = function(from, to) {
		self.watch(["-" + from, "+" + to]);
	};

	self.list = function(callback) {
		if (self.listCallbacks.length == 0)
			self.watch(["l"]);

		self.listCallbacks.push(callback);
	};

	self.stat = function(callback) {
		if (self.statCallbacks.length == 0) {
			self.watch(["s"]);
			self.statData.list = [];
		}

		self.statCallbacks.push(callback);
	};

	self.emitEvents = {
		"600": "watch#logon",
		"601": "watch#logoff",
		"604": "watch#nowon",
		"605": "watch#nowoff"
	};

	self.events = {
		"raw": function(message) {
			switch (message.rawCommand) {
			case "600": // logon
			case "601": // logoff
			case "604": // nowon
			case "605": // nowoff
				var watch = {
					nick: message.args[1],
					user: message.args[2],
					host: message.args[3],
					logon: new Date(message.args[4] * 1000)
				};

				if (message.rawCommand == "604" && self.listCallbacks.length > 0) {
					self.listArray.push(watch);
				}

				bot.emit(self.emitEvents[message.rawCommand], watch);
				break;

			case "603": // watchstat
				var re = /You have (\d+) and are on (\d+) WATCH entries/;
				var match = message.args[1].match(re);
				if (match && self.statCallbacks.length > 0) {
					self.statData.have = parseInt(match[1]);
					self.statData.on = parseInt(match[2]);
				}
				break;

			case "606": // watchlist
				if (self.statCallbacks.length > 0) {
					self.statData.list = self.statData.list.concat(message.args[1].split(" "));
				}
				break;

			case "607": // end of watchlist
				for (var i = 0; i < self.listCallbacks.length; i++) {
					self.listCallbacks[i](self.listArray);
				}

				for (var i = 0; i < self.statCallbacks.length; i++) {
					var data = self.statData;
					self.statCallbacks[i](data.have, data.on, data.list);
				}

				self.listCallbacks = [];
				self.listArray = [];
				self.statCallbacks = [];
				self.statData = {};
				break;
			}
		}
	}
}

module.exports = WatchPlugin;
