function PipePlugin(bot) {
	var self = this;
	self.name = "pipe";
	self.help = "Pipe plugin";
	self.depend = ["cmd", "auth"];

	self.pipes = {};
	self.backpipes = {};

	self.events = {
		"cmd#pipe": bot.plugins.auth.proxy(8, function(nick, to, args) {
			to = to.toLowerCase();
			args[1] = args[1].toLowerCase();
			if (to in self.pipes)
				delete self.backpipes[self.pipes[to]];
			self.pipes[to] = args[1];
			self.backpipes[args[1]] = to;
			bot.notice(to, "Now piping to " + args[1]);
		}),

		"cmd#unpipe": bot.plugins.auth.proxy(8, function(nick, to, args) {
			to = to.toLowerCase();
			delete self.backpipes[self.pipes[to]];
			delete self.pipes[to];
			bot.notice(to, "Not piping");
		}),

		"nocmd": function(nick, to, text, message) {
			if (to === undefined) {
				console.log(message);
				return;
			}

			to = to.toLowerCase();
			if (to in self.pipes)
				bot.say(self.pipes[to], text);
		},

		"message": function(nick, to, text) {
			to = to.toLowerCase();
			if (to in self.backpipes)
				bot.say(self.backpipes[to], text);
		},

		"action": function(nick, to, text) {
			if (to == bot.nick)
				to = nick;
			if (to === undefined)
				return;
			to = to.toLowerCase();
			if (to in self.pipes)
				bot.action(self.pipes[to], text);

			if (to in self.backpipes)
				bot.action(self.backpipes[to], text);
		},

		"notice": function(nick, to, text) {
			if (to == bot.nick)
				to = nick;
			if (to === undefined)
				return;
			to = to.toLowerCase();
			if (to in self.pipes)
				bot.notice(self.pipes[to], text);

			if (to in self.backpipes)
				bot.notice(self.backpipes[to], text);
		},

		"cmd#msg": bot.plugins.auth.proxy(8, function(nick, to, args) {
			var parts = args[0].split(":", 2);
			if (parts.length == 2)
				bot.say(parts[0].trim(), parts[1].trim());
			else
				bot.say(to, parts[0].trim());
		}),

		"cmd#me": bot.plugins.auth.proxy(8, function(nick, to, args) {
			var parts = args[0].split(":", 2);
			if (parts.length == 2)
				bot.action(parts[0].trim(), parts[1].trim());
			else
				bot.action(to, parts[0].trim());
		}),

		"cmd#notice": bot.plugins.auth.proxy(8, function(nick, to, args) {
			var parts = args[0].split(":", 2);
			if (parts.length == 2)
				bot.notice(parts[0].trim(), parts[1].trim());
			else
				bot.notice(to, parts[0].trim());
		}),
	}
}

module.exports = PipePlugin;
