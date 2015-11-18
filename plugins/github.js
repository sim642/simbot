var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");

function GithubPlugin(bot) {
	var self = this;
	self.name = "github";
	self.help = "Github stats plugin";
	self.depend = ["cmd", "ignore", "bits", "util", "*web"];

	self.blocks = "▁▂▃▄▅▆▇█";

	self.userRe = /^\w[\w-]+$/;
	self.repoRe = /^(\w[\w-]+)\/(\w[\w-]+)$/;
	self.gistRe = /^(?:(\w[\w-]+)\/)?([0-9a-f]{20})$/;

	self.arequest = request.defaults({headers: {"User-Agent": "simbot GitHub"}});
	self.token = null;
	self.request = null;

	self.users = {};

	self.urlRe = /(?:https?:\/\/|\s|^)(?:(www|gist)\.)?github\.com\/(\w[\w-]+(?:\/\w[\w-]+)?)(?=\s|$)/;
	self.channels = [];
	self.ignores = [];

	self.hookChannels = [];

	self.setToken = function(token) {
		if (token) {
			self.token = token;
			self.request = request.defaults({auth: {username: self.token + ":x-oauth-basic"}, headers: {"User-Agent": "simbot GitHub"}});
		}
		else {
			self.token = null;
			self.request = self.arequest;
		}
	};

	self.load = function(data) {
		if (data && data.users)
			self.users = data.users;
		if (data && data.channels)
			self.channels = data.channels;
		if (data && data.ignores)
			self.ignores = data.ignores;
		if (data && data.hookChannels)
			self.hookChannels = data.hookChannels;

		self.setToken(data.token);
	};

	self.save = function() {
		return {
			"token": self.token,
			"users": self.users,
			"channels": self.channels,
			"ignores": self.ignores,
			"hookChannels": self.hookChannels
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

	self.getLangs = function(reposUrl, callback) {
		self.request(reposUrl, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);

				var langs = {};
				j.forEach(function(repo) {
					if (repo.language !== null) {
						if (!(repo.language in langs))
							langs[repo.language] = 0;
						langs[repo.language]++;
					}
				});

				var slangs = [];
				for (var lang in langs) {
					slangs.push([lang, langs[lang]]);
				}

				slangs.sort(function(lhs, rhs) {
					return rhs[1] - lhs[1];
				});

				callback(slangs);
			}
			else
				bot.out.error("github", err, body);
		});
	};

	self.github = function(arg, noError, callback) {
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
					prefix = j.full_name + (realarg.toLowerCase() != j.full_name.toLowerCase() ? " (" + realarg + ")" : "");
					if (j.fork)
						bits.push(["fork", j.source.full_name]);
					if (j.description)
						bits.push([, j.description, 0]);
					if (j.homepage)
						bits.push([, j.homepage, 2]);
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

					if (!noError)
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
					if (j.company)
						bits.push(["company", j.company]);
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

					self.getLangs(j.repos_url, function(langs) {
						if (langs.length > 0) {
							bits.push(["languages", langs.slice(0, 4).map(function(lang) {
								return lang[0];
							}).join(", ")]);
						}

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

									contribs.sort(function(lhs, rhs) { // guarantee sort
										return lhs[0].localeCompare(rhs[0]);
									});

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
					});
				}
				else if (!err && res.statusCode == 404) {
					prefix = arg;
					bits.push([, "user/organization not found", 0]);

					if (!noError)
						output();
				}
				else
					bot.out.error("github", err, body);
			});
		}
		else {
			prefix = arg;
			bits.push([, "invalid argument", 0]);

			if (!noError)
				output();
		}
	};

	self.gist = function(arg, noError, callback) {
		var m = arg.match(self.gistRe);

		var prefix = "";
		var bits = [];

		var output = function() {
			callback(bot.plugins.bits.format(prefix, bits));
		};

		if (m) {
			self.request("https://api.github.com/gists/" + m[2], function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);

					prefix = (j.owner ? j.owner.login : "anonymous") + "/" + j.id;

					if (j.fork_of)
						bits.push(["fork", j.fork_of.owner.login + "/" + j.fork_of.id]);
					if (j.description)
						bits.push([, j.description, 0]);
					bits.push(["files", Object.keys(j.files).length]);
					bits.push(["revisions", j.history.length]);
					// TODO: star count - not available in API
					bits.push(["comments", j.comments]);
					bits.push(["forks", j.forks.length]);

					bits.push([, j.html_url, 2]);

					output();
				}
				else if (!err && res.statusCode == 404) {
					prefix = arg;
					bits.push([, "repo not found", 0]);

					if (!noError)
						output();
				}
				else
					bot.out.error("github", err, body);
			});
		}
		else {
			prefix = arg;
			bits.push([, "invalid argument", 0]);

			if (!noError)
				output();
		}
	};

	self.lookup = function(m, noError, callback) {
		(m[1] == "gist" ? self.gist : self.github)(m[2], noError, callback);
	};

	self.events = {
		"cmd#github": function(nick, to, args) {
			var realarg = args[1] || nick;
			var arg = self.parseuser(realarg.toLowerCase());

			self.github(arg, false, function(str) {
				bot.say(to, str);
			});
		},

		"cmd#gist": function(nick, to, args) {
			var arg = args[1];

			self.gist(arg, false, function(str) {
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

		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) && !bot.plugins.ignore.ignored(self.ignores, message)) {
				var m = text.match(self.urlRe);
				if (m) {
					bot.out.log("github", nick + " in " + to + ": " + m[0]);
					self.lookup(m, true, function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text) {
			var m = text.match(self.urlRe);
			if (m) {
				bot.out.log("github", nick + " in PM: " + m[0]);
				self.lookup(m, true, function(str) {
					bot.say(nick, str);
				});
			}
		},

		"web#github": function(req, qs, body, res) {
			res.end();

			var event = req.headers["X-Github-Event".toLowerCase()];
			var payload = JSON.parse(body);

			switch (event) {
				case "push":
					var branch = payload.ref.replace("refs/heads/", "");

					payload.commits.forEach(function(commit) {
						var prefix = payload.repository.full_name + "/" + branch;
						var bits = [];
						bits.push([commit.author.username + " committed", commit.message]);
						var str = bot.plugins.bits.format(prefix, bits);

						self.hookChannels.forEach(function(channel) {
							bot.say(channel, str);
						});
					});
					break;

				default:
					bot.out.debug("github", [event, payload]);
			}
		}
	};
}

module.exports = GithubPlugin;
