var request = require("request");

function GeoIPPlugin(bot) {
	var self = this;
	self.name = "geoip";
	self.help = "GeoIP plugin";
	self.depend = ["cmd"];

	self.formatPair = function(key, value) {
		if (value !== undefined)
			return key + ": \x02" + value + "\x02";
		else
			return "\x02" + key + "\x02";
	};

	self.events = {
		"cmd#geoip": function(nick, to, args) {
			request("http://ipinfo.io/" + args[1] + "/json", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					var bits = [];

					var locstr = "";
					if (j.city)
						locstr += j.city + ", ";
					if (j.region)
						locstr += j.region + ", ";
					if (j.country)
						locstr += j.country;
					if (locstr != "")
						bits.push(["location", locstr]);

					if (j.loc && j.loc != "")
						bits.push(["coords", j.loc]);

					if (j.org)
						bits.push(["organization", j.org]);
					if (j.postal)
						bits.push(["postal code", j.postal]);
					if (j.bogon)
						bits.push(["bogon"]);

					var hoststr = j.hostname != "No Hostname" ? " \x02(" + j.hostname + ")\x02" : "";
					var str = "\x02" + j.ip + hoststr + ": \x02";
					for (var i = 0; i < bits.length; i++) {
						str += self.formatPair(bits[i][0], bits[i][1]);
						if (i != bits.length - 1)
							str += ", ";
					}

					bot.say(to, str);
				}
				else if (!err && res.statusCode == 404) {
					var str = "\x02" + args[1] + ": \x02" + "invalid IP";
					bot.say(to, str);
				}
			});
		}
	}
}

module.exports = GeoIPPlugin;
