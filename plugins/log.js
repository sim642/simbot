var fs = require("fs");

function LogPlugin(bot) {
	var self = this;
	self.name = "log";
	self.help = "simbot log viewer plugin";
	self.depend = ["cmd", "auth"];

	self.events = {
		"cmd#log": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			var linecnt = args[1] || 20;

			fs.readFile("./data/simbot.log", {encoding: "utf8"}, function(err, data) {
				if (err)
					throw err;

				var lines = data.split("\n").slice(-linecnt);

				for (var i = 0; i < lines.length; i++)
					bot.say(to, lines[i]); // TODO: add IRC color to lines
			});
		})
	};
}

module.exports = LogPlugin;
