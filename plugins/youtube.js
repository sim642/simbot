var request = require("request");

function YoutubePlugin(bot) {
	var self = this;
	self.name = "youtube";
	self.help = "Youtube plugin";
	self.depend = [];
	
	self.vidre = new RegExp('(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})', "i");

	self.channels = [];

	self.load = function(data) {
		self.channels = data.channels;
	};

	self.unload = function() {
		return {channels: self.channels};
	};

	self.events = {
		"message": function(nick, to, text, message) {
			if (self.channels.indexOf(to) != -1) {
				var match = text.match(self.vidre);
				if (match) {
					request("https://gdata.youtube.com/feeds/api/videos/" + match[1] + "?v=2&alt=json", function(err, res, body) {
						if (!err && res.statusCode == 200) {
							var data = JSON.parse(body).entry;
							bot.say(to, "http://youtu.be/" + match[1] + " : \x02" + data.title["$t"] + "\x02 by " + data.author[0].name["$t"] + ", " + data["yt$statistics"].viewCount.toString() + " views, " + data["yt$rating"].numLikes.toString() + " likes, " + data["yt$rating"].numDislikes.toString() + " dislikes");
						}
					});
				}
			}
		},
	}
}

module.exports = YoutubePlugin;
