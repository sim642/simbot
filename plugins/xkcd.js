var request = require("request");

function XkcdPlugin(bot) {
	var self = this;
	self.name = "xkcd";
	self.help = "Xkcd plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#xkcd": function(nick, to, args) {
			if (!args[1] || /^\d+$/.test(args[1])) {
				var uri = "http://xkcd.com/";
				if (args[1])
					uri += args[1] + "/";
				request(uri, function(err, res, body) {
					var re = /<div id="ctitle">(.+)<\/div>/;
					var m = body.match(re);
					if (m)
						bot.say(to, "xkcd: " + m[1] + " - " + uri);
				});
			}
			else {
				request({
						uri: "https://www.googleapis.com/customsearch/v1",
						qs: {
							key: "AIzaSyCrnaYtsUBVjQrMJiuOXRwOgQDhcULePFQ",
							cx: "012652707207066138651:zudjtuwe28q",
							q: args[0]
						}
					}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var json = JSON.parse(body);
						if (json.items.length != 0) {
							var first = json.items[0];
							bot.say(to, first.title + " - " + first.link);
						}
						else
							bot.say(to, nick + ": couldn't find xkcd");
					}
				});
			}
		}
	}
}

module.exports = XkcdPlugin;
