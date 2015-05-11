var openttd = require("./openttd/openttd");

function OpenTTDPlugin(bot) {
	var self = this;
	self.name = "openttd";
	self.help = "OpenTTD plugin";
	self.depend = ["cmd", "bits"];

	self.defServer = null;
	self.defPort = 3979;

	self.load = function(data) {
		if (data) {
			self.defServer = data.defServer;
			self.defPort = data.defPort;
		}
	};

	self.save = function() {
		return {defServer: self.defServer, defPort: self.defPort};
	};

	self.events = {
		"cmd#openttd": function(nick, to, args) {
			var server = args[1] || self.defServer;
			var port = args[2] || self.defPort;
			openttd.query(server, port, function(ret) {
				var prefix = ret[1].name + " (" + server + ":" + port + ")";

				var bits = [];
				bits.push(["map", ret[1].map.name + " \x02(" + ret[1].map.width + "×" + ret[1].map.height + ")\x02"]);
				bits.push(["date", ret[1].curDate.toISOString().replace(/^([\d-]+)T.*/, "$1")]);
				bits.push(["companies", ret[1].numCompany + "/" + ret[1].maxCompany]);
				bits.push(["clients", ret[1].numClient + "/" + ret[1].maxClient]);

				bot.say(to, bot.plugins.bits.format(prefix, bits));
			});
		},

		"cmd#openttdrank": function(nick, to, args) {
			var server = args[1] || self.defServer;
			var port = args[2] || self.defPort;
			openttd.query(server, port, function(ret) {
				var prefix = ret[1].name + " ranking";

				var bits = [];
				var companies = ret[3].companies;
				companies.sort(function(lhs, rhs) {
					return rhs.performance - lhs.performance;
				});

				companies.forEach(function(company) {
					bits.push([company.name + " \x02(" + company.performance + ")\x02", "£" + company.value]);
				});

				bot.say(to, bot.plugins.bits.format(prefix, bits));
			});
		}
	};
}

module.exports = OpenTTDPlugin;
