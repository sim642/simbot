var child_process = require("child_process");

function CDeclPlugin(bot) {
	var self = this;
	self.name = "cdecl";
	self.help = "CDecl plugin";
	self.depend = ["cmd"];

	self.prefix = function(query) {
		if (query.match(/^(cast|declare|explain) /))
			return query;
		else
			return "explain " + query;
	};

	self.events = {
		"cmd#cdecl" : function(nick, to, args) {
			child_process.exec("cdecl -q", function (error, stdout, stderr) {
				stdout.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, nick + ": " + line);
				});
			}).stdin.end(self.prefix(args[0]) + "\n");
		},

		"cmd#c++decl" : function(nick, to, args) {
			child_process.exec("c++decl -q", function (error, stdout, stderr) {
				stdout.split("\n").forEach(function (line) {
					if (line != "")
						bot.say(to, nick + ": " + line);
				});
			}).stdin.end(self.prefix(args[0]) + "\n");
		}
	}
}

module.exports = CDeclPlugin;
