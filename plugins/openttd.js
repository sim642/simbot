var openttd = require("./openttd/openttd");
var Client = require("./openttd/client");

function OpenTTDPlugin(bot) {
	var self = this;
	self.name = "openttd";
	self.help = "OpenTTD plugin";
	self.depend = ["cmd", "bits", "util"];

	self.defServer = null;
	self.defPort = 3979;

	self.channels = [];
	self.pRet = null;
	self.interval = null;

	self.clients = {};

	self.load = function(data) {
		if (data) {
			self.defServer = data.defServer;
			self.defPort = data.defPort;
			self.channels = data.channels || [];
		}
	};

	self.enable = function() {
		self.interval = setInterval(self.refresh, 60 * 1000);
		self.refresh();

		if (self.defServer)
			self.clientStart(self.defServer, self.defPort);
	};

	self.disable = function() {
		clearInterval(self.interval);
		self.interval = null;

		for (var host in self.clients) {
			self.clientStop(host);
		}
	};

	self.save = function() {
		return {defServer: self.defServer, defPort: self.defPort, channels: self.channels};
	};

	self.refresh = function() {
		openttd.query(self.defServer, self.defPort, function(ret) {
			if (self.pRet &&
				(self.pRet[1].numClient != ret[1].numClient ||
				 self.pRet[1].numCompany != ret[1].numCompany ||
				 self.pRet[1].map.name != ret[1].map.name)) {
				var prefix = ret[1].name + " \x02(" + self.defServer + ":" + self.defPort + ")\x02";

				var bits = [];
				bits.push(["map", ret[1].map.name + " \x02(" + ret[1].map.width + "×" + ret[1].map.height + ")\x02"]);
				bits.push(["date", ret[1].curDate.toISOString().replace(/^([\d-]+)T.*/, "$1")]);
				bits.push(["companies", ret[1].numCompany + "/" + ret[1].maxCompany]);
				bits.push(["clients", ret[1].numClient + "/" + ret[1].maxClient]);

				var str = bot.plugins.bits.format(prefix, bits);

				self.channels.forEach(function(channel) {
					bot.say(channel, str);
				});
			}

			self.pRet = ret;
		});
	};

	self.clientStart = function(addr, port) {
		var host = addr + ":" + port;
		if (host in self.clients)
			return;

		self.clients[host] = new Client();
		self.clients[host].connect(addr, port);

		self.clients[host].on("chat", function(chat) {
			bot.out.debug("openttd", chat);
			if (chat.clientId != self.clients[host].clientId) {
				var str = "<" + chat.client.name + "> " + chat.msg;

				self.channels.forEach(function(channel) {
					bot.say(channel, str);
				});
			}
		});
	};

	self.clientStop = function(host) {
		self.clients[host].end();
		delete self.clients[host];
	};

	self.events = {
		"cmd#openttd": function(nick, to, args) {
			var server = args[1] || self.defServer;
			var port = args[2] || self.defPort;
			openttd.query(server, port, function(ret) {
				var prefix = ret[1].name + " \x02(" + server + ":" + port + ")\x02";

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
					bits.push([company.name + " \x02(" + company.performance + ")\x02", "£" + bot.plugins.util.thSeps(company.value)]);
				});

				bot.say(to, bot.plugins.bits.format(prefix, bits));
			});
		},

		"cmd#openttdcomp": function(nick, to, args) {
			var comp = args[1]; // TODO: error if not given
			var server = args[2] || self.defServer;
			var port = args[3] || self.defPort;
			openttd.query(server, port, function(ret) {
				var companies = ret[3].companies;

				var i;
				for (i = 0; i < companies.length && companies[i].id != comp && companies[i].name.toLowerCase().indexOf(comp.toLowerCase()) < 0; i++); // maybe unneccessary find
				if (i == companies.length) // not found
					return;

				var company = companies[i];

				var prefix = company.name + " on " + ret[1].name;
				var bits = [];

				bits.push(["start year", company.startYear]);
				bits.push(["value", "£" + bot.plugins.util.thSeps(company.value)]);
				bits.push(["money", "£" + bot.plugins.util.thSeps(company.money)]);
				bits.push(["income", "£" + bot.plugins.util.thSeps(company.income)]);
				bits.push(["performance", company.performance]);

				/*bits.push(["vehicles", Object.keys(company.vehicles).map(function(type) {
					return type + ": " + company.vehicles[type];
				}).join(", ")]);
				bits.push(["stations", Object.keys(company.stations).map(function(type) {
					return type + ": " + company.stations[type];
				}).join(", ")]);*/

				bits.push(["type", "vehicles (stations)"]);
				for (var type in company.vehicles) {
					bits.push([type, company.vehicles[type] + " (" + company.stations[type] + ")"]);
				}

				bot.say(to, bot.plugins.bits.format(prefix, bits));
			});
		},

		"message": function(nick, to, text) {
			if (self.channels.indexOf(to) < 0)
				return;

			for (var host in self.clients) {
				self.clients[host].chat("<" + nick + "> " + text);
			}
		},
	};
}

module.exports = OpenTTDPlugin;
