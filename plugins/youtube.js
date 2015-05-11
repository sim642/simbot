var request = require("request");
var querystring = require("querystring");

function YoutubePlugin(bot) {
	var self = this;
	self.name = "youtube";
	self.help = "Youtube plugin";
	self.depend = ["cmd", "ignore", "util"];

	self.apiKey = null;
	
	self.vidre = new RegExp('(?:youtube(?:-nocookie)?\\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\\.be/)([^"&?/ ]{11})(?:[?#]t=((?:\\d+[hms])+))?', "i");

	self.channels = [];
	self.ignores = [];

	self.load = function(data) {
		self.apiKey = data.apiKey || null;
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.save = function() {
		return {apiKey: self.apiKey, channels: self.channels, ignores: self.ignores};
	};

	self.duration = function(t) {
		var re = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
		var match = t.match(re);

		if (!match) {
			bot.out.warn("youtube", "weird duration: " + t);
			return t.replace("P", "").replace("T", " ").toLowerCase();
		}

		var str = "";
		str = ("0" + match[3]).slice(-2);
		if (match[2]) {
			str = match[2] + ":" + str;
			if (match[1]) { // BUG: might not be reached when there's exactly seconds and hours but no minutes
				if (str.length < 5)
					str = "0" + str;
				str = match[1] + ":" + str;
			}
		}
		else
			str = "0:" + str;
		return str;
	};

	self.format = function(data, time, callback) {
		var str = "\x1Fhttps://youtu.be/" + data.id + (time ? "?t=" + time : "") + "\x1F : \x02" + data.snippet.title + "\x02 [" + self.duration(data.contentDetails.duration) + "] by " + data.snippet.channelTitle + "; " + bot.plugins.util.thSeps(data.statistics.viewCount.toString()) + " views";
		if (data.statistics !== undefined) {
			var likes = parseFloat(data.statistics.likeCount);
			var dislikes = parseFloat(data.statistics.dislikeCount);
			var bar = "\x033" + new Array(Math.round(likes / (likes + dislikes) * 10) + 1).join("+") + "\x034" + new Array(Math.round(dislikes / (likes + dislikes) * 10) + 1).join("-") + "\x03"; 
			str += "; " + bar;
		}
		(callback || function(){})(str);
	};

	self.lookup = function(match, callback) {
		request({
				uri: "https://www.googleapis.com/youtube/v3/videos",
				qs: {
					part: "id,snippet,contentDetails,statistics,status",
					id: match[1],
					key: self.apiKey
				}
			}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).items;
				if (data[0] !== undefined)
					self.format(data[0], match[2], callback);
				else
					(callback || function(){})("'\x02" + match[1] + "\x02' is an invalid video ID");
			}
		});
	};

	self.search = function(query, callback) {
		request({
				uri: "https://www.googleapis.com/youtube/v3/search",
				qs: {
					part: "id",
					maxResults: 1,
					type: "video",
					q: query,
					key: self.apiKey
				}
			}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body).items;
				if (data[0] !== undefined)
					self.lookup([, data[0].id.videoId, ], callback); // ugly match imitating syntax
				else
					(callback || function(){})("'\x02" + query + "\x02' returned no videos");
			}
		});
	};

	self.events = {
		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) && !bot.plugins.ignore.ignored(self.ignores, message)) {
				var match = text.match(self.vidre);
				if (match) {
					bot.out.log("youtube", nick + " in " + to + ": " + match[0]);
					self.lookup(match, function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text, message) {
			var match = text.match(self.vidre);
			if (match) {
				bot.out.log("youtube", nick + " in PM: " + match[0]);
				self.lookup(match, function(str) {
					bot.say(nick, str);
				});
			}
		},

		"cmd#yt": function(nick, to, args) {
			self.search(args[0], function(str) {
				bot.say(to, str);
			});
		}
	};
}

module.exports = YoutubePlugin;
