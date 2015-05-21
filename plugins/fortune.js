var execFile = require("child_process").execFile;
var fs = require("fs");

function FortunePlugin(bot) {
	var self = this;
	self.name = "fortune";
	self.help = "Fortune teller plugin";
	self.depend = ["cmd"];

	self.quoteDir = null;
	self.quoteAddRe = /^(?:(\w+)\s*:|<\W?(\w+)>)\s*(.*)$/;

	self.load = function(data) {
		if (data) {
			self.quoteDir = data.quoteDir || null;
		}
	};

	self.save = function() {
		return {quoteDir: self.quoteDir};
	};

	self.quoteAdd = function(name, text, callback) {
		var filename = self.quoteDir + name.toLowerCase();
		fs.appendFile(filename, text + "\n%\n", function(err) {
			if (!err)
				execFile("strfile", ["-c", "%", filename, filename + ".dat"], function(err, stdout, stderr) {
					(callback || function(){})(err);
				});
			else {
				bot.out.error("fortune", err);
				(callback || function(){})(err);
			}
		});
	};

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

		"cmd#quote" : function(nick, to, args, message) {
			if (self.quoteDir !== null) {
				var arr = ["-s"/*, "-c"*/, self.quoteDir]; // TODO: nice output of source fortunes file
				if (args[1] && args[1].match(/^\w+$/))
					arr[arr.length - 1] += args[1].toLowerCase();
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
			}
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
		},

		"cmd#quotes": function (nick, to, args) {
			if (self.quoteDir !== null) {
				execFile("fortune", ["-f", self.quoteDir], function (error, stdout, stderr) {
					var arr = stderr.split("\n").map(function (line) {
						return line.trim().split(" ")[1];
					}).slice(1, -1);

					bot.notice(nick, "All available =quote categories: " + arr.join(", "));
				});
			}
		},

		"cmd#quoteadd": function(nick, to, args) {
			if (self.quoteDir !== null) {
				var m = args[0].match(self.quoteAddRe);
				if (m) {
					var person = m[1] || m[2];
					self.quoteAdd(person, m[3], function(err) {
						if (!err)
							bot.notice(nick, "quote added to " + person);
						else
							bot.notice(nick, "error adding quote to " + person);
					});
				}
			}
		}
	};
}

module.exports = FortunePlugin;
