var fs = require("fs");
var path = require("path");

function HistoryPlugin(bot) {
	var self = this;
	self.name = "history";
	self.help = "History plugin";
	self.depend = ["cmd"];
	
	self.basedir = null;
	self.basename = null;

	self.grepRe = new RegExp(
		"(/)((?:\\\\\\1|(?!\\1).)+)" +
		"\\1([a-z])*"); // simplified from sed plugin

	self.load = function(data) {
		if (data) {
			self.basedir = data.basedir;
			self.basename = data.basename;
		}
	};

	self.save = function() {
		return {basedir: self.basedir, basename: self.basename};
	}

	self.iterate = function(channel, lineCb, endCb) {
		fs.readdir(self.basedir, function(err, files) {
			var re = new RegExp("^" + self.basename + channel + "_\\d{8}\\.log$");
			var logfiles = files.filter(function (file) {
				return file.match(re);
			}).sort();

			var found = false;
			var func = function(logfiles) {
				if (!found && logfiles.length > 0) {
					var logfile = logfiles.pop();
					fs.readFile(path.join(self.basedir, logfile), {encoding: "utf8"}, function(err, data) {
						if (err)
							throw err;

						var lines = data.split("\n");

						for (var j = lines.length - 1 - 1; !found && j >= 0; j--) {
							if (!lineCb(lines[j]))
								found = true;
						}

						func(logfiles);
					});
				}
				else {
					(endCb || function(){})(found);
				}
			};

			func(logfiles);
		});
	};

	self.events = {
		"cmd#history": function(nick, to, args) {
			var linecnt;
			var channel = to;
			var re = null;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg.match(/^#/))
					channel = arg;
				else if (arg.match(/^\d+/))
					linecnt = parseInt(arg);
				else {
					var m = arg.match(self.grepRe);
					if (m) {
						re = new RegExp(m[2], m[3]);
					}
				}
			}

			var extra = channel == to;
			linecnt = Math.min(linecnt || 15, 50) + extra;

			var outlines = [];
			self.iterate(channel, function(line) {
				if (re === null || line.match(re)) {
					outlines.unshift(line);
					linecnt--;
				}

				return linecnt > 0;
			}, function() {
				if (extra && (re === null || outlines[outlines.length - 1].match(re)))
					outlines.pop();

				bot.say(nick, "--- Begin history for " + channel + " ---");
				for (var i = 0; i < outlines.length; i++) {
					bot.say(nick, outlines[i]);
				}
				bot.say(nick, "--- End history for " + channel + " ---");
			});
		}
	}
}

module.exports = HistoryPlugin;
