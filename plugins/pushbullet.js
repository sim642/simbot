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

	self.events = {
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
