var request = require("request");
var url = require("url");
var WebSocket = require("ws");
var ffmpeg = require('fluent-ffmpeg');

function RedditPlugin(bot) {
	var self = this;
	self.name = "reddit";
	self.help = "Reddit plugin";
	self.depend = ["cmd", "ignore", "date", "bitly", "util"];

	self.urlRe = /\b(https?|ftp):\/\/[^\s\/$.?#].[^\s]*\.[^\s]*\b/i;
	self.urlRedditRe = /(?:reddit\.com\/(r\/[^\s\/]+\/)?comments|redd\.it)\/([0-9a-z]+)(?:\/\w*\/([0-9a-z]+)(\?context=\d+)?)?/i;
	self.urlLiveRe = /reddit\.com\/live\/(\w+)(?:\/updates\/([0-9a-z\-]+))?/i;
	self.urlVideoRe = /(?:reddit\.com\/video|v\.redd\.it)\/([0-9a-z]+)/i;
	self.urlSort = "hot";
	self.urlTime = "week";
	self.listingLive = /^\/live\/(\w+)/i;

	self.subUserRe = /\/([ru]|user)\/([^\s\/]+)/i;

	self.channels = {}; /* true | {reddit: false/true, other: false/true}*/
	self.ignores = [];
	self.linkedLookup = true;

	self.tickers = {};
	self.interval = null;

	self.userAgent = "simbot reddit 2.0 (/u/sim642)";
	self.clientId = null;
	self.clientSecret = null;
	self.tokenTimeout = null;
	self.baseUrl = "https://www.reddit.com";
	self.request = request.defaults({headers: {"User-Agent": self.userAgent}});

	self.load = function(data) {
		self.setOAuth(data.clientId || null, data.clientSecret || null);
		self.urlSort = data.urlSort;
		self.urlTime = data.urlTime;
		self.channels = data.channels;
		self.ignores = data.ignores;
		self.linkedLookup = data.linkedLookup !== undefined ? data.linkedLookup : true;
		self.tickers = data.tickers || {};
	};

	self.enable = function() {
		self.tickerCheck();
		self.interval = setInterval(self.tickerCheck, 1 * 60 * 1000);

		for (var listing in self.tickers) {
			self.wsGuarantee(listing);
		}
	};

	self.disable = function() {
		clearTimeout(self.tokenTimeout);
		self.tokenTimeout = null;
		clearInterval(self.interval);
		self.interval = null;

		for (var listing in self.tickers) {
			if (self.tickers[listing].ws)
				self.tickers[listing].ws.close();
		}
	};

	self.save = function() {
		var tickers = {};
		for (var listing in self.tickers)
			tickers[listing] = {channels: self.tickers[listing].channels, short: self.tickers[listing].short, extra: self.tickers[listing].extra};

		return {
			clientId: self.clientId,
			clientSecret: self.clientSecret,
			urlSort: self.urlSort,
			urlTime: self.urlTime,
			channels: self.channels,
			ignores: self.ignores,
			linkedLookup: self.linkedLookup,
			tickers: tickers};
	};

	self.setOAuth = function(clientId, clientSecret) {
		self.clientId = clientId;
		self.clientSecret = clientSecret;

		clearTimeout(self.tokenTimeout);
		self.tokenTimeout = null;

		var fail = function() {
			self.baseUrl = "https://www.reddit.com";
			self.request = request.defaults({headers: {"User-Agent": self.userAgent}});
		};

		if (self.clientId && self.clientSecret) {
			self.request.post({url: "https://www.reddit.com/api/v1/access_token", auth: {user: clientId, pass: clientSecret}, form: {"grant_type": "client_credentials"}}, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body);

					self.baseUrl = "https://oauth.reddit.com";
					self.request = request.defaults({headers: {"Authorization": data.token_type + " " + data.access_token, "User-Agent": self.userAgent}});

					self.tokenTimeout = setTimeout(function() {
						self.setOAuth(clientId, clientSecret);
					}, data.expires_in * 1000);
				}
				else {
					bot.out.error("reddit", "couldn't get token: " + body);
					fail();
				}
			});
		}
		else
			fail();
	};

	self.formatPostLink = function(url, post, linked) {
		var flags = "";
		if (post.is_over18 || post.over_18)
			flags += "\x034[NSFW]\x03 ";
		if (post.spoiler)
			flags += "[SPOILER] ";

		if (linked)
			return "\x1F" + url + "\x1F " + flags + ": ";
		else
			return flags;
	};

	self.formatPost = function(post, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		var str = self.formatPostLink("https://redd.it/" + post.id, post, linked) + "\x02" + bot.plugins.util.unescapeHtml(post.title.trim()) + "\x02 [r/" + post.subreddit + "] by " + post.author;

		if (!short && !realtime)
			str += " " + bot.plugins.date.printDur(new Date(post.created_utc * 1000), null, 1) + " ago; " + post.num_comments + " comments; " + post.score + " score";

		callback(str);
	};

	self.formatComment = function(comment, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		self.request(self.baseUrl + "/by_id/" + comment.link_id + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var post = JSON.parse(body).data.children[0].data;

				var longurl = "https://reddit.com" + post.permalink + comment.id + (extra || "");
				bot.plugins.bitly.shorten(longurl, function(shorturl) {
					var str = self.formatPostLink(shorturl, post, linked) + "\x02" + bot.plugins.util.unescapeHtml(post.title.trim()) + "\x02 [r/" + post.subreddit + "/comments] by " + comment.author;

					if (!short && !realtime)
						str += " " + bot.plugins.date.printDur(new Date(comment.created_utc * 1000), null, 1) + " ago; " + comment.score + " score";

					callback(str);
				});
			}
		});
	};

	self.formatLink = function(url, warning, linked) {
		var warning = warning ? "\x034[NSFW]\x03 " : "";

		if (linked)
			return "\x1F" + url + "\x1F " + warning + ": ";
		else
			return warning;
	};

	self.formatEvent = function(event, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		var warning = event.nsfw ? " \x034[NSFW]\x03" : "";
		var str = self.formatLink("https://reddit.com/live/" + event.id, event.nsfw, linked) + "\x02" + bot.plugins.util.unescapeHtml(event.title.trim()) + "\x02 [" + event.state + "]";

		if (!short)
			str += (!realtime ? " " + bot.plugins.date.printDur(new Date(event.created_utc * 1000), null, 1) + " ago; " + (event.viewer_count_fuzzed ? "~" : "") + event.viewer_count + " viewers" : "" ) + "; " + bot.plugins.util.unescapeHtml(event.description.trim()).replace(/[\r\n]/g, " \\ ");

		callback(str);
	};

	self.formatUpdate = function(update, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		self.request(self.baseUrl + "/live/" + extra + "/about.json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var event = JSON.parse(body).data;

				var longurl = "https://reddit.com/live/" + event.id + "/updates/" + update.id;
				bot.plugins.bitly.shorten(longurl, function(shorturl) {
					var str = self.formatLink(shorturl, event.nsfw, linked) + "\x02" + bot.plugins.util.unescapeHtml(event.title.trim()) + "\x02 [" + event.state + "/updates] by " + update.author;

					if (!short)
						str += (!realtime ? " " + bot.plugins.date.printDur(new Date(update.created_utc * 1000), null, 1) + " ago" : "") + "; " + bot.plugins.util.unescapeHtml(update.body.trim()).replace(/[\r\n]/g, " \\ ");

					callback(str);
				});
			}
			else
				bot.out.error("reddit", self.baseUrl + "/live/" + extra + "/about.json", res, body);
		});
	};

	self.formatSubreddit = function(subreddit, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		var warning = subreddit.over18 ? " \x034[NSFW]\x03" : "";
		var private = subreddit.subreddit_type != "public" ? " [" + subreddit.subreddit_type + "]" : "";
		var str = self.formatLink("https://reddit.com" + subreddit.url, subreddit.over18, linked) + "\x02" + bot.plugins.util.unescapeHtml(subreddit.title.trim()) + "\x02" + private;

		if (!short && !realtime)
			str += "; " + bot.plugins.util.thSeps(subreddit.subscribers) + " subscribers; " + bot.plugins.util.thSeps(subreddit.accounts_active) + " active";

		callback(str);
	};

	self.formatUser = function(user, short, linked, callback, extra, realtime) {
		short = short || false;
		realtime = realtime || false;

		var str = self.formatLink("https://reddit.com/u/" + user.name, false, linked) + "\x02" + user.name + "\x02";

		if (!user.is_suspended) {
			var flags = "";
			if (user.over18)
				flags += " \x034[18+]\x03";
			if (user.is_gold)
				flags += " \x038[GOLD]\x03";
			if (user.is_mod)
				flags +=" \x033[MOD]\x03";

			str += "; " + bot.plugins.util.thSeps(user.link_karma) + " link karma; " + bot.plugins.util.thSeps(user.comment_karma) + " comment karma";

			if (!short && !realtime)
				str += "; redditor for " + bot.plugins.date.printDur(new Date(user.created_utc * 1000), null, 1) + (flags != "" ? ";" + flags : "");
		}
		else
			str += "; \x034[SUSPENDED]\x03";

		callback(str);
	};

	self.format = function(item, short, linked, callback, extra, realtime) {
		var mapping = {
			"t3": self.formatPost,
			"t1": self.formatComment,
			"LiveUpdateEvent": self.formatEvent,
			"LiveUpdate": self.formatUpdate,
			"t5": self.formatSubreddit,
			"t2": self.formatUser
		};

		return mapping[item.kind](item.data, short, linked, callback, extra, realtime);
	};

	self.cleanUrl = function(lurl) {
		var obj = url.parse(lurl);
		obj.search = obj.query = obj.hash = null;
		return encodeURI(url.format(obj));
	};

	self.lookupOther = function(lurl, callback) {
		self.request({uri: self.baseUrl + "/search.json", qs: {"q": "url:'" + lurl + "'", "limit": 3, "sort": self.urlSort, "t": self.urlTime}}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).data;
				var results = data.children;

				for (var i = 0; i < results.length; i++) {
					var post = results[i].data;

					if (post.url.indexOf(lurl) >= 0) { // actually contains link (prevent reddit search stupidity)
						self.formatPost(post, false, self.linkedLookup, function(str) {
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
		var url = self.cleanUrl(rurl.replace(/redd\.it/i, "reddit.com/comments").replace(/(https?:\/\/)?(\w+\.)?reddit\.com/i, self.baseUrl)) + ".json";
		self.request(url, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body)[+isComment].data;
				var results = data.children;

				if (results.length > 0) {
					self.format(results[0], false, self.linkedLookup, function(str) {
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
			self.request(self.baseUrl + "/live/" + id + "/about.json", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body);

					self.format(data, false, self.linkedLookup, function(str) {
						callback(str);
					});
				}
			});
		}
		else {
			self.request(self.baseUrl + "/live/" + id + "/updates/" + uid + ".json", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body).data;
					var results = data.children;

					if (results.length > 0) {
						self.format(results[0], false, self.linkedLookup, function(str) {
							callback(str);
						}, id);
					}
				}
			});
		}
	};

	self.lookupVideo = function(vurl, callback) {
		var match = vurl.match(self.urlVideoRe);
		var vid = match[1];
		self.request(self.baseUrl + "/video/" + vid + ".json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body)[0].data;
				var results = data.children;

				self.format(results[0], false, self.linkedLookup, function(str) {
					callback(str);
				});
			}
		});
	};

	self.lookupSubUser = function(suurl, callback, linked) {
		linked = linked || self.linkedLookup;

		var match = suurl.match(self.subUserRe);
		var url = self.baseUrl + match[0] + "/about.json";
		self.request(url, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);

				self.format(data, false, linked, function(str) {
					callback(str);
				});
			}
		});
	};

	self.lookup = function(url, callback) {
		var func = null;

		if (self.urlVideoRe.test(url))
			func = self.lookupVideo;
		else if (self.urlRedditRe.test(url))
			func = self.lookupReddit;
		else if (self.urlLiveRe.test(url))
			func = self.lookupLive;
		else if (self.subUserRe.test(url))
			func = self.lookupSubUser;
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

		var m = listing.match(self.listingLive);
		if (m) {
			extra = m[1];
		}

		self.wsGuarantee(listing);
	};

	self.tickerStop = function(listing) {
		delete self.tickers[listing];
	};

	self.tickerCheck = function() {
		for (var listing in self.tickers) {
			if (!self.tickers[listing].ws) {
				(function(listing) {
					self.request(self.baseUrl + listing + ".json", function(err, res, body) {
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
											self.format(list[i], self.tickers[listing].short, true, function(str) {
												bot.say(to, str);
											}, self.tickers[listing].extra, true);
										});
									}
								}
							}

							self.tickers[listing].pList = list;
						}
						else if (res && res.statusCode == 503)
							bot.out.warn("reddit", "servers are busy (" + self.baseUrl + listing + ".json)");
						else if (err)
							bot.out.error("reddit", self.baseUrl + listing + ".json", err);
						else
							bot.out.error("reddit", self.baseUrl + listing + ".json", res.statusCode, res, body);
					});
				})(listing);
			}
		}
	};

	self.wsUrl = function(listing, callback) {
		self.request(self.baseUrl + listing + "/about.json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);

				if (data.data.websocket_url)
					callback(bot.plugins.util.unescapeHtml(data.data.websocket_url), data.data);
			}
			else
				bot.out.error("reddit", self.baseUrl + listing + "/about.json", res, body);
		});
	}

	self.wsGuarantee = function(listing) {
		var m = listing.match(self.listingLive);
		if (m) {
			self.wsUrl(listing, function(wsUrl, data) {
				self.wsStart(listing, wsUrl, data);
			});
		}
	};

	self.wsStart = function(listing, url, data) {
		self.tickers[listing].eventData = data;

		bot.out.doing("reddit", "WS for " + listing + " connecting...");
		self.tickers[listing].ws = new WebSocket(url);

		self.tickers[listing].ws.on("open", function() {
			bot.out.ok("reddit", "WS for " + listing + " connected");
		});

		self.tickers[listing].ws.on("error", function(code, message) {
			bot.out.error("reddit", "WS (" + url + ") for " + listing + " errored (" + code + "): " + message);
			delete self.tickers[listing].ws;
		});

		self.tickers[listing].ws.on("close", function(code, message) {
			bot.out.error("reddit", "WS for " + listing + " closed (" + code + "): " + message);
			delete self.tickers[listing].ws;

			if (code != 1000)
				self.wsGuarantee(listing);
		});

		self.tickers[listing].ws.on("message", function(message) {
			var data = JSON.parse(message);
			switch (data.type) {
				case "update":
					self.wsTick(listing, data.payload);
					break;

				case "settings":
					for (var key in data.payload) {
						self.tickers[listing].eventData[key] = data.payload[key];
					}
					self.wsEventUpdate(listing);
					break;

				case "complete":
					self.tickers[listing].eventData.state = "complete";
					self.wsEventUpdate(listing);
					break;
			}
		});
	};

	self.wsEventUpdate = function(listing) {
		self.formatEvent(self.tickers[listing].eventData, self.tickers[listing].short, function(str) {
			self.tickers[listing].channels.forEach(function(to) {
				bot.say(to, str);
			});
		}, self.tickers[listing].extra, true);
	};

	self.wsTick = function(listing, payload) {
		self.formatUpdate(payload.data, self.tickers[listing].short, function(str) {
			self.tickers[listing].channels.forEach(function(to) {
				bot.say(to, str);
			});
		}, self.tickers[listing].extra, true);
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
					else if (self.channels[to].video && url.match(self.urlVideoRe))
						func = self.lookupVideo;
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
				else {
					var match = text.match(self.subUserRe);
					if (match) {
						var url = match[0];

						if ((self.channels[to] === true && match[1] != "user") || // /user only in URLs
							(self.channels[to].subreddit && match[1] == "r") ||
							(self.channels[to].user && match[1] == "u")) // /user only in URLs
						{
							self.lookupSubUser(url, function(str) {
								bot.out.log("reddit", nick + " in " + to + ": " + url);
								bot.say(to, str);
							}, true);
						}
					}
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
			else {
				var match = text.match(self.subUserRe);
				if (match && match[1] != "user") { // /user only in URLs
					self.lookupSubUser(match[0], function(str) {
						bot.out.log("reddit", nick + " in " + to + ": " + match[0]);
						bot.say(to, str);
					}, true);
				}
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

		"webs#/vreddit": function(req, qs, body, res) {
			res.writeHead(200, {
				"Content-Type": "video/mp4"
			});

			ffmpeg()
				.input("https://v.redd.it/0sjm5028e0a11/DASH_9_6_M")
				.input("https://v.redd.it/0sjm5028e0a11/audio")
				.format("mp4")
				.outputOptions('-movflags frag_keyframe+empty_moov')
				.videoCodec("copy")
				.audioCodec("copy")
				.pipe(res, {end: true});
		}
	};
}

module.exports = RedditPlugin;
