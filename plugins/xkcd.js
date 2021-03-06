var request = require("request");

function XkcdPlugin(bot) {
	var self = this;
	self.name = "xkcd";
	self.help = "Xkcd plugin";
	self.depend = ["cmd"];

	self.apiKey = null;
	self.chans = [];

	self.load = function(data) {
		if (data) {
			self.apiKey = data.apiKey;
			self.chans = data.chans;
		}
		if (bot.plugins.pushbullet)
			bot.plugins.pushbullet.subscribe("xkcd");
	};

	self.save = function() {
		return {"apiKey": self.apiKey, "chans": self.chans};
	};

	self.xkcd = function(uri, callback) {
		request(uri + "info.0.json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);
				callback(j.title, "http://xkcd.com/" + j.num + "/");
			}
			else
				bot.out.error("xkcd", [err, body]);
		});
	};

	self.events = {
		"cmd#xkcd": function(nick, to, args) {
			if (!args[1] || /^\d+$/.test(args[1])) {
				var uri = "http://xkcd.com/";
				if (args[1])
					uri += args[1] + "/";
				self.xkcd(uri, function(title, url) {
					bot.say(to, "xkcd" + (args[1] ? " #" + args[1] : "") + ": \x02" + title + "\x02 - " + url);
				});
			}
			else if (args[1] == "random") {
				self.xkcd("http://c.xkcd.com/random/comic/", function(title, url) {
					bot.say(to, "random xkcd: \x02" + title + "\x02 - " + url);
				});
			}
			else {
				var match = args[0].match(/^(.*)\s+(\d+)\s*$/);
				var str;
				var i;
				if (match) {
					str = match[1];
					i = parseInt(match[2]);
				}
				else {
					str = args[0];
					i = 1;
				}
				str = str.trim();

				request({
						uri: "https://www.googleapis.com/customsearch/v1",
						qs: {
							key: self.apiKey,
							cx: "012652707207066138651:zudjtuwe28q",
							q: str
						}
					}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var json = JSON.parse(body);
						if (json.items !== undefined && json.items.length !== 0) {
							if (i - 1 >= 0 && i - 1 < json.items.length) {
								var item = json.items[i - 1];
								var title = item.title.match(/^xkcd:\s+(.*)$/)[1].trim();
								bot.say(to, "xkcd '" + str + "' [" + i + "/" + json.items.length + "]: \x02" + title + "\x02 - " + item.link);
							}
							else
								bot.say(to, nick + ": '" + str + "' [" + i + "/" + json.items.length + "] invalid result index");
						}
						else
							bot.say(to, nick + ": couldn't find xkcd");
					}
				});
			}
		},

		"message": function(nick, to, text) {
			if (self.chans.indexOf(to) != -1) {
				var m = text.match(/xkcd\.com\/(\d+)/);
				if (m) {
					var uri = "http://xkcd.com/" + m[1] + "/";
					bot.out.log("xkcd", nick + " in " + to + ": " + m[0]);
					self.xkcd(uri, function(title, url) {
						bot.say(to, "xkcd" + ": \x02" + title + "\x02 - " + url);
					});
				}
			}
		},

		"pm": function(nick, text) {
			var m = text.match(/xkcd\.com\/(\d+)/);
			if (m) {
				var uri = "http://xkcd.com/" + m[1] + "/";
				bot.out.log("xkcd", nick + " in PM: " + m[0]);
				self.xkcd(uri, function(title, url) {
					bot.say(nick, "xkcd" + ": \x02" + title + "\x02 - " + url);
				});
			}
		},

		"pushbullet#subscription#xkcd": function(push) {
			var text = "new xkcd: \x02" + push.title + "\x02 - " + push.url.replace("m.", "");
			for (var i = 0; i < self.chans.length; i++) {
				bot.say(self.chans[i], text);
			}
		}
	};
}

module.exports = XkcdPlugin;
