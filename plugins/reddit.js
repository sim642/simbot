var request = require("request");
var url = require("url");

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["cmd", "ignore", "date", "bitly", "util"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\.[^\s]*\b/i;
	self.urlRedditRe = /reddit\.com\/(r\/[^\s\/]+\/)?comments\/([0-9a-z]+)(?:\/\w*\/([0-9a-z]+)(\?context=\d+)?)?/i;
	self.urlLiveRe = /reddit\.com\/live\/(\w+)(?:\/updates\/([0-9a-z\-]+))?/i;
	self.urlSort = "hot";
	self.urlTime = "week";

	self.channels = {}; /* true | {reddit: false/true, other: false/true}*/
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
			tickers[listing] = {channels: self.tickers[listing].channels, short: self.tickers[listing].short, extra: self.tickers[listing].extra};

		return {
			urlSort: self.urlSort,
			urlTime: self.urlTime,
			channels: self.channels,
			ignores: self.ignores,
			tickers: tickers};
	};


	self.formatPost = function(post, short, callback) { // ignores extra
		short = short || false;

		var warning = post.over_18 ? " \x034[NSFW]\x03" : "";
		var str = "\x1Fhttp://redd.it/" + post.id + "\x1F" + warning + " : \x02" + bot.plugins.util.unescapeHtml(post.title) + "\x02 [r/" + post.subreddit + "] by " + post.author;

		if (!short)
			str += " " + bot.plugins.date.printDur(new Date(post.created_utc * 1000), null, 1) + " ago; " + post.num_comments + " comments; " + post.score + " score";

		callback(str);
	};

	self.formatComment = function(comment, short, callback, extra) {
		short = short || false;

		self.request("https://www.reddit.com/by_id/" + comment.link_id + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var post = JSON.parse(body).data.children[0].data;

				var longurl = "http://reddit.com" + post.permalink + comment.id + (extra || "");
				bot.plugins.bitly.shorten(longurl, function(shorturl) {
					var warning = post.over_18 ? " \x034[NSFW]\x03" : "";
					var str = "\x1F" + shorturl + "\x1F" + warning + " : \x02" + bot.plugins.util.unescapeHtml(post.title) + "\x02 [r/" + post.subreddit + "/comments] by " + comment.author;

					if (!short)
						str += " " + bot.plugins.date.printDur(new Date(comment.created_utc * 1000), null, 1) + " ago; " + comment.score + " score";

					callback(str);
				});
			}
		});
	};

	self.formatEvent = function(event, short, callback) { // ignores extra
		short = short || false;

		var warning = event.nsfw ? " \x034[NSFW]\x03" : "";
		var str = "\x1Fhttp://reddit.com/event/" + event.id + "\x1F" + warning + " : \x02" + bot.plugins.util.unescapeHtml(event.title) + "\x02 [" + event.state + "]";

		if (!short)
			str += " " + bot.plugins.date.printDur(new Date(event.created_utc * 1000), null, 1) + " ago; " + (event.viewer_count_fuzzed ? "~" : "") + event.viewer_count + " viewers; " + bot.plugins.util.unescapeHtml(event.description);

		callback(str);
	};

	self.formatUpdate = function(update, short, callback, extra) {
		short = short || false;

		self.request("https://www.reddit.com/live/" + extra + "/about.json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var event = JSON.parse(body).data;

				var longurl = "http://reddit.com/live/" + event.id + "/updates/" + update.id;
				bot.plugins.bitly.shorten(longurl, function(shorturl) {
					var warning = event.nsfw ? " \x034[NSFW]\x03" : "";
					var str = "\x1F" + shorturl + "\x1F" + warning + " : \x02" + bot.plugins.util.unescapeHtml(event.title) + "\x02 [" + event.state + "/updates] by " + update.author;

					if (!short)
						str += " " + bot.plugins.date.printDur(new Date(update.created_utc * 1000), null, 1) + " ago; " + bot.plugins.util.unescapeHtml(update.body);

					callback(str);
				});
			}
		});
	};

	self.format = function(item, short, callback, extra) {
		var mapping = {
			"t3": self.formatPost,
			"t1": self.formatComment,
			"LiveUpdateEvent": self.formatEvent,
			"LiveUpdate": self.formatUpdate
		};

		return mapping[item.kind](item.data, short, callback, extra);
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
					}, match[4]);
				}
			}
		});
	};

	self.lookupLive = function(lurl, callback) {
		var match = lurl.match(self.urlLiveRe);
		var id = match[1];
		var uid = match[2];

		if (!uid) {
			self.request("https://www.reddit.com/live/" + id + "/about.json", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body);

					self.format(data, false, function(str) {
						callback(str);
					});
				}
			});
		}
		else {
			self.request("https://www.reddit.com/live/" + id + "/updates/" + uid + ".json", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body).data;
					var results = data.children;

					if (results.length > 0) {
						self.format(results[0], false, function(str) {
							callback(str);
						}, id);
					}
				}
			});
		}
	};

	self.lookup = function(url, callback) {
		var func = null;

		if (self.urlRedditRe.test(url))
			func = self.lookupReddit;
		else if (self.urlLiveRe.test(url))
			func = self.lookupLive;
		else
			func = self.lookupOther;

		func(url, callback);
	};

	self.tickerStart = function(listing, channels, short, extra) {
		self.tickerStop(listing);

		self.tickers[listing] = {
			channels: channels,
			short: short || false,
			extra: extra || null
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
										}, self.tickers[listing].extra);
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
			if ((to in self.channels) && !bot.plugins.ignore.ignored(self.ignores, message)) {
				var match = text.match(self.urlRe);
				if (match) {
					var url = match[0];

					var func = function(){};
					if (self.channels[to] === true)
						func = self.lookup;
					else if (self.channels[to].reddit && url.match(self.urlRedditRe))
						func = self.lookupReddit;
					else if (self.channels[to].live && url.match(self.urlLiveRe))
						func = self.lookupLive;
					else if (self.channels[to].other)
						func = self.lookupOther;

					func(url, function(str) {
						bot.out.log("reddit", nick + " in " + to + ": " + url);
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

		"cmd#tickerstart": bot.plugins.auth.proxyEvent(6, function(nick, to, args) {
			var listing = null;
			var channels = [];
			var extra = null;
			var short = false;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg == "short")
					short = true;
				else if (arg.match(/^#/))
					channels.push(arg);
				else if (arg.match(/^\//))
					listing = arg;
				else
					extra = arg;
			}

			if (channels.length == 0) {
				channels.push(to);
			}

			if (listing in self.tickers) {
				self.tickers[listing].channels = self.tickers[listing].channels.concat(channels);
			}
			else {
				self.tickerStart(listing, channels, short, extra);
			}
		}),

		"cmd#tickerstop": bot.plugins.auth.proxyEvent(6, function(nick, to, args) {
			var listing = null;
			var channels = [];
			var all = false;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg == "*")
					all = true;
				else if (arg.match(/^#/))
					channels.push(arg);
				else if (arg.match(/^\//))
					listing = arg;
			}

			if (channels.length == 0) {
				channels.push(to);
			}

			if (all) {
				self.tickerStop(listing);
			}
			else {
				self.tickers[listing].channels = self.tickers[listing].channels.filter(function(channel) {
					return channels.indexOf(channel) < 0;
				});
			}
		}),
	};
}

module.exports = RedditPlugin;
