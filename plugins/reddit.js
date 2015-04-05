var request = require("request");
var url = require("url");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["cmd", "ignore", "date"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\.[^\s]*\b/i;
	self.redditRe = /reddit\.com\/(r\/[^\s\/]+\/)?comments\//i;
	self.urlSort = "hot";
	self.urlTime = "week";

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
		var warning = post.over_18 ? " \x034[NSFW]\x03" : "";
		var str = "\x1Fhttp://redd.it/" + post.id + "\x1F" + warning + " : \x02" + post.title + "\x02 [r/" + post.subreddit + "] by " + post.author + " " + bot.plugins.date.printDur(new Date(post.created_utc * 1000), null, 1) + " ago; " + post.num_comments + " comments; " + post.score + " score";

		return str;
	};

	self.cleanUrl = function(lurl) {
		var obj = url.parse(lurl);
		obj.search = obj.query = obj.hash = null;
		return encodeURI(url.format(obj));
	};

	self.lookupOther = function(lurl, callback) {
		self.request({uri: "https://www.reddit.com/search.json", qs: {"q": "url:'" + lurl + "'", "limit": 3, "sort": self.urlSort, "t": self.urlTime}}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).data;
				var results = data.children;

				for (var i = 0; i < results.length; i++) {
					var post = results[i].data;

					if (post.url.indexOf(lurl) >= 0) { // actually contains link (prevent reddit search stupidity)
						(callback || function(){})(self.formatPost(post));
						break;
					}
				}
			}
		});
	};

	self.lookupReddit = function(rurl, callback) {
		self.request(self.cleanUrl(rurl) + ".json", function(err, res, body) {
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
			if ((self.channels.indexOf(to) != -1) && !bot.plugins.ignore.ignored(self.ignores, message)) {
				var match = text.match(self.urlRe);
				if (match) {
					self.lookup(match[0], function(str) {
						bot.out.log("reddit", nick + " in " + to + ": " + match[0]);
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text, message) {
			var match = text.match(self.urlRe);
			if (match) {
				self.lookup(match[0], function(str) {
					bot.out.log("reddit", nick + " in PM: " + match[0]);
					bot.say(nick, str);
				});
			}
		},
	};
}

module.exports = RedditPlugin;
