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

	self.dirSize = function(dir, callback) {
		var files = fs.readdirSync(dir);
		var size = 0;
		for (var i = 0; i < files.length; i++) {
			var stat = fs.statSync(path.join(dir, files[i]));
			size += stat.size;
		}
		callback(size);
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
			self.dirSize("./data/", function(size) {
				bot.say(to, "simbot's data: " + size + " bytes");
			});
		}
	}
}

module.exports = StatusPlugin;
