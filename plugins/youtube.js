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

	self.ISO2dt = function(str) {
		var re = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/; // TODO: support fractional numbers
		var size = [7, 24, 60, 60];

		var m = str.match(re);

		var dt = parseInt(m[1]) || 0;
		for (var i = 0; i < size.length; i++)
			dt = size[i] * dt + (parseInt(m[i + 2]) || 0);
		return dt * 1000; // dt in ms
	};

	self.duration = function(t) {
		return bot.plugins.date.printDurTime(self.ISO2dt(t));
	};

	self.format = function(data, time, callback) {
		var str = "\x1Fhttps://youtu.be/" + data.id + (time ? "?t=" + time : "") + "\x1F : \x02" + data.snippet.title + "\x02 [" + self.duration(data.contentDetails.duration) + "] by " + data.snippet.channelTitle + "; " + bot.plugins.util.thSeps(data.statistics.viewCount.toString()) + " views";
		if (data.statistics !== undefined) {
			var likes = parseFloat(data.statistics.likeCount);
			var dislikes = parseFloat(data.statistics.dislikeCount);
			if (likes + dislikes > 0) {
				var bar = "\x033" + new Array(Math.round(likes / (likes + dislikes) * 10) + 1).join("+") + "\x034" + new Array(Math.round(dislikes / (likes + dislikes) * 10) + 1).join("-") + "\x03";
				str += "; " + bar;
			}
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
