var fs = require("fs");

function HistoryPlugin(bot) {
	var self = this;
	self.name = "history";
	self.help = "History plugin";
	self.depend = ["cmd"];
	
	self.basedir = "./znclog/";
	self.basename = "simbot_Awfulnet_";

	self.events = {
		"cmd#history": function(nick, to, args) {
			fs.readdir(self.basedir, function(err, files) {
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

				var re = new RegExp("^" + self.basename + channel + "_\\d{8}\\.log$");
				var logfiles = files.filter(function (file) {
					return file.match(re);
				}).sort();

				for (var i = logfiles.length - 1; i >= 0 && linecnt > 0; i--) {
					var lines = fs.readFileSync(self.basedir + logfiles[i]).toString().split("\n");
					
					for (var j = lines.length - 1 - 1; j >= 0 && linecnt > 0; j--) {
						outlines.unshift(lines[j]);
						linecnt--;
					}
				}

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
