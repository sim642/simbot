var exec = require("child_process").exec;

function UnitsPlugin(bot) {
	var self = this;
	self.name = "units";
	self.help = "Unit conversion plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#units" : function(nick, to, args, message) {
			var cmd = "./plugins/units/units -f ./plugins/units/definitions.units -t";
			var inp = (args[1] || "") + "\n" + (args[2] || "") + "\n";

			exec(cmd, function (error, stdout, stderr) {
				bot.say(to, nick + ": " + stdout.replace(/\t/g, "").replace(/\n/g, "; "));
			}).stdin.end(inp);
		}
	}
}

module.exports = UnitsPlugin;
