function StalkerPlugin(bot) {
	var self = this;
	self.name = "stalker";
	self.help = "Stalker plugin";
	self.depend = ["cmd", "auth"];
	
	self.nick2host = {};
	self.host2nick = {};

	self.load = function(data) {
		if (data) {
			self.nick2host = data.nick2host;
			self.host2nick = data.host2nick;
		}
	};

	self.unload = function() {
		return {
			nick2host: self.nick2host,
			host2nick: self.host2nick
		};
	};

	self.seen = function(nick, host) {
		if (nick == null || host == null)
			return;

		if (!(nick in self.nick2host))
			self.nick2host[nick] = [];

		if (!(host in self.host2nick))
			self.host2nick[host] = [];

		if (self.nick2host[nick].indexOf(host) == -1)
			self.nick2host[nick].push(host);

		if (self.host2nick[host].indexOf(nick) == -1)
			self.host2nick[host].push(nick);
	};

	self.search = function(nick, host, xnicks, xhosts, depth) {
		if (depth > 10)
			return [];
		else {
			var nicks = [];
			if (host !== undefined && !(host in xhosts) && (host in self.host2nick)) {
				xhosts[host] = null;
				var ns = self.host2nick[host];
				nicks = nicks.concat(ns);

				for (var i = 0; i < ns.length; i++)
					nicks = nicks.concat(self.search(ns[i], host, xnicks, xhosts, depth + 1));
			}

			if (nick !== undefined && !(nick in xnicks) && (nick in self.nick2host)) {
				xnicks[nick] = null;
				var hs = self.nick2host[nick];

				for (var i = 0; i < hs.length; i++)
					nicks = nicks.concat(self.search(nick, hs[i], xnicks, xhosts, depth + 1));
			}

			return nicks;
		}
	};

	self.events = {
		"raw": function(message) {
			if (message.nick !== undefined && message.host !== undefined) {
				self.seen(message.nick.toLowerCase(), message.host);
			}
			
			if (message.rawCommand == "352") {
				self.seen(message.args[5].toLowerCase(), message.args[3]);
			}
		},

		"join": function(channel, nick, message) {
			if (nick == bot.nick) {
				bot.send("WHO", channel);
			}
		},

		"nick": function(oldNick, newNick, channels, message) {
			self.seen(newNick.toLowerCase(), message.host);
		},

		"cmd#stalk": bot.plugins.auth.proxy(10, function(nick, to, args) {
			if (args[1]) {
				var nicks = self.search(args[1].toLowerCase(), undefined, {}, {}, 0);
				nicks.sort();
				nicks = nicks.reduce(function(p, c) {
					if (p.indexOf(c) < 0) p.push(c);
					return p;
				}, []);
				bot.say(to, nick + ": " + nicks.join(", "));
			}
		})
	};

	self.tolow = function() {
		var newnick2host = {}, newhost2nick = {};
		for (var nick in self.nick2host) {
			newnick2host[nick.toLowerCase()] = self.nick2host[nick];
		}

		for (var host in self.host2nick) {
			var nicks = self.host2nick[host];
			for (var i = 0; i < nicks.length; i++)
				nicks[i] = nicks[i].toLowerCase();
			newhost2nick[host] = nicks;
		}

		self.nick2host = newnick2host;
		self.host2nick = newhost2nick;
	};

	self.stripuser = function(host) {
		return host.substr(host.indexOf("@") + 1);
	};

	self.stripusers = function() {
		var newnick2host = {}, newhost2nick = {};
		for (var nick in self.nick2host) {
			var hosts = [];// = self.nick2host[nick];
			for (var i = 0; i <	self.nick2host[nick].length; i++) {
				if (self.nick2host[nick][i] != null)
					hosts.push(self.stripuser(self.nick2host[nick][i]));
			}
			newnick2host[nick] = hosts;
		}

		for (var host in self.host2nick) {
			newhost2nick[self.stripuser(host)] = self.host2nick[host];
		}

		self.nick2host = newnick2host;
		self.host2nick = newhost2nick;
	};
}

module.exports = StalkerPlugin;
