var execFile = require("child_process").execFile;

function UnitsPlugin(bot) {
	var self = this;
	self.name = "units";
	self.help = "Unit conversion plugin";
	self.depend = ["cmd"];

	self.unitListRe = /\?|search/i; // disallow spammy input

	self.events = {
		"cmd#units" : function(nick, to, args, message) {
			if (args.length == 0)
				return;
			if (args[1] !== undefined && self.unitListRe.test(args[1]))
				return;
			if (args[2] !== undefined && self.unitListRe.test(args[2]))
				return;

			var inp = (args[1] || "") + "\n" + (args[2] || "") + "\n";

			execFile("units", ["-t"], function (error, stdout, stderr) {
				bot.say(to, nick + ": " + stdout.replace(/\t/g, "").replace(/\n/g, "; "));
			}).stdin.end(inp);
		}
	};
}

module.exports = UnitsPlugin;
