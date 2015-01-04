var pg = require("pg");

function InfoPlugin(bot) {
	var self = this;
	self.name = "info";
	self.help = "Info plugin";
	self.depend = ["cmd"];
	
	self.conStr = "";

	self.load = function(data) {
		if (data)
			self.conStr = data.conStr;
	};

	self.save = function() {
		return {"conStr": self.conStr};
	};

	self.info = function(nicks, callback) {
		pg.connect(self.conStr, function(err, client, done) {
			if (err) {
				bot.out.error("info", err);
			}

			client.query("SELECT alias, nick, info FROM multiinfo($1)", [nicks], function(err, result) {
				done();
				if (err) {
					bot.out.error("info", err);
				}

				for (var i = 0; i < result.rowCount; i++) {
					var row = result.rows[i];
					callback(row.alias, row.nick != null && row.alias.toLowerCase() != row.nick.toLowerCase() ? row.nick : null, row.info);
				}
			});
		});
	};

	self.multiinfo = function(nicks, callback) {
		pg.connect(self.conStr, function(err, client, done) {
			if (err) {
				bot.out.error("info", err);
			}

			client.query("SELECT alias, nick, info FROM multiinfo($1)", [nicks], function(err, result) {
				done();
				if (err) {
					bot.out.error("info", err);
				}

				var ret = {};

				for (var i = 0; i < result.rowCount; i++) {
					var row = result.rows[i];
					ret[row.alias] = {
						alias: row.nick != null && row.alias.toLowerCase() != row.nick.toLowerCase() ? row.nick : null,
						info: row.info
					};
				}

				callback(ret);
			});
		});
	};

	self.events = {
		"cmd#infobot": function(nick, to, args, message) {
			self.info(args[1].split(","), function(nick, alias, info) {
				bot.say(to, "Info of " + nick + (alias != null ? " (" + alias + ")" : "") + ": " + info);
			});
		}
	}
}

module.exports = InfoPlugin;
