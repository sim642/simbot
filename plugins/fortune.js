var execFile = require("child_process").execFile;

function FortunePlugin(bot) {
	var self = this;
	self.name = "fortune";
	self.help = "Fortune teller plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#fortune" : function(nick, to, args, message) {
			var arr = ["-s"];
			if (args[1] && args[1].match(/^\w+$/))
				arr.push(args[1]);
			execFile("fortune", arr, {timeout: 1000}, function (error, stdout, stderr) {
				if (error && error.killed === true)
					bot.say(to, nick + ": no such fortune found");

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
			var arr = ["-s", "/usr/share/games/fortunes/off/"];
			if (args[1] && args[1].match(/^\w+$/))
				arr.push(args[1]);
			execFile("fortune", arr, {timeout: 1000}, function (error, stdout, stderr) {
				if (error && error.killed === true)
					bot.say(to, nick + ": no such fortune found");

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
			execFile("fortune", ["-f"], function (error, stdout, stderr) {
				var arr = stderr.split("\n").map(function (line) {
					return line.trim().split(" ")[1];
				}).slice(1, -1);

				bot.notice(nick, "All available =fortune categories: " + arr.join(", "));
			});
		},

		"cmd#fortuneso": function (nick, to, args) {
			execFile("fortune", ["-f", "-o"], function (error, stdout, stderr) {
				var arr = stderr.split("\n").map(function (line) {
					return line.trim().split(" ")[1];
				}).slice(1, -1);

				bot.notice(nick, "All available =fortuneo categories: " + arr.join(", "));
			});
		}
	};
}

module.exports = FortunePlugin;
