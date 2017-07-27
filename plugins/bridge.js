function BridgePlugin(bot) {
	var self = this;
	self.name = "bridge";
	self.help = "bridge relay compatiblity plugin";
	self.depend = ["util"];

	self.bridgeRe = /^bridge$/;
	self.relayRe = /^\[([^\]]+)\] (.*)$/;

	self.targetChannels = {};
	self._say = null;
	self._action = null;
	self._notice = null;

	self.say = function(chan, name, text) {
		bot.say(chan, name + ": " + text);
	};

	self.action = function(chan, name, text) {
		bot.action(chan, name + ": " + text);
	};

	self.enable = function() {
		self._say = bot.say; // copy old function
		bot.say = function(target, message) {
			if (target in self.targetChannels) // bridge say
				return self.say(self.targetChannels[target], target, message);
			else
				return self._say.call(this, target, message);
		};

		self._action = bot.action; // copy old function
		bot.action = function(target, message) {
			if (target in self.targetChannels) // bridge action
				return self.action(self.targetChannels[target], target, message);
			else
				return self._action.call(this, target, message);
		};

		self._notice = bot.notice; // copy old function
		bot.notice = function(target, message) {
			if (target in self.targetChannels) // bridge notice
				return self.say(self.targetChannels[target], target, message);
			else
				return self._notice.call(this, target, message);
		};
	};

	self.disable = function() {
		bot.say = self._say; // restore old function
		self._say = null;
		bot.action = self._action; // restore old function
		self._action = null;
		bot.notice = self._notice; // restore old function
		self._notice = null;
	};

	self.events = {
		"message#": function(nick, to, text, message) {
			if (!nick.match(self.bridgeRe))
				return;

			var m = text.match(self.relayRe);
			if (m) {
				var name = bot.plugins.util.stripColors(m[1]);
				var text2 = m[2];

				self.targetChannels[name] = to;

				var message2 = {
					nick: name,
					user: to,
					host: "bridge-" + name,
					command: "PRIVMSG",
					args: [to, text2]
				};
				message2.prefix = message2.nick + "!" + message2.user + "@" + message2.host;
				bot.emit("raw", message2);
			}
		},
	};
}

module.exports = BridgePlugin;
