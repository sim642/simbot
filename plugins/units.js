var exec = require("child_process").exec;

function UnitsPlugin(bot) {
	var self = this;
	self.name = "units";
	self.help = "Unit conversion plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#units" : function(nick, to, args, message) {
			var cmd = "./plugins/units/units -f ./plugins/units/definitions.units -t '" + args[1] + "'";
			//var cmd = "units -t '" + args[1] + "'";
			if (args[2])
				cmd += " '" + args[2] + "'";

			exec(cmd, function (error, stdout, stderr) {
				bot.say(to, nick + ": " + stdout.replace(/\t/g, "").replace(/\n/g, "; "));
			});
		}
	}
}

module.exports = UnitsPlugin;
