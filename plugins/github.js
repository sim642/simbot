var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");

function GithubPlugin(bot) {
	var self = this;
	self.name = "github";
	self.help = "Github stats plugin";
	self.depend = ["cmd"];

	self.formatPair = function(key, value) {
		if (value !== undefined)
			return key + ": \x02" + value + "\x02";
		else
			return "\x02" + key + "\x02";
	};

	self.events = {
		"cmd#github": function(nick, to, args) {
			var user = args[1] || nick;
			request("https://github.com/users/" + encodeURIComponent(user) + "/contributions", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var doc = new dom().parseFromString(body);
					var nodes = xpath.select("//rect[@class='day']", doc);
					var contribs = [];
					for (var i = 0; i < nodes.length; i++) {
						var date = nodes[i].getAttribute("data-date");
						var count = nodes[i].getAttribute("data-count");
						contribs.push([date, parseInt(count), 0]);
					}
					// TODO: guarantee contribs sorted by date

					var bits = [];

					var longstreak = 0;
					var total = contribs[0][1];
					for (var i = 1; i < contribs.length; i++) {
						total += contribs[i][1];

						if (contribs[i][1] > 0) {
							if (contribs[i - 1][1] > 0)
								contribs[i][2] = contribs[i - 1][2] + 1;
							else
								contribs[i][2] = 1;
						}

						longstreak = Math.max(longstreak, contribs[i][2]);
					}
					var curstreak = Math.max(contribs[contribs.length - 2][2], contribs[contribs.length - 1][2]);

					bits.push(["commits", total]);
					bits.push(["longest streak", longstreak + " days"]);
					bits.push(["current streak", curstreak + " days"]);

					var str = "\x02" + user + "'s last year's github: \x02";
					for (var i = 0; i < bits.length; i++) {
						str += self.formatPair(bits[i][0], bits[i][1]);
						if (i != bits.length - 1)
							str += ", ";
					}

					bot.say(to, str);
				}
			});
		}
	}
}

module.exports = GithubPlugin;
