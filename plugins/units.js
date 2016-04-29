var execFile = require("child_process").execFile;

function UnitsPlugin(bot) {
	var self = this;
	self.name = "units";
	self.help = "Unit conversion plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#units" : function(nick, to, args, message) {
			if (args[2] === undefined || (args[2] !== undefined && args[2].trim() != "?")) {
				var inp = (args[1] || "") + "\n" + (args[2] || "") + "\n";

				execFile("./plugins/units/units", ["-f", "./plugins/units/definitions.units", "-t"], function (error, stdout, stderr) {
					bot.say(to, nick + ": " + stdout.replace(/\t/g, "").replace(/\n/g, "; "));
				}).stdin.end(inp);
			}
		}
	};
}

module.exports = UnitsPlugin;
