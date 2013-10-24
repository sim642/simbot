var exec = require("child_process").exec;

function FortunePlugin(bot) {
	var self = this;
	self.name = "fortune";
	self.help = "Fortune teller plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#fortune" : function(nick, to, args, message) {
			exec("fortune -s", function (error, stdout, stderr) {
				stdout.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, "  " + line);
				});
			});
		}
	}
}

module.exports = FortunePlugin;
