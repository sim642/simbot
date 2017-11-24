var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");

function GithubPlugin(bot) {
	var self = this;
	self.name = "github";
	self.help = "Github stats plugin";
	self.depend = ["cmd", "ignore", "bits", "util", "gitio", "nickserv"];

	self.blocks = "▁▂▃▄▅▆▇█";

	self.userRe = /^\w[\w-]*$/;
	self.repoRe = /^(\w[\w-]*)\/(\w[\w-]*)$/;
	self.gistRe = /^(?:(\w[\w-]+)\/)?([0-9a-f]{20})$/;

	self.arequest = request.defaults({headers: {"User-Agent": "simbot GitHub"}});
	self.token = null;
	self.request = null;

	self.users = {};

	self.urlRe = /(?:https?:\/\/|\s|^)(?:(www|gist)\.)?github\.com\/(\w[\w-]+(?:\/\w[\w-]+)?)(?=\s|$)/;
	self.channels = [];
	self.ignores = [];

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

		self.setToken(data.token);
	};

	self.save = function() {
		return {
			"token": self.token,
			"users": self.users,
			"channels": self.channels,
			"ignores": self.ignores,
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

	self.getRepoLangs = function(repo, callback) {
		self.request(repo.languages_url, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);
				callback(j);
			}
			else {
				bot.out.error("github", err, body);
				callback(null);
			}
		});
	};

	self.getUserLangs = function(user, callback) {
		self.request(user.repos_url, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);

				var rets = [];
				var done = function() {
					var langs = {};
					rets.forEach(function(ret) {
						var sum = 0;
						for (var lang in ret)
							sum += ret[lang];

						for (var lang in ret) {
							if (!(lang in langs))
								langs[lang] = 0;
							langs[lang] += ret[lang] / sum;
						}
					});

					callback(langs);
				};

				j.forEach(function(repo) {
					self.getRepoLangs(repo, function(langs) {
						if (langs)
							rets.push(langs);

						if (rets.length == j.length)
							done();
					});
				});
			}
			else {
				bot.out.error("github", err, body);
				callback(null);
			}
		});
	};

	self.sortLangs = function(langs) {
		var slangs = [];
		for (var lang in langs) {
			slangs.push([lang, langs[lang]]);
		}

		slangs.sort(function(lhs, rhs) {
			return rhs[1] - lhs[1];
		});
		return slangs;
	};

	self.getContribs = function(user, callback) {
		self.request("https://github.com/users/" + user.login + "/contributions", function(err, res, body) {
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

				var justContribs = contribs.map(function(tuple) {
					return tuple[1];
				});

				callback(justContribs, total, most, longstreak, curstreak);
			}
			else {
				bot.out.error("github", err, body);
				callback(null, null, null, null, null);
			}
		});
	};

	self.getCommits = function(repo, callback) {
		self.request({
			url: "https://github.com/" + repo.full_name + "/graphs/commit-activity-data",
			headers: {
				"Accept": "application/json"
			}
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) { // github actually returned data
				var j = JSON.parse(body);
				var weeks = [];
				var days = [];

				j.forEach(function(week) {
					weeks.push(week.total);

					week.days.forEach(function(day) {
						days.push(day);
					});
				});

				callback(weeks, days);
			}
			else if (!err && res.statusCode == 202) { // github ready to give data
				self.getCommits(repo, callback);
			}
			else {
				bot.out.error("github", err, body);
				callback(null, null);
			}
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

					var finish = function() {
						bits.push([, j.html_url, 2]);
						output();
					};

					self.getRepoLangs(j, function(langs) {
						var slangs = self.sortLangs(langs);
						if (slangs.length > 0) {
							bits.push(["languages", slangs.slice(0, 4).map(function(lang) {
								return lang[0];
							}).join(", ")]);
						}
						bits.push(["issues", j.open_issues_count]);

						self.getCommits(j, function(weeks, days) {
							if (weeks)
								bits.push(["recent contributions", self.graph(weeks.slice(-14)), 0]);

							finish();
						});
					});
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

					self.getUserLangs(j, function(langs) {
						if (langs) {
							var slangs = self.sortLangs(langs);
							if (slangs.length > 0) {
								bits.push(["languages", slangs.slice(0, 4).map(function(lang) {
									return lang[0];
								}).join(", ")]);
							}
						}

						if (j.type == "User") {
							self.getContribs(j, function(contribs, total, most, longstreak, curstreak) {
								if (contribs) {
									bits.push(["contributions", total]);
									bits.push(["most daily contributions", most]);
									bits.push(["longest streak", longstreak + " days"]);
									bits.push(["current streak", curstreak + " days"]);
									bits.push(["recent contributions", self.graph(contribs.slice(-14)), 0]);
								}

								finish();
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
						bits.push(["fork", (j.fork_of.owner ? j.fork_of.owner.login : "anonymous") + "/" + j.fork_of.id]);
					if (j.description)
						bits.push([, j.description, 0]);
					bits.push([, j.public ? "public" : "private"]);
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

		"web#/github": function(req, qs, body, res) {
			res.end();

			var channels = [];
			if (qs.channels)
				channels = qs.channels.split(",");

			var event = req.headers["X-Github-Event".toLowerCase()];
			var payload = JSON.parse(body);

			switch (event) {
				case "ping":
					var prefix = payload.repository.full_name;
					var bits = [];
					bits.push([, payload.sender.login + " pinged", 0]);
					bits.push(["events", payload.hook.events.join(", ")]);
					bot.plugins.gitio.shorten(payload.repository.html_url, function(shorturl) {
						bits.push([, shorturl, 2]);
						var str = bot.plugins.bits.format(prefix, bits);

						channels.forEach(function(channel) {
							bot.say(channel, str);
						});
					});
					break;

				case "push":
					var branch = payload.ref.replace("refs/heads/", "");

					if (branch == payload.repository.default_branch) {
						payload.commits.reverse();
						payload.commits.forEach(function(commit) {
							if (commit.distinct) {
								var prefix = payload.repository.full_name;
								var bits = [];
								bits.push([commit.author.username + " committed", commit.message.replace(/^([^\r\n]+)[\s\S]*/, "$1")]); // keep only first line
								bot.plugins.gitio.shorten(commit.url, function(shorturl) {
									bits.push([, shorturl, 2]);
									var str = bot.plugins.bits.format(prefix, bits);

									channels.forEach(function(channel) {
										bot.say(channel, str);
									});
								});
							}
						});
					}
					break;

				case "issues":
					switch (payload.action) {
						case "opened":
						case "closed":
						case "reopened":
							var prefix = payload.repository.full_name;
							var bits = [];
							bits.push([payload.sender.login + " " + payload.action + " issue #" + payload.issue.number, payload.issue.title]);
							bot.plugins.gitio.shorten(payload.issue.html_url, function(shorturl) {
								bits.push([, shorturl, 2]);
								var str = bot.plugins.bits.format(prefix, bits);

								channels.forEach(function(channel) {
									bot.say(channel, str);
								});
							});
							break;

						default:
							break;
					}
					break;

				case "pull_request":
					switch (payload.action) {
						case "opened":
						case "closed":
						case "reopened":
						case "synchronize":
							var prefix = payload.repository.full_name;
							var bits = [];

							var action = payload.action;
							if (action == "synchronize")
								action = "updated";
							else if (action == "closed" && payload.pull_request.merged)
								action = "merged";

							bits.push([payload.sender.login + " " + action + " pull request #" + payload.pull_request.number, payload.pull_request.title]);
							bot.plugins.gitio.shorten(payload.pull_request.html_url, function(shorturl) {
								bits.push([, shorturl, 2]);
								var str = bot.plugins.bits.format(prefix, bits);

								channels.forEach(function(channel) {
									bot.say(channel, str);
								});
							});
							break;

						default:
							break;
					}
					break;

				case "fork":
					var prefix = payload.repository.full_name;
					var bits = [];
					bits.push([payload.sender.login + " forked", payload.forkee.full_name]);
					bot.plugins.gitio.shorten(payload.forkee.html_url, function(shorturl) {
						bits.push([, shorturl, 2]);
						var str = bot.plugins.bits.format(prefix, bits);

						channels.forEach(function(channel) {
							bot.say(channel, str);
						});
					});
					break;

				default:
					bot.out.debug("github", [qs, event, payload]);
			}
		}
	};
}

module.exports = GithubPlugin;
