var fs = require("fs");
var path = require("path");

function StatusPlugin(bot) {
	var self = this;
	self.name = "status";
	self.help = "simbot and system status plugin";
	self.depend = ["cmd"];

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
				var str = "";
				str += "simbot uptime: " + self.durationStr(process.uptime());
				str += "; ";
				str += "system uptime: " + self.durationStr(parseFloat(data));
				bot.say(to, str);
			});
		},

		"cmd#disk": function(nick, to, args) {
			var todo = 0;
			var str = "";
			var addStr = function(dstr) {
				todo--;
				str += (str == "" ? "" : "; ") + dstr;
				if (todo == 0) {
					bot.say(to, str);
				}
			};

			todo++;
			self.dirSize("./data/", function(size) {
				addStr("simbot data: " + self.formatSize(size));
			});

			if (bot.plugins.history) {
				todo++;
				var re = new RegExp("^" + bot.plugins.history.basename + ".+" + "_\\d{8}\\.log$");
				self.dirSize(bot.plugins.history.basedir, function(filename) {
					return filename.match(re);
				}, function(size) {
					addStr("simbot logs: " + self.formatSize(size));
				});
			}
		}
	}
}

module.exports = StatusPlugin;
