var request = require("request");

function WhatpulsePlugin(bot) {
	var self = this;
	self.name = "whatpulse";
	self.help = "Whatpulse plugin";
	self.depend = ["cmd", "nickserv"];

	self.users = {};
	self.defaultTeam = null;

	self.load = function(data) {
		if (data && data.users)
			self.users = data.users;
		if (data && data.defaultTeam)
			self.defaultTeam  = data.defaultTeam;
	};

	self.save = function() {
		return {
			"users": self.users,
			"defaultTeam": self.defaultTeam
		};
	};

	self.parseuser = function(user) {
		if (user in self.users)
			return self.users[user];
		else
			return user;
	};

	self.formatPair = function(key, value) {
		return key + ": \x02" + value + "\x02";
	};

	self.events = {
		"cmd#wp": function(nick, to, args, message) {
			bot.emit("cmd#whatpulse", nick, to, args, message);
		},

		"cmd#whatpulse": function(nick, to, args) {
			var realuser = args[1] || nick;
			var user = self.parseuser(realuser.toLowerCase());
			request("http://api.whatpulse.org/user.php?format=json&formatted=yes&user=" + user, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);

					if (!j.error) {
						var bits = [];
						if (j.Team !== "0")
							bits.push(["team", j.Team.Name]);
						bits.push(["pulses", j.Pulses]);
						bits.push(["keys", j.Keys + " (" + j.Ranks.Keys + ")"]);
						bits.push(["clicks", j.Clicks + " (" + j.Ranks.Clicks + ")"]);
						bits.push(["download", j.Download + " (" + j.Ranks.Download + ")"]);
						bits.push(["upload", j.Upload + " (" + j.Ranks.Upload + ")"]);
						bits.push(["uptime", j.UptimeShort + " (" + j.Ranks.Uptime + ")"]);

						var str = "\x02" + j.AccountName + (realuser.toLowerCase() != j.AccountName.toLowerCase() ? " (" + realuser + ")" : "") + ": \x02";
						for (var i = 0; i < bits.length; i++) {
							str += self.formatPair(bits[i][0], bits[i][1]);
							if (i != bits.length - 1)
								str += "; ";
						}

						bot.say(to, str);
					}
					else {
						bot.say(to, nick + ": " + j.error);
					}
				}
			});
		},

		"cmd#wpteam": function(nick, to, args, message) {
			bot.emit("cmd#whatpulseteam", nick, to, args, message);
		},

		"cmd#whatpulseteam": function(nick, to, args) {
			var team = args[1] || self.defaultTeam;
			if (team) {
				request("http://api.whatpulse.org/team.php?format=json&formatted=yes&team=" + team, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (!j.error) {
							var bits = [];
							bits.push(["founder", j.Founder]);
							bits.push(["keys", j.Keys + " (" + j.Ranks.Keys + ")"]);
							bits.push(["clicks", j.Clicks + " (" + j.Ranks.Clicks + ")"]);
							bits.push(["download", j.Download + " (" + j.Ranks.Download + ")"]);
							bits.push(["upload", j.Upload + " (" + j.Ranks.Upload + ")"]);
							bits.push(["uptime", j.UptimeShort + " (" + j.Ranks.Uptime + ")"]);

							var str = "\x02" + j.Name + ": \x02";
							for (var i = 0; i < bits.length; i++) {
								str += self.formatPair(bits[i][0], bits[i][1]);
								if (i != bits.length - 1)
									str += "; ";
							}

							bot.say(to, str);
						}
						else {
							bot.say(to, nick + ": " + j.error);
						}
					}
				});
			}
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
