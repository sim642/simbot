var request = require("request");

function CDeclPlugin(bot) {
	var self = this;
	self.name = "cdecl";
	self.help = "CDecl plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#cdecl": function(nick, to, args) {
			request({url: "http://cdecl.org/query.php", qs: {q: args[0]}}, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					bot.say(to, nick + ": " + body);
				}
			});
		}
	}
}

module.exports = CDeclPlugin;
