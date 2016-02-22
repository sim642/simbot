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

	self.multiinfo = function(nicks, callback) {
		if (nicks) {
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
							alias: row.nick !== null && row.alias.toLowerCase() != row.nick.toLowerCase() ? row.nick : null,
							info: row.info
						};
					}

					callback(ret);
				});
			});
		}
	};

	self.info = function(nicks, callback) {
		self.multiinfo(nicks, function(infos) {
			for (var nick in infos) {
				var info = infos[nick];
				callback(nick, info.alias, info.info);
			}
		});
	};

	self.events = {
		"cmd#infobot": function(nick, to, args, message) {
			self.info(args.slice(1), function(nick, alias, info) {
				bot.say(to, "Info of " + nick + (alias !== null ? " (" + alias + ")" : "") + ": " + info);
			});
		}
	};
}

module.exports = InfoPlugin;
