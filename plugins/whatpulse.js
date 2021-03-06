var request = require("request");

function WhatpulsePlugin(bot) {
	var self = this;
	self.name = "whatpulse";
	self.help = "Whatpulse plugin";
	self.depend = ["cmd", "bits", "nickserv", "util"];

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

	self.events = {
		"cmd#wp": bot.forward("cmd#whatpulse"),

		"cmd#whatpulse": function(nick, to, args) {
			var realuser = args[1] || nick;
			var user = self.parseuser(realuser.toLowerCase());
			request("http://api.whatpulse.org/user.php?format=json&formatted=yes&user=" + user, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);

					if (!j.error) {
						var prefix = j.AccountName + (realuser.toLowerCase() != j.AccountName.toLowerCase() ? " (" + realuser + ")" : "");
						var bits = [];

						if (j.Team !== "0")
							bits.push(["team", j.Team.Name]);
						bits.push(["pulses", j.Pulses]);
						bits.push(["keys", j.Keys + " (" + j.Ranks.Keys + ")"]);
						bits.push(["clicks", j.Clicks + " (" + j.Ranks.Clicks + ")"]);
						bits.push(["download", j.Download + " (" + j.Ranks.Download + ")"]);
						bits.push(["upload", j.Upload + " (" + j.Ranks.Upload + ")"]);
						bits.push(["uptime", j.UptimeShort + " (" + j.Ranks.Uptime + ")"]);

						bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
					}
					else {
						bot.say(to, nick + ": " + j.error);
					}
				}
			});
		},

		"cmd#whatpulses": function(nick, to, args) {
			var realuser = args[1] || nick;
			var user = self.parseuser(realuser.toLowerCase());
			var cnt = Math.min(Math.max(args[2] || 3, 1), 5);

			request("http://api.whatpulse.org/pulses.php?format=json&formatted=yes&user=" + user, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);

					if (!j.error) {
						var pulses = Object.keys(j).map(function(key) {
							return j[key];
						}).sort(function(lhs, rhs) {
							return parseInt(rhs.Timestamp) - parseInt(lhs.Timestamp);
						});

						for (var i = 0; i < cnt; i++) {
							var p = pulses[i];

							var prefix = p.Username + (realuser.toLowerCase() != p.Username.toLowerCase() ? " (" + realuser + ")" : "") + "/" + p.Computer + " @ " + p.Timedate;
							var bits = [];

							bits.push(["OS", p.OS]);
							bits.push(["keys", p.Keys]);
							bits.push(["clicks", p.Clicks]);
							bits.push(["download", p.Download]);
							bits.push(["upload", p.Upload]);
							bits.push(["uptime", p.UptimeShort]);

							var str = bot.plugins.bits.format(prefix, bits, ";");
							bot.notice(nick, str);

							if (i == 0)
								bot.say(to, str);
						}
					}
					else {
						bot.say(to, nick + ": " + j.error);
					}
				}
			});
		},

		"cmd#wpteam": bot.forward("cmd#whatpulseteam"),

		"cmd#whatpulseteam": function(nick, to, args) {
			var team = args[1] || self.defaultTeam;
			if (team) {
				request("http://api.whatpulse.org/team.php?format=json&formatted=yes&team=" + team, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (!j.error) {
							var prefix = j.Name;
							var bits = [];

							bits.push(["founder", j.Founder]);
							bits.push(["keys", j.Keys + " (" + j.Ranks.Keys + ")"]);
							bits.push(["clicks", j.Clicks + " (" + j.Ranks.Clicks + ")"]);
							bits.push(["download", j.Download + " (" + j.Ranks.Download + ")"]);
							bits.push(["upload", j.Upload + " (" + j.Ranks.Upload + ")"]);
							bits.push(["uptime", j.UptimeShort + " (" + j.Ranks.Uptime + ")"]);

							bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
						}
						else {
							bot.say(to, nick + ": " + j.error);
						}
					}
				});
			}
		},

		"cmd#whatpulsesteam": function(nick, to, args) {
			var team = args[1] || self.defaultTeam;
			var cnt = Math.min(Math.max(args[2] || 3, 1), 5);

			if (team) {
				request("http://api.whatpulse.org/pulses.php?format=json&formatted=yes&team=" + team, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);

						if (!j.error) {
							var pulses = Object.keys(j).map(function(key) {
								return j[key];
							}).sort(function(lhs, rhs) {
								return parseInt(rhs.Timestamp) - parseInt(lhs.Timestamp);
							});

							for (var i = 0; i < cnt; i++) {
								var p = pulses[i];

								var realuser = bot.plugins.util.getKeyByValue(self.users, p.Username.toLowerCase());
								var prefix = p.Username + (realuser !== null ? " (" + realuser + ")" : "") + "/" + p.Computer + " @ " + p.Timedate;
								var bits = [];

								bits.push(["OS", p.OS]);
								bits.push(["keys", p.Keys]);
								bits.push(["clicks", p.Clicks]);
								bits.push(["download", p.Download]);
								bits.push(["upload", p.Upload]);
								bits.push(["uptime", p.UptimeShort]);

								var str = bot.plugins.bits.format(prefix, bits, ";");
								bot.notice(nick, str);

								if (i == 0)
									bot.say(to, str);
							}
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
	};
}

module.exports = WhatpulsePlugin;
