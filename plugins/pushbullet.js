var request = require("request");
var WebSocket = require("ws");

function PushbulletPlugin(bot) {
	var self = this;
	self.name = "pushbullet";
	self.help = "Pushbullet plugin";
	self.depend = ["cmd", "auth", "nickserv"];

	self.token = null;
	self.emails = {};
	self.ws = null;
	self.lastTs = Date.now() / 1000;

	self.setToken = function(token) {
		self.token = token;
		self.ws = new WebSocket("wss://stream.pushbullet.com/websocket/" + self.token);
		self.ws.on("message", function(message) {
			var data = JSON.parse(message);
			if (data.type == "tickle" && data.subtype == "push") {
				self.getPushes(self.lastTs, function(pushes) {
					if (pushes[0])
						self.lastTs = pushes[0].modified;

					pushes.forEach(function(push) {
						if (push.receiver_email == "sim642bot@gmail.com")
							bot.emit("pushbullet#push", push);
						else if (push.channel_iden)
							bot.emit("pushbullet#subscription", push);
					});
				});
			}
		});
	}

	self.load = function(data) {
		self.setToken(data.token);
		if (data.emails)
			self.emails = data.emails;
	};

	self.save = function() {
		return {
			"token": self.token,
			"emails": self.emails
		};
	};

	self.disable = function() {
		self.ws.close();
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
				bot.out.error("pushbullet", err);
				bot.out.error("pushbullet", body);
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
				bot.out.error("pushbullet", params);
				bot.out.error("pushbullet", err);
				bot.out.error("pushbullet", body);
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
			if (!err && res.statusCode == 200) {
				(callback || function(){})(body);
			}
			else {
				bot.out.error("pushbullet", err);
				bot.out.error("pushbullet", body);
				(callback || function(){})(body);
			}

		});
	};

	self.events = {
		"pushbullet#push": function(push) {
			bot.out.log("pushbullet", "Push from " + push.sender_email + ": " + push.title);
			bot.emit("pushbullet#push#" + push.sender_email, push);
		},

		"pushbullet#subscription": function(push) {
			bot.out.log("pushbullet", "Subscription from " + push.sender_name + ": " + push.title);
			bot.emit("pushbullet#subscription#" + push.sender_name, push);
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
