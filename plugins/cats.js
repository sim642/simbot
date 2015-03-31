var request = require("request");

function CatsPlugin(bot) {
	var self = this;
	self.name = "cats";
	self.help = "Cats plugin";
	self.depend = ["cmd"];

	self.json = null;
	self.update = function() {
		request({uri: "http://www.reddit.com/user/sim642/m/cats.json?limit=100", headers: {"User-Agent": "simbot cats 0.1"}}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				self.json = JSON.parse(body);
			}
		});
	};
	self.interval = null;

	self.enable = function() {
		self.update();
		self.interval = setInterval(self.update, 5 * 60 * 1000);
	};

	self.disable = function() {
		clearInterval(self.interval);
	};

	self.events = {
		"cmd#cat": function(nick, to, args) {
			var children = self.json.data.children;
			for (var j = 0; j < Math.min(Math.max(args[1], 1) || 1, 10); j++) {
				var i = Math.floor(Math.random() * children.length);
				var item = children[i].data;
				bot.say(to, "[r/" + item.subreddit + "] \x02" + item.title + "\x02: " + item.url);
			}
		}
	};
}

module.exports = CatsPlugin;
