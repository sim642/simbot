var fs = require("fs");
var path = require("path");

function StatusPlugin(bot) {
	var self = this;
	self.name = "status";
	self.help = "simbot and system status plugin";
	self.depend = ["cmd", "bits"];

	self.duration = function(dt) {
		dt *= 1000; // seconds -> milliseconds because floating point

		var ret = {};

		ret.milliseconds = Math.round(dt % 1000);
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

	self.durationStr = function(dt) {
		var str = "";
		var dur = self.duration(dt);

		str += dur.days + " days, ";
		str += dur.hours + " hours, ";
		str += dur.minutes + " minutes, ";
		str += dur.seconds + " seconds";

		return str;
	};

	self.dirSize = function(dir, filter, callback) {
		if (callback === undefined) {
			callback = filter;
			filter = function() {
				return true;
			};
		}

		var size = 0;
		var added = 0;

		fs.readdir(dir, function(err, files) {
			files = files.filter(filter);
			for (var i = 0; i < files.length; i++) {
				fs.stat(path.join(dir, files[i]), function(err, stats) {
					added++;
					size += stats.size;

					if (added == files.length)
						callback(size);
				});
			}
		});
	};

	self.formatSize = function(size) {
		var units = ["B", "kB", "MiB", "GiB"];
		var i = Math.floor(Math.log(size) / Math.log(1024));
		return Math.round(size / Math.pow(1024, i) * 100) / 100 + " " + units[i];
	};

	self.events = {
		"cmd#uptime": function(nick, to, args) {
			fs.readFile("/proc/uptime", {encoding: "utf8"}, function(err, data) {
				var prefix = "uptime";
				var bits = [];

				bits.push(["simbot", process.uptime()]);
				bits.push(["system", parseFloat(data)]);

				for (var i = 0; i < bits.length; i++)
					bits[i][1] = self.durationStr(bits[i][1]);

				bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
			});
		},

		"cmd#disk": function(nick, to, args) {
			var todo = 0;
			var prefix = "disk usage";
			var bits = [];

			var addSize = function(bit) {
				todo--;
				bits.push(bit);
				if (todo == 0) {
					var total = 0;
					for (var i = 0; i < bits.length; i++)
						total += bits[i][1];
					bits.push(["total", total]);

					for (var i = 0; i < bits.length; i++)
						bits[i][1] = self.formatSize(bits[i][1]);

					bot.say(to, bot.plugins.bits.format(prefix, bits, ";"));
				}
			};

			todo++;
			self.dirSize("./data/", function(size) {
				addSize(["simbot", size]);
			});

			if (bot.plugins.history) {
				todo++;
				var re = new RegExp("^" + bot.plugins.history.basename + ".+" + "_\\d{8}\\.log$");
				self.dirSize(bot.plugins.history.basedir, function(filename) {
					return filename.match(re);
				}, function(size) {
					addSize(["logs", size]);
				});
			}
		}
	}
}

module.exports = StatusPlugin;