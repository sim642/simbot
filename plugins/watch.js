function WatchPlugin(bot) {
	var self = this;
	self.name = "watch";
	self.help = "WATCH plugin";
	self.depend = [];

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

	self.emitEvents = {
		"600": "watch#logon",
		"601": "watch#logoff",
		"604": "watch#nowon",
		"605": "watch#nowoff"
	};

	self.events = {
		"raw": function(message) {
			switch (message.rawCommand) {
			case "600":
			case "601":
			case "604":
			case "605":
				var watch = {
					nick: message.args[1],
					user: message.args[2],
					host: message.args[3],
					logon: message.args[4]
				};

				bot.emit(self.emitEvents[message.rawCommand], watch);
				break;
			}
		}
	}
}

module.exports = WatchPlugin;
