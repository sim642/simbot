var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");

function GithubPlugin(bot) {
	var self = this;
	self.name = "github";
	self.help = "Github stats plugin";
	self.depend = ["cmd", "bits", "util"];

	self.blocks = "▁▂▃▄▅▆▇█";

	self.userRe = /^\w[\w-]+$/;
	self.repoRe = /^(\w[\w-]+)\/(\w[\w-]+)$/;

	self.token = null;
	self.request = null;

	self.users = {};

	self.urlRe = /github\.com\/(\w[\w-]+(?:\/\w[\w-]+)?)/;
	self.channels = [];

	self.setToken = function(token) {
		if (token) {
			self.token = token;
			self.request = request.defaults({auth: {username: self.token + ":x-oauth-basic"}, headers: {"User-Agent": "simbot GitHub"}});
		}
		else {
			self.token = null;
			self.request = request.defaults({headers: {"User-Agent": "simbot GitHub"}});
		}
	};

	self.load = function(data) {
		if (data && data.users)
			self.users = data.users;
		if (data && data.channels)
			self.channels = data.channels;

		self.setToken(data.token);
	};

	self.save = function() {
		return {
			"token": self.token,
			"users": self.users,
			"channels": self.channels
		};
	};

	self.parseuser = function(user) {
		if (user in self.users)
			return self.users[user];
		else
			return user;
	};

	self.graph = function(arr, minMult) {
		var min = Math.min.apply(null, arr);
		var max = Math.max.apply(null, arr);
		var mult = Math.max(minMult || 0.5, (max - min) / (self.blocks.length - 1));

		var str = "";
		for (var i = 0; i < arr.length; i++) {
			var x = (arr[i] - min) / mult;
			str += self.blocks[Math.ceil(x)];
		}
		return str;
	};

	self.github = function(arg, callback) {
		var realarg = bot.plugins.util.getKeyByValue(self.users, arg) || arg;

		var prefix = "";
		var bits = [];

		var output = function() {
			callback(bot.plugins.bits.format(prefix, bits));
		};

		if (arg.match(self.repoRe)) { // repo
			self.request("https://api.github.com/repos/" + arg, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					prefix = j.full_name; // TODO: use realarg if possible
					if (j.fork)
						bits.push(["fork", j.source.full_name]);
					if (j.description)
						bits.push([, j.description, 0]);
					bits.push(["stars", j.stargazers_count]);
					bits.push(["watch", j.watchers_count]);
					bits.push(["forks", j.forks_count]);
					if (j.language)
						bits.push(["language", j.language]);
					bits.push(["issues", j.open_issues_count]);
					bits.push([, j.html_url, 2]);

					output();
				}
				else if (!err && res.statusCode == 404) {
					prefix = arg;
					bits.push([, "repo not found", 0]);

					output();
				}
				else
					bot.out.error("github", err, body);
			});
		}
		else if (arg.match(self.userRe)) { // user/org
			self.request("https://api.github.com/users/" + arg, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					prefix = j.login + (realarg.toLowerCase() != j.login.toLowerCase() ? " (" + realarg + ")" : "");
					bits.push([, j.type]);
					if (j.name)
						bits.push([, j.name]);
					if (j.bio)
						bits.push([, j.bio, 0]);
					bits.push(["repos", j.public_repos]);
					bits.push(["gists", j.public_gists]);
					bits.push(["followers", j.followers]);
					bits.push(["following", j.following]);

					var finish = function() {
						bits.push([, j.html_url, 2]);
						output();
					};


					if (j.type == "User") {
						self.request("https://github.com/users/" + j.login + "/contributions", function(err, res, body) {
							if (!err && res.statusCode == 200) {
								var doc = new dom().parseFromString(body);
								var nodes = xpath.select("//rect[@class='day']", doc);
								var contribs = [];
								for (var i = 0; i < nodes.length; i++) {
									var date = nodes[i].getAttribute("data-date");
									var count = nodes[i].getAttribute("data-count");
									contribs.push([date, parseInt(count), 0]);
								}
								// TODO: guarantee contribs sorted by date

								var longstreak = 0;
								var total = 0;
								var most = 0;
								for (var i = 0; i < contribs.length; i++) {
									total += contribs[i][1];

									if (contribs[i][1] > 0) {
										if (i > 0 && contribs[i - 1][1] > 0)
											contribs[i][2] = contribs[i - 1][2] + 1;
										else
											contribs[i][2] = 1;
									}

									longstreak = Math.max(longstreak, contribs[i][2]);
									most = Math.max(most, contribs[i][1]);
								}
								var curstreak = Math.max(contribs[contribs.length - 2][2], contribs[contribs.length - 1][2]);

								bits.push(["contributions", total]);
								bits.push(["most daily contributions", most]);
								bits.push(["longest streak", longstreak + " days"]);
								bits.push(["current streak", curstreak + " days"]);

								var justContribs = contribs.map(function(tuple) {
									return tuple[1];
								});
								bits.push(["recent contributions", self.graph(justContribs.slice(-14)), 0]);

								finish();
							}
							else
								bot.out.error("github", err, body);
						});
					}
					else
						finish();
				}
				else if (!err && res.statusCode == 404) {
					prefix = arg;
					bits.push([, "user/organization not found", 0]);

					output();
				}
				else
					bot.out.error("github", err, body);
			});
		}
		else {
			prefix = arg;
			bits.push([, "invalid argument", 0]);

			output();
		}
	};

	self.events = {
		"cmd#github": function(nick, to, args) {
			var realarg = args[1] || nick;
			var arg = self.parseuser(realarg.toLowerCase());

			self.github(arg, function(str) {
				bot.say(to, str);
			});
		},

		"cmd#setgithub": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (args[1] !== undefined) {
						self.users[nick.toLowerCase()] = args[1];
						bot.notice(nick, "github set to " + args[1]);
					}
					else {
						delete self.users[nick.toLowerCase()];
						bot.notice(nick, "github unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set github");
			});
		},

		"message": function(nick, to, text) {
			if (self.channels.indexOf(to) != -1) {
				var m = text.match(self.urlRe);
				if (m) {
					var arg = m[1];
					bot.out.log("github", nick + " in " + to + ": " + m[0]);
					self.github(arg, function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text) {
			var m = text.match(self.urlRe);
			if (m) {
				var arg = m[1];
				bot.out.log("github", nick + " in PM: " + m[0]);
				self.github(arg, function(str) {
					bot.say(nick, str);
				});
			}
		}
	};
}

module.exports = GithubPlugin;
