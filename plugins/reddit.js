var request = require("request");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["auth", "cmd"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\b/i;

	self.channels = [];
	self.ignores = [];

	self.request = request.defaults({headers: {"User-Agent": "simbot reddit 1.0"}});

	self.load = function(data) {
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.save = function() {
		return {channels: self.channels, ignores: self.ignores};
	};

	self.lookup = function(lurl, callback) {
		self.request({uri: "https://www.reddit.com/search.json", qs: {"q": "url:" + lurl, "limit": 1, "sort": "hot", "t": "week"}}, function(err, res, body) {
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
					self.lookup(match[0], function(str) {
						bot.out.log("reddit", nick + " in " + to + ": " + match[0]);
						bot.say(to, str);
					});
				}
			}
		}
	}
}

module.exports = RedditPlugin;
