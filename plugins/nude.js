var nude = require("nude");
var request = require("request");
var fs = require("fs");
var tmp = require("tmp");

function NudePlugin(bot) {
	var self = this;
	self.name = "nude";
	self.help = "Nudity detection plugin";
	self.depend = ["cmd", "auth"];

	self.isnude = function(url, callback) {
		tmp.file(function (err, path, fd, cleanupCb) {
			var stream = fs.createWriteStream(path);
			request(url).pipe(stream).on("close", function() {
				nude.scan(path, function(res) {
					callback(res);
					cleanupCb();
				});
			});
		});
	};

	self.events = {
		"cmd#isnude": bot.plugins.auth.proxy(6, function(nick, to, args) {
			self.isnude(args[1], function(nude) {
				bot.say(to, args[1] + ": \x02" + (nude ? "" : "not ") + "nude");
			});
		}),

		"message#": function(nick, to, text) {
			var re = /http:\/\/xe\.tetrap\.us\/([\w_+=~]+)\.jpg/;
			var m = text.match(re);
			if (m) {
				self.isnude(m[0], function(nude) {
					if (nude)
						bot.say(to, m[0] + " \x02IS NUDE");
				});
			}
		}
	}
}

module.exports = NudePlugin;
