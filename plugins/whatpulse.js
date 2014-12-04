var request = require("request");

function WhatpulsePlugin(bot) {
	var self = this;
	self.name = "whatpulse";
	self.help = "Whatpulse plugin";
	self.depend = ["cmd", "nickserv"];

	self.users = {};

	self.load = function(data) {
		if (data && data.users)
			self.users = data.users;
	};

	self.save = function() {
		return {
			"users": self.users
		};
	};

	self.parseuser = function(user) {
		if (user in self.users)
			return self.users[user];
		else
			return user;
	};

	self.events = {
		"cmd#whatpulse": function(nick, to, args) {
			var user = self.parseuser((args[1] || nick).toLowerCase());
			request("http://api.whatpulse.org/user.php?format=json&user=" + user, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body);
					bot.say(to, data.AccountName + ": " + data.Keys);
				}
			});
		},

		"cmd#setwhatpulse": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (args[1] !== undefined) {
						self.users[nick.toLowerCase()] = args[1];
						bot.notice(nick, "whatpulse set to " + args[1]);
					}
					else {
						delete self.users[nick.toLowerCase()];
						bot.notice(nick, "whatpulse unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set whatpulse");
			});
		}
	}
}

module.exports = WhatpulsePlugin;
