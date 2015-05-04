var request = require("request");
var url = require("url");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["cmd", "ignore", "date"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\.[^\s]*\b/i;
	self.urlRedditRe = /reddit\.com\/(r\/[^\s\/]+\/)?comments\/([0-9a-z]+)(?:\/\w*\/([0-9a-z]+))?/i;
	self.urlSort = "hot";
	self.urlTime = "week";

	self.channels = [];
	self.ignores = [];

	self.tickers = {};
	self.interval = null;

	self.request = request.defaults({headers: {"User-Agent": "simbot reddit 1.0"}});

	self.load = function(data) {
		self.urlSort = data.urlSort;
		self.urlTime = data.urlTime;
		self.channels = data.channels;
		self.ignores = data.ignores;
		self.tickers = data.tickers || {};
	};

	self.enable = function() {
		self.tickerCheck();
		self.interval = setInterval(self.tickerCheck, 1 * 60 * 1000);
	};

	self.disable = function() {
		clearInterval(self.interval);
		self.interval = null;
	};

	self.save = function() {
		var tickers = {};
		for (var listing in self.tickers)
			tickers[listing] = {channels: self.tickers[listing].channels, short: self.tickers[listing].short};

		return {
			urlSort: self.urlSort,
			urlTime: self.urlTime,
			channels: self.channels,
			ignores: self.ignores,
			tickers: tickers};
	};

	self.unescapeHtml = function(html) {
		return html.replace(/&([#\w]+);/g, function(_, n) {
			n = n.toLowerCase();
			if (n === 'amp') return '&';
			if (n === 'colon') return ':';
			if (n === 'lt') return '<';
			if (n === 'gt') return '>';
			if (n === 'quot') return '"';
			if (n.charAt(0) === '#') {
				return n.charAt(1) === 'x' ?
					String.fromCharCode(parseInt(n.substring(2), 16)) :
					String.fromCharCode(+n.substring(1));
			}
			return '';
		});
	};

	self.formatPost = function(post, short, callback) {
		short = short || false;

		var warning = post.over_18 ? " \x034[NSFW]\x03" : "";
		var str = "\x1Fhttp://redd.it/" + post.id + "\x1F" + warning + " : \x02" + self.unescapeHtml(post.title) + "\x02 [r/" + post.subreddit + "] by " + post.author;

		if (!short)
			str += " " + bot.plugins.date.printDur(new Date(post.created_utc * 1000), null, 1) + " ago; " + post.num_comments + " comments; " + post.score + " score";

		callback(str);
	};

	self.formatComment = function(comment, short, callback) {
		short = short || false;

		self.request("https://www.reddit.com/by_id/" + comment.link_id + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var post = JSON.parse(body).data.children[0].data;

				var warning = post.over_18 ? " \x034[NSFW]\x03" : "";
				var str = "\x1Fhttp://reddit.com" + post.permalink + comment.id + "\x1F" + warning + " : \x02" + self.unescapeHtml(post.title) + "\x02 [r/" + post.subreddit + "] by " + comment.author;

				if (!short)
					str += " " + bot.plugins.date.printDur(new Date(comment.created_utc * 1000), null, 1) + " ago; " + comment.score + " score";

				callback(str);
			}
		});
	};

	self.format = function(item, short, callback) {
		return (item.kind == "t1" ? self.formatComment : self.formatPost)(item.data, short, callback);
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
						self.formatPost(post, false, function(str) {
							callback(str);
						});
						break;
					}
				}
			}
		});
	};

	self.lookupReddit = function(rurl, callback) {
		var match = rurl.match(self.urlRedditRe);
		var isComment = match[3] !== undefined;
		self.request(self.cleanUrl(rurl) + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body)[+isComment].data;
				var results = data.children;

				if (results.length > 0) {
					self.format(results[0], false, function(str) {
						callback(str);
					});
				}
			}
		});
	};

	self.lookup = function(url, callback) {
		(url.match(self.urlRedditRe) ? self.lookupReddit : self.lookupOther)(url, callback);
	};

	self.tickerStart = function(listing, channels, short) {
		self.tickerStop(listing);

		self.tickers[listing] = {
			channels: channels,
			short: short || false
		};
	};

	self.tickerStop = function(listing) {
		delete self.tickers[listing];
	};

	self.tickerCheck = function() {
		for (var listing in self.tickers) {
			(function(listing) {
				self.request("https://www.reddit.com" + listing + ".json", function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var list = JSON.parse(body).data.children;
						var pList = self.tickers[listing].pList;

						if (pList) {
							for (var i = list.length - 1; i >= 0; i--) {
								var found = false;
								for (var j = 0; j < pList.length; j++) {
									if (pList[j].kind == list[i].kind && pList[j].data.id == list[i].data.id) {
										found = true;
										break;
									}
								}

								if (!found) {
									self.tickers[listing].channels.forEach(function(to) {
										self.format(list[i], self.tickers[listing].short, function(str) {
											bot.say(to, str);
										});
									});
								}
							}
						}

						self.tickers[listing].pList = list;
					}
				});
			})(listing);
		}
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
