var request = require("request");

function GitioPlugin(bot) {
	var self = this;
	self.name = "gitio";
	self.help = "git.io plugin";
	self.depend = ["cmd", "auth"];

	self.shorten = function(longurl, callback) {
		request.post({
			url: "https://git.io/create",
			form: {
				"url": longurl
			}
		}, function (err, res, body) {
			if (!err && res.statusCode == 200) {
				(callback || function(){})("https://git.io/" + body);
			}
		});
	};

	self.events = {
		"cmd#gitio": bot.plugins.auth.proxyEvent(7, function(nick, to, args) {
			self.shorten(args[1], function(shorturl) {
				bot.say(to, args[1] + " -> " + shorturl);
			});
		})
	};
}

module.exports = GitioPlugin;
