function Stalker2Plugin(bot) {
	var self = this;
	self.name = "stalker2";
	self.help = "Stalker2 plugin";
	self.depend = ["cmd", "auth"];
	
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

	self.load = function(data) {
		if (data) {
			self.db = data.db;
			self.autoid = data.autoid;
			for (var id in self.db) {
				var row = self.db[id];
				row.added = new Date(row.added);
				row.seen = new Date(row.seen);
			}
		}
	};

	self.unload = function() {
		return {
			"db": self.db,
			"autoid": self.autoid
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

			for (var id in self.db) {
				var row = self.db[id];
				if (row.nick.toLowerCase() == nick.toLowerCase() || row.user.toLowerCase() == user.toLowerCase() || row.host.toLowerCase() == host.toLowerCase()) {
					newrow.pid = row.pid !== null ? row.pid : id;
					break;
				}
			}

			self.db[newrow.id] = newrow;
		}
	};

	self.stalk = function(nick) {
		var ids = [];
		var sid = null, spid = null;
		for (var id in self.db) {
			var row = self.db[id];
			if (row.nick.toLowerCase() == nick.toLowerCase()) {
				sid = id;
				spid = row.pid;
				break;
			}
		}

		if (sid !== null) {
			for (var id in self.db) {
				var row = self.db[id];
				if (id == sid || id == spid || (spid !== null && (row.pid == spid || row.pid == spid))) {
					if (ids.indexOf(id) == -1)
						ids.push(id);
				}
			}
		}
		return ids;
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

		"cmd#stalk2": function(nick, to, args) {
			var nick2 = args[1];
			if (nick2) {
				var ids = self.stalk(nick2);
				var nicks = [];

				for (var i = 0; i < ids.length; i++) {
					var row = self.db[ids[i]];
					if (nicks.indexOf(row.nick) == -1)
						nicks.push(row.nick);
				}

				if (nicks.length == 0)
					nicks.push("no such nick found");
				bot.say(to, nick + ": " + nicks.join(", "));
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

				if (recent !== null)
					bot.say(to, nick2 + " seen as " + recent.nick + ": " + recent.seen.toUTCString() + " UTC");
				else
					bot.say(to, nick2 + " has been never seen");
			}
		}
	};

}

module.exports = Stalker2Plugin;
