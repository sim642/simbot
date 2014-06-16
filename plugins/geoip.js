var request = require("request");
var dns = require("dns");

function GeoIPPlugin(bot) {
	var self = this;
	self.name = "geoip";
	self.help = "GeoIP plugin";
	self.depend = ["cmd", "bitly"];

	self.formatPair = function(key, value) {
		if (value !== undefined)
			return key + ": \x02" + value + "\x02";
		else
			return "\x02" + key + "\x02";
	};

	self.geoip = function(ip, callback) {
		request("http://ipinfo.io/" + ip + "/json", function(err, res, body) {
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

				var loc = j.loc && j.loc != "";
				if (loc)
					bits.push(["coords", j.loc]);

				if (j.org)
					bits.push(["organization", j.org]);
				if (j.postal)
					bits.push(["postal code", j.postal]);
				if (j.bogon)
					bits.push(["bogon"]);

				var func;
				var mapsurl = "http://www.google.com/maps/place/" + j.loc + "/@" + j.loc + ",9z";
				if (loc)
					func = bot.plugins.bitly.shorten;
				else {
					func = function(_, callback) {
						callback();
					};
				}

				func(mapsurl, function(shorturl) {
					if (loc) {
						for (var i = 0; i < bits.length; i++) {
							if (bits[i][0] == "coords") {
								bits[i][1] += " \x02(" + shorturl + ")\x02";
								break;
							}
						}
					}

					var hoststr = (j.hostname !== undefined && j.hostname != "No Hostname") ? " \x02(" + j.hostname + ")\x02" : "";
					var str = "\x02" + j.ip + hoststr + ": \x02";
					for (var i = 0; i < bits.length; i++) {
						str += self.formatPair(bits[i][0], bits[i][1]);
						if (i != bits.length - 1)
							str += ", ";
					}

					(callback || function(){})(str);
				});
			}
			else if (!err && res.statusCode == 404) {
				(callback || function(){})(null);
			}
		});
	};

	self.events = {
		"cmd#geoip": function(nick, to, args) {
			self.geoip(args[1], function(str) {
				if (str === null) {
					dns.resolve4(args[1], function(err, ips) {
						if (!err) {
							var i = args[2] || 1;
							if (i - 1 < 0 || i - 1 >= ips.length) {
								bot.say(to, "\x02" + args[1] + "\x02 [" + i + "/" + ips.length + "] invalid resolve index");
								return;
							}

							var ip = ips[i - 1];
							self.geoip(ip, function(str) {
								if (str === null) {
									bot.say(to, "\x02" + args[1] + "\x02 [" + i + "/" + ips.length + "] = \x02" + ip + "\x02 is invalid IP");
								}
								else {
									bot.say(to, "\x02" + args[1] + "\x02 [" + i + "/" + ips.length + "] = " + str);
								}
							});
						}
						else
							bot.say(to, "\x02" + args[1] + "\x02 is invalid IP and domain");
					});
				}
				else {
					bot.say(to, str);
				}
			});
		}
	}
}

module.exports = GeoIPPlugin;
