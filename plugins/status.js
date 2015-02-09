var fs = require("fs");

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

	self.events = {
		"cmd#uptime": function(nick, to, args) {
			fs.readFile("/proc/uptime", {encoding: "utf8"}, function(err, data) {
				var str = "";
				str += "simbot uptime: " + self.durationStr(process.uptime());
				str += "; ";
				str += "system uptime: " + self.durationStr(parseFloat(data));
				bot.say(to, str);
			});
		}
	}
}

module.exports = StatusPlugin;
