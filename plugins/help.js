function HelpPlugin(bot) {
	var self = this;
	self.name = "help";
	self.help = "Help plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#help": function(nick, to, args, message) {
			if (bot.plugins[args[1]])
				bot.say(to, nick + ": " + args[1] + " - " + bot.plugins[args[1]].help);
			else if (args[1])
				bot.say(to, nick + ": no such plugin '" + args[1] + "'");
			else
				bot.say(to, nick + ": https://github.com/sim642/simbot/wiki");
		},

		"ctcp-version": function(from, to, message) {
			bot.ctcp(from, "notice", "VERSION simbot by sim642: https://github.com/sim642/simbot");
		}
	}
}

module.exports = HelpPlugin;
