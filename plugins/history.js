var fs = require("fs");

function HistoryPlugin(bot) {
	var self = this;
	self.name = "history";
	self.help = "History plugin";
	self.depend = ["cmd"];
	
	self.basedir = null;
	self.basename = null;

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
			for (var i = logfiles.length - 1; !found && i >= 0; i--) {
				var lines = fs.readFileSync(self.basedir + logfiles[i]).toString().split("\n");

				for (var j = lines.length - 1 - 1; !found && j >= 0; j--) {
					if (!lineCb(lines[j]))
						found = true;
				}
			}

			(endCb || function(){})(found);
		});
	};

	self.events = {
		"cmd#history": function(nick, to, args) {
			var linecnt;
			var channel = to;
			if (args[1] !== undefined && args[1].match(/^#/)) {
				linecnt = args[2];
				channel = args[1];
			}
			else
				linecnt = args[1];

			linecnt = Math.min(linecnt || 15, 50) + 1;

			if (!channel.match(/^#/))
				return;

			var outlines = [];

			self.iterate(channel, function(line) {
				outlines.unshift(line);
				linecnt--;

				return linecnt > 0;
			}, function() {
				if (channel == to)
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
