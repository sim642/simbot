var fs = require("fs");

function LogPlugin(bot) {
	var self = this;
	self.name = "log";
	self.help = "simbot log viewer plugin";
	self.depend = ["cmd", "auth"];

	self.grepRe = new RegExp(
		"(/)((?:\\\\\\1|(?!\\1).)+)" +
		"\\1([a-z])*"); // simplified from sed plugin // copied from history plugin

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
						re = new RegExp(m[2], m[3]);
					}
				}
			}

			linecnt = Math.min(linecnt || 15, 50);

			var outlines = [];
			self.iterate(function(line) {
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
