var request = require("request");

function BitlyPlugin(bot) {
	var self = this;
	self.name = "bitly";
	self.help = "bit.ly plugin";
	self.depend = ["cmd", "auth"];

	self.username = null;
	self.apikey = null;

	self.load = function(data) {
		self.username = data.username;
		self.apikey = data.apikey;
	};

	self.shorten = function(longurl, callback) {
		request({
			url: "http://api.bitly.com/v3/shorten",
			qs: {
				"login": self.username,
				"apiKey": self.apikey,
				"longUrl": longurl
			}
		}, function (err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);
				(callback || function(){})(j.data.url);
			}
		});
	};

	self.events = {
		"cmd#bitly": bot.plugins.auth.proxyEvent(7, function(nick, to, args) {
			self.shorten(args[1], function(shorturl) {
				bot.say(to, args[1] + " -> " + shorturl);
			});
		})
	};
}

module.exports = BitlyPlugin;
