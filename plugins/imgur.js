var request = require("request");

function ImgurPlugin(bot) {
	var self = this;
	self.name = "imgur";
	self.help = "Imgur subreddit galleries plugin";
	self.depend = ["cmd"];

	self.clientID = null;
	self.request = null;

	self.setClientID = function(clientID) {
		self.clientID = clientID;
		self.request = request.defaults({headers: {"User-Agent": "simbot imgur 2.0", "Authorization": "Client-ID " + clientID}});
	};

	self.load = function(data) {
		if (data)
			self.setClientID(data.clientID);
	};

	self.save = function() {
		return {clientID: self.clientID};
	};

	self.events = {
		"cmd#gallery": function(nick, to, args) {
			self.request("https://api.imgur.com/3/gallery/r/" + args[1] + "/", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body).data;
					var i = Math.floor(Math.random() * data.length);
					var image = data[i];
					if (image !== undefined)
						bot.say(to, "[r/" + image.section + "] " + (image.title ? "\x02" + image.title + "\x02: " : "") + image.link + " " + (image.nsfw ? "[\x02NSFW\x02]" : ""));
				}
			});
		}
	}
}

module.exports = ImgurPlugin;
