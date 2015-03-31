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

	self.datas = {};

	self.events = {
		"cmd#gallery": function(nick, to, args) {
			var sub = args[1];
			var sort = args[2] || "time";
			var time = args[3] || "week";

			self.request({url: "https://api.imgur.com/3/gallery/r/" + sub + "/" + sort + "/" + time + "/", headers: (sub in self.datas ? {"If-None-Match": self.datas[sub].etag} : {})}, function(err, res, body) {
				if (!err) {
					var data;
					if (res.statusCode == 200) {
						data = JSON.parse(body);
						self.datas[sub] = data;
						self.datas[sub].etag = res.headers["etag"];
					}
					else if (res.statusCode == 304) {
						data = self.datas[sub];
					}

					data = data.data;

					var i = Math.floor(Math.random() * data.length);
					var image = data[i];
					if (image !== undefined)
						bot.say(to, "[r/" + image.section + "] " + (image.title ? "\x02" + image.title + "\x02: " : "") + image.link + " " + (image.nsfw ? "[\x02NSFW\x02]" : ""));
				}
			});
		}
	};
}

module.exports = ImgurPlugin;
