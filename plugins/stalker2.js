var sqlite3 = require("sqlite3").verbose();

function Stalker2Plugin(bot) {
	var self = this;
	self.name = "stalker2";
	self.help = "Stalker2 plugin";
	self.depend = ["cmd", "auth"];

	self.db = new sqlite3.Database("./data/stalker2.sqlite");

	self.seen = function(nick, user, host) {
		self.db.get("SELECT id FROM seen WHERE nick = ? AND user = ? AND host = ?", [nick, user, host], function (err, row) {
			if (row !== undefined) {
				self.db.run("UPDATE seen SET lastseen = DATETIME('now') WHERE id = ?", row.id);
			}
			else {
				self.db.get("SELECT id, pid FROM seen WHERE nick = ? OR user = ? OR host = ?", [nick, user, host], function(err, row) {
					self.db.run("INSERT INTO seen (pid, nick, user, host, added, lastseen) VALUES ($pid, $nick, $user, $host, DATETIME('now'), DATETIME('now'))", {"$pid": (row === undefined ? "NULL" : (row.pid != "NULL" ? row.pid : row.id)), "$nick": nick, "$user": user, "$host": host});
				});
			}
		});
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
			if (args[1]) {
				var nicks = [];
				self.db.get("SELECT id, pid FROM seen WHERE nick = ?", args[1], function(err, row) {
					console.log(row);
					if (row !== undefined) {
						var query = "SELECT nick FROM seen WHERE $id IN (id, pid)";
						var params = {"$id": row.id};
						if (row.pid != "NULL") {
							query += " OR $pid IN (id, pid)";
							params["$pid"] = row.pid;
						}
						self.db.each(query, params, function(err, row) {
							console.log(row);
							if (row !== undefined)
								nicks.push(row.nick);
						}, function(err, rows) {
							bot.say(to, nick + ": " + nicks.join(", "));
						});
					}
				});
				//self.db.each("SELECT nick FROM seen WHERE id = $
				//bot.say(to, nick + ": " + nicks.join(", "));
			}
		}
	};
}

module.exports = Stalker2Plugin;
