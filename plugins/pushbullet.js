var request = require("request");

function PushbulletPlugin(bot) {
	var self = this;
	self.name = "pushbullet";
	self.help = "Pushbullet plugin";
	self.depend = ["cmd", "auth", "nickserv"];

	self.token = null;
	self.emails = {};

	self.load = function(data) {
		self.token = data.token;
		if (data.emails)
			self.emails = data.emails;
	};

	self.save = function() {
		return {
			"token": self.token,
			"emails": self.emails
		};
	};

	self.parseto = function(to) {
		if (to in self.emails)
			return self.emails[to];
		else
			return to;
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
				(callback || function(){})(true);
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

	self.events = {
		"cmd#pushbullet": bot.plugins.auth.proxy(6, function(nick, to, args) {
			self.pushnote(args[1], args[2], args[3], function(err) {
				if (err)
					bot.say(nick, "error sending pushbullet");
				else
					bot.say(nick, "pushbullet sent to " + args[1]);
			});
		}),

		"cmd#setpushbullet": function(nick, to, args) {
			bot.plugins.nickserv.identified(nick, function(identified) {
				if (identified) {
					if (args[1] !== undefined) {
						self.emails[nick] = args[1];
						bot.say(nick, "pushbullet set to " + args[1]);
					}
					else {
						delete self.emails[nick];
						bot.say(nick, "pushbullet unset");
					}
				}
				else
					bot.say(nick, "must be identified for this nick to set pushbullet");
			});
		}
	}
}

module.exports = PushbulletPlugin;
