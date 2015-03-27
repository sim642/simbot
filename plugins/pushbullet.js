var request = require("request");
var WebSocket = require("ws");

function PushbulletPlugin(bot) {
	var self = this;
	self.name = "pushbullet";
	self.help = "Pushbullet plugin";
	self.depend = ["cmd", "auth", "nickserv", "bitly", "date"];

	self.email = null;
	self.token = null;
	self.emails = {};
	self.ws = null;
	self.wsTimeout = null;
	self.lastTs = null;

	// https://stackoverflow.com/questions/9907419/javascript-object-get-key-by-value
	self.getKeyByValue = function(obj, value) {
		for (var prop in obj) {
			if(obj.hasOwnProperty(prop)) {
				 if(obj[prop] === value)
					 return prop;
			}
		}
		return null;
	};

	self.setToken = function(token) {
		if (self.ws)
			self.ws.close();

		bot.out.doing("pushbullet", "WS connecting...");
		self.token = token;
		self.ws = new WebSocket("wss://stream.pushbullet.com/websocket/" + self.token);
		self.ws.on("open", function() {
			bot.out.ok("pushbullet", "WS connected");
		});
		self.ws.on("error", function(code, message) {
			bot.out.error("pushbullet", "WS errored (" + code + "): " + message);

			if (self.wsTimeout) {
				clearTimeout(self.wsTimeout);
				self.wsTimeout = null;
			}

			setTimeout(function() { self.setToken(token); }, 30 * 1000);
		});
		self.ws.on("close", function(code, message) {
			bot.out.error("pushbullet", "WS closed (" + code + "): " + message);

			if (self.wsTimeout) {
				clearTimeout(self.wsTimeout);
				self.wsTimeout = null;
			}

			if (code != 1000)
				setTimeout(function() { self.setToken(token); }, 30 * 1000);
		});
		self.ws.on("message", function(message) {
			var data = JSON.parse(message);
			if (data.type == "nop") {
				if (self.wsTimeout) {
					clearTimeout(self.wsTimeout);
					self.wsTimeout = null;
				}

				self.wsTimeout = setTimeout(function() {
					bot.out.warn("pushbullet", "WS missed nop");
					self.setToken(self.token); // reconnect stream
				}, 60 * 1000);
			}
			else if (data.type == "tickle" && data.subtype == "push") {
				self.getPushes(self.lastTs, function(pushes) {
					if (pushes[0])
						self.lastTs = pushes[0].modified;


					pushes.forEach(function(push) {
						if (push.receiver_email == self.email)
							bot.emit("pushbullet#push", push, true);
						else if (push.channel_iden)
							bot.emit("pushbullet#subscription", push, true);
					});
				});
			}
		});
	}

	self.load = function(data) {
		self.email = data.email;
		self.setToken(data.token);
		if (data.emails)
			self.emails = data.emails;
		if (data.lastTs)
			self.lastTs = data.lastTs;
	};

	self.save = function() {
		return {
			"email": self.email,
			"token": self.token,
			"emails": self.emails,
			"lastTs": self.lastTs
		};
	};

	self.enable = function() {
		if (self.lastTs === null)
			self.lastTs = Date.now() / 1000;

		self.getPushes(self.lastTs, function(pushes) {
			if (pushes[0])
				self.lastTs = pushes[0].modified;

			pushes.forEach(function(push) {
				if (push.receiver_email == self.email)
					bot.emit("pushbullet#push", push, false);
				else if (push.channel_iden)
					bot.emit("pushbullet#subscription", push, false);
			});
		});
	};

	self.disable = function() {
		self.ws.close(1000, "disabling plugin");
	};

	self.parseto = function(to) {
		if (to in self.emails)
			return self.emails[to];
		else
			return to;
	};

	self.getPushes = function(lastTs, callback) {
		request({
			url: "https://api.pushbullet.com/v2/pushes",
			auth: {
				user: self.token
			},
			json: true,
			qs: {
				"modified_after": lastTs
			}
		}, function (err, res, body) {
			if (!err && res.statusCode == 200) {
				(callback || function(){})(body.pushes);
			}
			else {
				bot.out.error("pushbullet", err, body);
				(callback || function(){})(undefined);
			}
		});
	};

	self.push = function(params, callback) {
		request.post({
			url: "https://api.pushbullet.com/v2/pushes",
			auth: {
				user: self.token
			},
			json: true,
			body: params
		}, function (err, res, body) {
			if (!err && res.statusCode == 200) {
				(callback || function(){})(false);
			}
			else {
				bot.out.error("pushbullet", params, err, body);
				setTimeout(function(){ self.push(params, callback); }, 30 * 1000); // retry pushing again in 30 seconds
			}
		});
	};

	self.pushnote = function(to, title, body, callback) {
		self.push({
			"email": self.parseto(to),
			"type": "note",
			"title": title,
			"body": body
		}, callback);
	};

	self.subscribe = function(channel, callback) {
		request.post({
			url: "https://api.pushbullet.com/v2/subscriptions",
			auth: {
				user: self.token
			},
			json: true,
			body: {
				"channel_tag": channel
			}
		}, function(err, res, body) {
			if (!err && (res.statusCode == 200 || (body.error !== undefined && (body.error.type == "invalid_request" || body.error.type == "") && body.error.param == "channel_tag" && body.error.message == "Already subscribed to this channel."))) {
				(callback || function(){})(true, body);
			}
			else {
				bot.out.error("pushbullet", err, body);
				(callback || function(){})(false, body);
			}

		});
	};

	self.events = {
		"pushbullet#push": function(push, live) {
			bot.out.log("pushbullet", push.type + " push" + (live ? "" : "(" + bot.plugins.date.printDateTime(new Date(push.modified * 1000)) + ")") + " from " + push.sender_email + ": " + push.title);
			bot.emit("pushbullet#push#" + push.sender_email, push, live);

			if (push.title && (push.title in bot.chans)) {
				var sender = self.getKeyByValue(self.emails, push.sender_email);
				if (!sender)
					sender = push.sender_email;
				var msg = "push" + (live ? "" : "ed (" + bot.plugins.date.printDateTime(new Date(push.modified * 1000)) + ")") + " [\x02" + sender + "\x02] ";

				var text = push.body !== undefined ? push.body.replace(/\n/g, " \\ ") : "";

				switch (push.type) {
				case "note":
					msg += text;
					break;
				case "link":
					msg += (text != "" ? text + " - " : "");
					break;
				case "file":
					msg += (text != "" ? text + " - " : "") + "\x02" + push.file_name + "\x02 (" + push.file_type + "): ";
					break;
				default:
					break;
				}

				if (push.type == "link") {
					if (push.url.length > 50) {
						bot.plugins.bitly.shorten(push.url, function(shortened) {
							msg += shortened;
							bot.say(push.title, msg);
						});
					}
					else {
						msg += push.url;
						bot.say(push.title, msg);
					}
				}
				else if (push.type == "file") {
					bot.plugins.bitly.shorten(push.file_url, function(shortened) {
						msg += shortened;
						bot.say(push.title, msg);
					});
				}
				else {
					bot.say(push.title, msg);
				}
			}
		},

		"pushbullet#subscription": function(push, live) {
			bot.out.log("pushbullet", push.type + " subscription" + (live ? "" : " (" + bot.plugins.date.printDateTime(new Date(push.modified * 1000)) + ")") + " from " + push.sender_name + ": " + push.title);
			bot.emit("pushbullet#subscription#" + push.sender_name, push, live);
		},

		"cmd#pushbullet": bot.plugins.auth.proxy(6, function(nick, to, args) {
			self.pushnote(args[1], args[2], args[3], function(err) {
				if (err)
					bot.notice(nick, "error sending pushbullet");
				else
					bot.notice(nick, "pushbullet sent to " + args[1]);
			});
		}),

		"cmd#setpushbullet": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (args[1] !== undefined) {
						self.emails[nick.toLowerCase()] = args[1];
						bot.notice(nick, "pushbullet set to " + args[1]);
					}
					else {
						delete self.emails[nick.toLowerCase()];
						bot.notice(nick, "pushbullet unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set pushbullet");
			});
		}
	}
}

module.exports = PushbulletPlugin;
