var request = require("request");

function YoutubePlugin(bot) {
	var self = this;
	self.name = "youtube";
	self.help = "Youtube plugin";
	self.depend = ["auth"];
	
	self.vidre = new RegExp('(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})', "i");

	self.channels = [];
	self.ignores = [];

	self.load = function(data) {
		self.channels = data.channels;
		self.ignores = data.ignores;
	};

	self.unload = function() {
		return {channels: self.channels, ignores: self.ignores};
	};

	self.events = {
		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) &&
				!self.ignores.some(function (elem, i, arr) {
					return bot.plugins.auth.match(message.nick + "!" + message.user + "@" + message.host, elem);
				})) {
				var match = text.match(self.vidre);
				if (match) {
					request("https://gdata.youtube.com/feeds/api/videos/" + match[1] + "?v=2&alt=json", function(err, res, body) {
						if (!err && res.statusCode == 200) {
							var data = JSON.parse(body).entry;
							bot.say(to, "\x1Fhttp://youtu.be/" + match[1] + "\x1F : \x02" + data.title["$t"] + "\x02 by " + data.author[0].name["$t"] + ", " + data["yt$statistics"].viewCount.toString() + " views, " + data["yt$rating"].numLikes.toString() + " likes, " + data["yt$rating"].numDislikes.toString() + " dislikes");
						}
					});
				}
			}
		},

		"pm": function(nick, text, message) {
			var match = text.match(self.vidre);
			if (match) {
				request("https://gdata.youtube.com/feeds/api/videos/" + match[1] + "?v=2&alt=json", function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var data = JSON.parse(body).entry;
						bot.say(nick, "\x1Fhttp://youtu.be/" + match[1] + "\x1F : \x02" + data.title["$t"] + "\x02 by " + data.author[0].name["$t"] + ", " + data["yt$statistics"].viewCount.toString() + " views, " + data["yt$rating"].numLikes.toString() + " likes, " + data["yt$rating"].numDislikes.toString() + " dislikes");
					}
				});
			}
		},
	}
}

module.exports = YoutubePlugin;
