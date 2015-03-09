var request = require("request");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["auth", "cmd"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\b/i;
	self.redditRe = /reddit\.com\/r\/[^\s\/]+\/comments\//i;
	self.urlSort = "";
	self.urlTime = "";

	self.channels = [];
	self.ignores = [];

	self.request = request.defaults({headers: {"User-Agent": "simbot reddit 1.0"}});

	self.load = function(data) {
		self.urlSort = data.urlSort;
		self.urlTime = data.urlTime;
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.save = function() {
		return {urlSort: self.urlSort, urlTime: self.urlTime, channels: self.channels, ignores: self.ignores};
	};

	self.formatPost = function(post) {
		var str = "\x1Fhttp://redd.it/" + post.id + "\x1F : \x02" + post.title + "\x02 [r/" + post.subreddit + "] by " + post.author + "; " + post.num_comments + " comments; " + post.score + " score";

		return str;
	};

	self.lookupOther = function(lurl, callback) {
		self.request({uri: "https://www.reddit.com/search.json", qs: {"q": "url:" + lurl, "limit": 1, "sort": self.urlSort, "t": self.urlTime}}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).data;
				var results = data.children;

				if (results.length > 0) {
					(callback || function(){})(self.formatPost(results[0].data));
				}
			}
		});
	};

	self.lookupReddit = function(rurl, callback) {
		self.request(rurl + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body)[0].data;
				var results = data.children;

				if (results.length > 0) {
					(callback || function(){})(self.formatPost(results[0].data));
				}
			}
		});
	};

	self.lookup = function(url, callback) {
		(url.match(self.redditRe) ? self.lookupReddit : self.lookupOther)(url, callback);
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
