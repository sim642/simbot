function StalkerPlugin(bot) {
	var self = this;
	self.name = "stalker";
	self.help = "Stalker plugin";
	self.depend = ["cmd", "auth", "info"];
	
	self.db = {};
	self.autoid = 1;
	/*
		{
			id:
			nick:
			user:
			host:
			pid:
			added:
			seen:
		}
	*/
	self.ignores = [];

	self.load = function(data) {
		if (data) {
			self.db = data.db;
			self.autoid = data.autoid;
			self.ignores = data.ignores;
			for (var id in self.db) {
				var row = self.db[id];
				row.added = new Date(row.added);
				row.seen = new Date(row.seen);
			}
		}
	};

	self.save = function() {
		return {
			"db": self.db,
			"autoid": self.autoid,
			"ignores": self.ignores
		};
	};

	self.seen = function(nick, user, host) {
		var found = null;
		for (var id in self.db) {
			var row = self.db[id];
			if (row.nick.toLowerCase() == nick.toLowerCase() && row.user.toLowerCase() == user.toLowerCase() && row.host.toLowerCase() == host.toLowerCase()) {
				found = id;
				break;
			}
		}

		if (found !== null) {
			self.db[found].seen = new Date();
		}
		else {
			var newrow = {
				"id": self.autoid++,
				"nick": nick,
				"user": user,
				"host": host,
				"added": new Date(),
				"seen": new Date(),
				"pid": null
			};
			
			if (!self.ignores.some(function (elem, i, arr) {
				return bot.plugins.auth.match(newrow.nick + "!" + newrow.user + "@" + newrow.host, elem);
			})) {
				for (var id in self.db) {
					var row = self.db[id];
					if (row.nick.toLowerCase() == nick.toLowerCase() || row.host.toLowerCase() == host.toLowerCase()) {
						newrow.pid = row.pid !== null ? row.pid : id;
						break;
					}
				}
			}

			self.db[newrow.id] = newrow;
		}
	};

	self.reindex = function() {
		var newdb = {};
		for (var id in self.db) {
			var newrow = self.db[id];
			newrow.pid = null;

			if (!self.ignores.some(function (elem, i, arr) {
				return bot.plugins.auth.match(newrow.nick + "!" + newrow.user + "@" + newrow.host, elem);
			})) {
				for (var id in self.db) {
					var row = self.db[id];
					if (row.nick.toLowerCase() == newrow.nick.toLowerCase() || row.host.toLowerCase() == newrow.host.toLowerCase()) {
						newrow.pid = ((row.pid !== null) ? row.pid : row.id);
						break;
					}
				}
			}

			newdb[newrow.id] = newrow;
		}
		self.db = newdb;
	};

	self.stalk = function(nick) {
		var ids = [];
		var sid = null, spid = null;
		for (var id in self.db) {
			var row = self.db[id];
			if (row.nick.toLowerCase() == nick.toLowerCase()) {
				sid = row.id;
				spid = row.pid;
			}
		}

		if (sid !== null) {
			for (var id in self.db) {
				var row = self.db[id];
				if (row.id == sid || row.pid == sid || (spid !== null && (row.id == spid || row.pid == spid))) {
					if (ids.indexOf(row.id) == -1)
						ids.push(row.id);
				}
			}
		}
		return ids;
	};

	self.deepstalk = function(nick, callback) {
		bot.whois(nick, function(info) {
			var ids = [];
			var sid = null, spid = null;
			for (var id in self.db) {
				var row = self.db[id];
				if ((row.nick.toLowerCase() == info.nick.toLowerCase() || 
					(info.host !== undefined && row.host.toLowerCase() == info.host.toLowerCase())) &&
					!self.ignores.some(function (elem, i, arr) {
						return bot.plugins.auth.match(row.nick + "!" + row.user + "@" + row.host, elem);
					})) {
					sid = row.id;
					spid = row.pid;
				}
			}

			if (sid !== null) {
				for (var id in self.db) {
					var row = self.db[id];
					if (row.id == sid || row.pid == sid || (spid !== null && (row.id == spid || row.pid == spid))) {
						if (ids.indexOf(row.id) == -1)
							ids.push(row.id);
					}
				}
			}
			
			(callback || function(){})(ids);
		});
	};

	self.vstalk = function(nick) {
		var stalk = self.stalk(nick);
		for (var i = 0; i < stalk.length; i++) {
			var row = self.db[stalk[i]];
			bot.out.debug("stalker", row.id + "\t" + row.nick + "\t" + row.user + "\t" + row.host);
		}
	};

	self.ago = function(date) {
		var dt = Date.now() - date.getTime();
		var ret = {};

		ret.milliseconds = dt % 1000;
		dt = Math.floor(dt / 1000);
		ret.seconds = dt % 60;
		dt = Math.floor(dt / 60);
		ret.minutes = dt % 60;
		dt = Math.floor(dt / 60);
		ret.hours = dt % 24;
		dt = Math.floor(dt / 24);
		ret.days = dt;
		return ret;
	};

	self.events = {
		"raw": function(message) {
			if (message.nick !== undefined && message.host !== undefined) {
				self.seen(message.nick, message.user, message.host);
			}
			
			if (message.rawCommand == "352") {
				self.seen(message.args[5], message.args[2], message.args[3]);
			}
		},

		"join": function(channel, nick, message) {
			if (nick == bot.nick) {
				bot.send("WHO", channel);
			}
		},

		"nick": function(oldNick, newNick, channels, message) {
			self.seen(newNick, message.user, message.host);
		},

		"cmd#stalk": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				var ids = self.stalk(nick2);
				var tosort = [];

				for (var i = 0; i < ids.length; i++) {
					var row = self.db[ids[i]];
					tosort.push(row);
				}

				tosort.sort(function(a, b) {
					return b.seen - a.seen;
				});

				var nicks = [];
				for (var i = 0; i < tosort.length && nicks.length < 15; i++) {
					var row = tosort[i];
					if (nicks.indexOf(row.nick) == -1)
						nicks.push(row.nick);
				}

				if (nicks.length == 0)
					nicks.push("no such nick found");
				bot.say(to, nick + ": " + nicks.join(", "));
			}
		},

		"cmd#dstalk": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				self.deepstalk(nick2, function(ids) {
					var tosort = [];

					for (var i = 0; i < ids.length; i++) {
						var row = self.db[ids[i]];
						tosort.push(row);
					}

					tosort.sort(function(a, b) {
						return b.seen - a.seen;
					});

					var nicks = [];
					for (var i = 0; i < tosort.length && nicks.length < 15; i++) {
						var row = tosort[i];
						if (nicks.indexOf(row.nick) == -1)
							nicks.push(row.nick);
					}

					if (nicks.length == 0)
						nicks.push("no such nick found");
					bot.say(to, nick + ": " + nicks.join(", "));
				});
			}
		},

		"cmd#ustalk": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				var ids = self.stalk(nick2);
				var tosort = [];

				for (var i = 0; i < ids.length; i++) {
					var row = self.db[ids[i]];
					tosort.push(row);
				}

				tosort.sort(function(a, b) {
					return b.seen - a.seen;
				});

				for (var i = 0; i < tosort.length && i < 10; i++) {
					var row = tosort[i];
					var ago = self.ago(row.seen);
					bot.notice(nick, row.nick + "!" + row.user + "@" + row.host + " seen " + row.seen.toUTCString() + " (" + ago.days + " days, " + ago.hours + " hours, " + ago.minutes + " minutes, " + ago.seconds + " seconds, " + ago.milliseconds + " milliseconds ago)");
				}
			}
		},

		"cmd#seen": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				var ids = self.stalk(nick2);
				var recent = null;

				for (var i = 0; i < ids.length; i++) {
					var row = self.db[ids[i]];
					if (recent === null || row.seen > recent.seen)
						recent = row;
				}

				if (recent !== null) {
					var ago = self.ago(recent.seen);
					bot.say(to, nick2 + " seen as " + recent.nick + ": " + recent.seen.toUTCString() + " (" + ago.days + " days, " + ago.hours + " hours, " + ago.minutes + " minutes, " + ago.seconds + " seconds, " + ago.milliseconds + " milliseconds ago)");
				}
				else
					bot.say(to, nick2 + " has been never seen");
			}
		},

		"cmd#istalk": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				var ids = self.stalk(nick2);
				var tosort = [];

				for (var i = 0; i < ids.length; i++) {
					var row = self.db[ids[i]];
					tosort.push(row);
				}

				tosort.sort(function(a, b) {
					return b.seen - a.seen;
				});

				var nicks = [];
				for (var i = 0; i < tosort.length && nicks.length < 10; i++) {
					var row = tosort[i];
					if (nicks.indexOf(row.nick) == -1)
						nicks.push(row.nick);
				}

				for (var i = 0; i < nicks.length; i++) {
					var curnick = nicks[i];
					bot.plugins.info.info(curnick, function(info, inick) {
						if (info !== undefined)
							bot.notice(nick, nick2 + " as " + inick + ": " + info);
					});
				}
			}
		},
	};

}

module.exports = StalkerPlugin;
