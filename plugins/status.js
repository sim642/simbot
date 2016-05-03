var fs = require("fs");
var path = require("path");
var os = require("os");

function StatusPlugin(bot) {
	var self = this;
	self.name = "status";
	self.help = "simbot and system status plugin";
	self.depend = ["cmd", "bits", "date", "util"];

	self.size = function(p, callback) {
		fs.stat(p, function(err, stats) {
			if (err) {
				callback(err);
				return;
			}

			if (stats.isDirectory()) {
				var total = stats.size;
				var added = 0;

				fs.readdir(p, function(err, files) {
					if (err) {
						callback(err);
						return;
					}

					var checkDone = function() {
						if (added == files.length)
							callback(null, total);
					};

					files.forEach(function(subp) {
						self.size(path.join(p, subp), function(err, size) {
							if (err) {
								callback(err);
								return;
							}

							added++;
							total += size;
							checkDone();
						});
					});

					checkDone();
				});
			}
			else {
				callback(err, stats.size);
				return;
			}
		});
	};

	self.events = {
		"cmd#uptime": function(nick, to, args) {
			var prefix = "uptime";
			var bits = [];

			bits.push(["simbot", process.uptime()]);
			bits.push(["system", os.uptime()]);

			for (var i = 0; i < bits.length; i++)
				bits[i][1] = bot.plugins.date.printDur(bits[i][1] * 1000, "second");

			bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
		},

		"cmd#disk": function(nick, to, args) {
			var todo = 0;
			var prefix = "disk usage";
			var bits = [];

			var addSize = function(bit) {
				todo--;
				bits.push(bit);
				if (todo === 0) {
					var total = 0;
					for (var i = 0; i < bits.length; i++)
						total += bits[i][1];
					bits.push(["total", total]);

					for (var i = 0; i < bits.length; i++)
						bits[i][1] = bot.plugins.util.formatSize(bits[i][1]);

					bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
				}
			};

			todo++;
			self.size("./data/", function(err, size) {
				if (!err)
					addSize(["simbot", size]);
				else
					bot.out.error("status", err);
			});

			if (bot.plugins.history) {
				todo++;
				self.size(bot.plugins.history.basedir, function(err, size) {
					if (!err)
						addSize(["logs", size]);
					else
						bot.out.error("status", err);
				});
			}
		},

		"cmd#loadavg": function(nick, to, args) {
			var prefix = "average loads";
			var bits = [];

			var loads = os.loadavg();
			bits.push(["1 min", loads[0].toFixed(2)]);
			bits.push(["5 mins", loads[1].toFixed(2)]);
			bits.push(["15 mins", loads[2].toFixed(2)]);

			bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
		},

		"cmd#memory": function(nick, to, args) {
			var prefix = "memory";
			var bits = [];

			var total = os.totalmem(), free = os.freemem(); // free doesn't seem correct
			bits.push(["used", bot.plugins.util.formatSize(total - free)]);
			bits.push(["free", bot.plugins.util.formatSize(free)]);
			bits.push(["total", bot.plugins.util.formatSize(total)]);

			bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
		}
	};
}

module.exports = StatusPlugin;
