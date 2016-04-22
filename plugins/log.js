var fs = require("fs");

function LogPlugin(bot) {
	var self = this;
	self.name = "log";
	self.help = "simbot log viewer plugin";
	self.depend = ["cmd", "auth", "util"];

	self.grepRe = new RegExp(
		"(/)((?:\\\\\\1|(?!\\1).)+)" +
		"\\1([a-z])*"); // simplified from sed plugin // copied from history plugin

	self.logRe = /^([0-9-:.TZ]+) \[(\w+):(\w+)\] (.*)$/;
	self.typeColor = {
		"LOG": 2,
		"DOING": 11,
		"OK": 3,
		"DEBUG": 13,
		"WARN": 8,
		"ERROR": 4
	};

	self.iterate = function(lineCb, endCb) {
		var found = false;
		fs.readFile("./data/simbot.log", {encoding: "utf8"}, function(err, data) {
			if (err)
				throw err;

			var lines = data.split("\n");

			for (var j = lines.length - 1 - 1; !found && j >= 0; j--) {
				if (!lineCb(lines[j]))
					found = true;
			}

			(endCb || function(){})(found);
		});
	};

	self.recoverColor = function(str) {
		var m = str.match(self.logRe);
		if (m)
		{
			var str2 = "";
			str2 += "\x0314" + m[1] + "\x0F ";
			str2 += "\x03" + self.typeColor[m[2]] + "[" + m[2] + ":";
			str2 += "\x02" + m[3] + "\x02]\x0F ";
			str2 += m[4];
			return str2;
		}
		else
			return str;
	};

	self.events = {
		"cmd#log": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			// simplified from history plugin
			var linecnt;
			var re = null;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg.match(/^\d+/))
					linecnt = parseInt(arg);
				else {
					var m = arg.match(self.grepRe);
					if (m) {
						re = new RegExp(m[2], bot.plugins.util.filterRegexFlags(m[3]));
					}
				}
			}

			linecnt = Math.min(linecnt || 15, 50);

			var outlines = [];
			self.iterate(function(line) {
				line = self.recoverColor(line);
				if (re === null || line.match(re)) {
					outlines.unshift(re !== null ? line.replace(re, "\x16$&\x16") : line); // highlight matches by color reversal

					linecnt--;
				}

				return linecnt > 0;
			}, function() {
				bot.say(nick, "\x031--- Begin log ---");
				for (var i = 0; i < outlines.length; i++) {
					var str = outlines[i];
					bot.say(nick, str);
				}
				bot.say(nick, "\x031--- End log ---");
			});
		})
	};
}

module.exports = LogPlugin;
