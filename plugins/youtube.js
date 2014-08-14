var request = require("request");
var querystring = require("querystring");

function YoutubePlugin(bot) {
	var self = this;
	self.name = "youtube";
	self.help = "Youtube plugin";
	self.depend = ["auth", "cmd"];
	
	self.vidre = new RegExp('(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})', "i");

	self.channels = [];
	self.ignores = [];

	self.load = function(data) {
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.save = function() {
		return {channels: self.channels, ignores: self.ignores};
	};

	// http://www.mredkj.com/javascript/numberFormat.html#addcommas
	self.thseps = function(nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	self.duration = function(t) {
		var str = "";
		str = ("0" + (t % 60).toString()).slice(-2);
		t = Math.floor(t / 60);
		if (t > 0) {
			str = (t % 60).toString() + ":" + str;
			t = Math.floor(t / 60);
			if (t > 0) {
				if (str.length < 5)
					str = "0" + str;
				str = t.toString() + ":" + str;
			}
		}
		else
			str = "0:" + str;
		return str;
	};

	self.format = function(data, callback) {
		var views = data["yt$statistics"] ? data["yt$statistics"].viewCount : 0;
		var id = data.id["$t"].split(":")[3]; // hacky way to parse video id out of given result to use in link
		var str = "\x1Fhttp://youtu.be/" + id + "\x1F : \x02" + data.title["$t"] + "\x02 [" + self.duration(data["media$group"]["yt$duration"].seconds) + "] by " + data.author[0].name["$t"] + "; " + self.thseps(views.toString()) + " views";
		if (data["yt$rating"] !== undefined) {
			var likes = parseFloat(data["yt$rating"].numLikes);
			var dislikes = parseFloat(data["yt$rating"].numDislikes);
			var bar = "\x033" + new Array(Math.round(likes / (likes + dislikes) * 10) + 1).join("+") + "\x034" + new Array(Math.round(dislikes / (likes + dislikes) * 10) + 1).join("-") + "\x03"; 
			str += "; " + bar;
		}
		(callback || function(){})(str);
	};

	self.lookup = function(id, callback) {
		request("https://gdata.youtube.com/feeds/api/videos/" + id + "?v=2&alt=json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).entry;
				self.format(data, callback);
			}
		});
	};

	self.search = function(query, callback) {
		request("https://gdata.youtube.com/feeds/api/videos/?v=2&alt=json&max-results=1&q=" + querystring.escape(query), function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).feed.entry[0];
				self.format(data, callback);
			}
		});
	};

	self.events = {
		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) &&
				!self.ignores.some(function (elem, i, arr) {
					return bot.plugins.auth.match(message.nick + "!" + message.user + "@" + message.host, elem);
				})) {
				var match = text.match(self.vidre);
				if (match) {
					bot.out.log("youtube", nick + " in " + to + ": " + match[0]);
					self.lookup(match[1], function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text, message) {
			var match = text.match(self.vidre);
			if (match) {
				bot.out.log("youtube", nick + " in PM: " + match[0]);
				self.lookup(match[1], function(str) {
					bot.say(nick, str);
				});
			}
		},

		"cmd#yt": function(nick, to, args) {
			self.search(args[0], function(str) {
				bot.say(to, str);
			});
		}
	}
}

module.exports = YoutubePlugin;
