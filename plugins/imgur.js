var request = require("request");

function ImgurPlugin(bot) {
	var self = this;
	self.name = "imgur";
	self.help = "Imgur subreddit galleries plugin";
	self.depend = ["cmd"];

	self.r = request.defaults({headers: {"User-Agent": "simbot imgur 2.0", "Authorization": "Client-ID e3dcbdb38ffa207"}});

	self.update = function() {
	};

	self.events = {
		"cmd#gallery": function(nick, to, args) {
			self.r("https://api.imgur.com/3/gallery/r/" + args[1] + "/", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body).data;
					var i = Math.floor(Math.random() * data.length);
					var image = data[i];
					bot.say(to, "[r/" + image.section + "] " + (image.title ? "\x02" + image.title + "\x02: " : "") + image.link + " " + (image.nsfw ? "[\x02NSFW\x02]" : ""));
				}
			});
		}
	}
}

module.exports = ImgurPlugin;
