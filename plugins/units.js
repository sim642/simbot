var execFile = require("child_process").execFile;

function UnitsPlugin(bot) {
	var self = this;
	self.name = "units";
	self.help = "Unit conversion plugin";
	self.depend = ["cmd"];

	self.curUpdate = function() {
		bot.out.doing("units", "updating currency.units");
		execFile("python3", ["units_cur3"], {cwd: "./plugins/units/"}, function(error, stdout, stderr) {
			if (error) {
				bot.out.error("units", error, stdout, stderr);
			}
			else
				bot.out.ok("units", "currency.units updated");
		});
	};

	self.updater = null;

	self.enable = function() {
		self.curUpdate();
		self.updater = setInterval(self.curUpdate, 24 * 60 * 60 * 1000);
	};

	self.disable = function() {
		clearInterval(self.updater);
	};

	self.events = {
		"cmd#units" : function(nick, to, args, message) {
			if (args[2] === undefined || (args[2] !== undefined && args[2].trim() != "?")) {
				var inp = (args[1] || "") + "\n" + (args[2] || "") + "\n";

				execFile("./plugins/units/units", ["-f", "./plugins/units/definitions.units", "-t"], function (error, stdout, stderr) {
					bot.say(to, nick + ": " + stdout.replace(/\t/g, "").replace(/\n/g, "; "));
				}).stdin.end(inp);
			}
		}
	}
}

module.exports = UnitsPlugin;
