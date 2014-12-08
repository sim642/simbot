var request = require("request");

function HelpPlugin(bot) {
	var self = this;
	self.name = "help";
	self.help = "Help plugin";
	self.depend = ["cmd"];

	self.github = "https://github.com/sim642/simbot";

	self.events = {
		"cmd#help": function(nick, to, args, message) {
			if (bot.plugins[args[1]]) {
				var url = self.github + "/wiki/" + args[1];
				request.head({"url": url, followRedirect: false}, function(err, res, body) {
					bot.say(to, nick + ": " + args[1] + " - " + bot.plugins[args[1]].help + (!err && res.statusCode == 200 ? " - " + url : ""));
				});
			}
			else if (args[1])
				bot.say(to, nick + ": no such plugin '" + args[1] + "'");
			else
				bot.say(to, nick + ": " + self.github + "/wiki");
		},

		"ctcp-version": function(from, to, message) {
			bot.ctcp(from, "notice", "VERSION simbot by sim642: " + self.github);
		}
	}
}

module.exports = HelpPlugin;
