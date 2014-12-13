var request = require("request");

function XkcdPlugin(bot) {
	var self = this;
	self.name = "xkcd";
	self.help = "Xkcd plugin";
	self.depend = ["cmd"];

	self.apiKey = null;

	self.load = function(data) {
		if (data)
			self.apiKey = data.apiKey;
	};

	self.save = function() {
		return {"apiKey": self.apiKey};
	}

	self.events = {
		"cmd#xkcd": function(nick, to, args) {
			if (!args[1] || /^\d+$/.test(args[1])) {
				var uri = "http://xkcd.com/";
				if (args[1])
					uri += args[1] + "/";
				request(uri, function(err, res, body) {
					var re = /<div id="ctitle">(.+)<\/div>[\s\S]*Permanent link to this comic: (http:\/\/xkcd\.com\/\d+\/)/;
					var m = body.match(re);
					if (m)
						bot.say(to, "xkcd" + (args[1] ? " #" + args[1] : "") + ": \x02" + m[1] + "\x02 - " + m[2]);
				});
			}
			else {
				var match = args[0].match(/^(.*)\s+(\d+)\s*$/);
				var str;
				var i;
				if (match) {
					str = match[1];
					i = parseInt(match[2]);
				}
				else {
					str = args[0];
					i = 1;
				}
				str = str.trim();

				request({
						uri: "https://www.googleapis.com/customsearch/v1",
						qs: {
							key: self.apiKey,
							cx: "012652707207066138651:zudjtuwe28q",
							q: str
						}
					}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var json = JSON.parse(body);
						if (json.items !== undefined && json.items.length != 0) {
							if (i - 1 >= 0 && i - 1 < json.items.length) {
								var item = json.items[i - 1];
								var title = item.title.match(/^xkcd:\s+(.*)$/)[1].trim();
								bot.say(to, "xkcd '" + str + "' [" + i + "/" + json.items.length + "]: \x02" + title + "\x02 - " + item.link);
							}
							else
								bot.say(to, nick + ": '" + str + "' [" + i + "/" + json.items.length + "] invalid result index");
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
