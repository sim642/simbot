var request = require("request");

function MessengerPlugin(bot) {
	var self = this;
	self.name = "messenger";
	self.help = "Messenger bot plugin";
	self.depend = [];

	self.verifyToken = null;
	self.pageAccessToken = null;

	self.load = function(data) {
		if (data) {
			self.verifyToken = data.verifyToken;
			self.pageAccessToken = data.pageAccessToken;
		}
	};

	self.save = function() {
		return {
			verifyToken: self.verifyToken,
			pageAccessToken: self.pageAccessToken,
		};
	};

	self.events = {
		"messenger#event": function(event) {
			bot.out.debug("messenger", event);
		},

		"webs#/messenger": function(req, qs, body, res) {
			if (qs["hub.mode"] == "subscribe") {
				if (qs["hub.verify_token"] === self.verifyToken) {
					bot.out.ok("messenger", "verified token");
					res.end(qs["hub.challenge"]);
				}
				else {
					bot.out.error("messenger", "failed to verify token");
					res.statusCode = 403;
					res.end();
				}
			}
			else {
				var data = JSON.parse(body);
				if (data.object == "page") {
					data.entry.forEach(function(entry) {
						entry.messaging.forEach(function(event) {
							bot.emit("messenger#event", event);
						});
					});
					res.end();
				}
				else {
					res.statusCode = 404;
					res.end();
				}
			}
		}
	};
}

module.exports = MessengerPlugin;
