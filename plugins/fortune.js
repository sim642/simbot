var exec = require("child_process").exec;

function FortunePlugin(bot) {
	var self = this;
	self.name = "fortune";
	self.help = "Fortune teller plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#fortune" : function(nick, to, args, message) {
			var cmd = "fortune -s";
			if (args[1] && args[1].match(/^\w+$/))
				cmd += " '" + args[1] + "'";
			exec(cmd, function (error, stdout, stderr) {
				stdout.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, "  " + line);
				});
				stderr.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, "  " + line);
				});
			});
		},

		"cmd#fortuneo" : function(nick, to, args, message) {
			var cmd = "fortune -s /usr/share/games/fortunes/off/";
			if (args[1] && args[1].match(/^\w+$/))
				cmd += "'" + args[1] + "'";
			exec(cmd, function (error, stdout, stderr) {
				stdout.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, "  " + line);
				});
				stderr.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, "  " + line);
				});
			});
		},

		"cmd#fortunes": function (nick, to, args) {
			exec("fortune -f", function (error, stdout, stderr) {
				var arr = stderr.split("\n").map(function (line) {
					return line.trim().split(" ")[1];
				}).slice(1, -1);
				console.log(arr);

				bot.notice(nick, "All available =fortune categories: " + arr.join(", "));
			});
		},

		"cmd#fortuneso": function (nick, to, args) {
			exec("fortune -f -o", function (error, stdout, stderr) {
				var arr = stderr.split("\n").map(function (line) {
					return line.trim().split(" ")[1];
				}).slice(1, -1);
				console.log(arr);

				bot.notice(nick, "All available =fortuneo categories: " + arr.join(", "));
			});
		}
	}
}

module.exports = FortunePlugin;
