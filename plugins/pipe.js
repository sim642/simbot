function PipePlugin(bot) {
	var self = this;
	self.name = 'pipe';
	self.help = 'Pipe plugin';

	self.pipes = {};
	self.backpipes = {};

	self.events = {
		'cmd#pipe': function(nick, to, args) {
			if (to in self.pipes)
				delete self.backpipes[self.pipes[to]];
			self.pipes[to] = args[1];
			self.backpipes[bot.nick] = to;
			bot.notice(to, "Now piping to " + args[1]);
		},

		'cmd#unpipe': function(nick, to, args) {
			delete self.backpipes[self.pipes[to]];
			delete self.pipes[to];
			bot.notice(to, "Not piping");
		},

		'nocmd': function(nick, to, text) {
			if (to in self.pipes)
				bot.say(self.pipes[to], text);
		},

		'message': function(nick, to, text) {
			if (to in self.backpipes && nick != self.backpipes[to])
				bot.say(self.backpipes[to], text);
		},

		'notice': function(nick, to, text) {
			if (to in self.pipes)
				bot.notice(self.pipes[to], text);

			if (to in self.backpipes && nick != self.backpipes[to])
				bot.notice(self.backpipes[to], text);
		}
	}
}

module.exports = PipePlugin;
