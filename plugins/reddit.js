var request = require("request");
var url = require("url");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["auth", "cmd"];

	self.urlRe = /(https?|ftp):\/\/[^\s\/$.?#].[^\s]*/i;

	self.channels = [];
	self.ignores = [];

	self.load = function(data) {
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.save = function() {
		return {channels: self.channels, ignores: self.ignores};
	};

	self.lookup = function(lurl, callback) {
		request("https://www.reddit.com/search.json?q=url:" + lurl, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).data;
				var results = data.children;

				if (results.length > 0) {
					var post = results[0].data;
					var str = "\x1Fhttp://redd.it/" + post.id + "\x1F : \x02" + post.title + "\x02 [r/" + post.subreddit + "] by " + post.author + "; " + post.num_comments + " comments; " + post.score + " score";
					(callback || function(){})(str);
				}
			}
		});
	};

	self.events = {
		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) &&
				!self.ignores.some(function (elem, i, arr) {
					return bot.plugins.auth.match(message.nick + "!" + message.user + "@" + message.host, elem);
				})) {
				var match = text.match(self.urlRe);
				if (match) {
					bot.out.log("reddit", nick + " in " + to + ": " + match[0]);
					self.lookup(match[0], function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		/*"pm": function(nick, text, message) {
			var match = text.match(self.vidre);
			if (match) {
				bot.out.log("youtube", nick + " in PM: " + match[0]);
				self.lookup(match[1], function(str) {
					bot.say(nick, str);
				});
			}
		}*/
	}
}

module.exports = RedditPlugin;
