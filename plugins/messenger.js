var request = require("request");

function MessengerPlugin(bot) {
	var self = this;
	self.name = "messenger";
	self.help = "Messenger bot plugin";
	self.depend = ["cmd", "nickserv", "util"];

	self.verifyToken = null;
	self.pageAccessToken = null;

	self.ids = {};
	self.idVerifys = {};

	self.load = function(data) {
		if (data) {
			self.verifyToken = data.verifyToken;
			self.pageAccessToken = data.pageAccessToken;
			self.ids = data.ids;
			self.idVerifys = data.idVerifys;
		}
	};

	self.save = function() {
		return {
			verifyToken: self.verifyToken,
			pageAccessToken: self.pageAccessToken,
			ids: self.ids,
			idVerifys: self.idVerifys,
		};
	};

	self.send = function(data) {
		request.post({
			uri: "https://graph.facebook.com/v2.6/me/messages",
			qs: {
				access_token: self.pageAccessToken
			},
			json: data
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) {

			}
			else {
				bot.out.error("messenger", "failed to send", err, body);
			}
		});
	};

	self.parseTo = function(to) {
		if (to in self.ids)
			return self.ids[to];
		else
			return to;
	};

	self.sendTextMessage = function(recipientId, text) {
		self.send({
			recipient: {
				id: self.parseTo(recipientId)
			},
			message: {
				text: text
			}
		});
	};

	self.generateIdVerify = function() {
		var idVerify = null;

		do {
			idVerify = Math.floor(Math.random() * 100000).toString();
		}
		while (idVerify in self.idVerifys);

		return idVerify;
	};

	self.events = {
		"cmd#setmessenger": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (!(nick.toLowerCase() in self.ids)) {
						var existing = bot.plugins.util.getKeyByValue(self.idVerifys, nick.toLowerCase());
						if (existing !== null) {
							delete self.idVerifys[existing];
						}

						var idVerify = self.generateIdVerify();
						self.idVerifys[idVerify] = nick.toLowerCase();
						bot.notice(nick, "message Simbot on messenger: " + idVerify);
					}
					else {
						delete self.ids[nick.toLowerCase()];
						bot.notice(nick, "messenger unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set messenger");
			});
		},
		"messenger#event": function(event) {
			bot.out.debug("messenger", event);

			if (event.message)
				bot.emit("messenger#message", event, event.message);
		},

		"messenger#message": function(event, message) {
			if (message.text) {
				if (message.text in self.idVerifys) {
					self.ids[self.idVerifys[message.text]] = event.sender.id;
					delete self.idVerifys[message.text];
					self.sendTextMessage(event.sender.id, "Verified!");
				}
				else {
					self.sendTextMessage(event.sender.id, message.text);
				}
			}
			else if (message.attachments) {

			}
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
