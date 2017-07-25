var request = require("request");
var async = require("async");

function BitbucketPlugin(bot) {
	var self = this;
	self.name = "bitbucket";
	self.help = "Bitbucket stats plugin";
	self.depend = ["cmd", "ignore", "bits", "util"];

	self.userRe = /^\w[\w-]*$/;
	self.repoRe = /^(\w[\w-]*)\/(\w[\w-]*)$/;

	self.request = request.defaults({headers: {"User-Agent": "simbot Bitbucket"}});

	self.users = {};

	self.urlRe = /(?:https?:\/\/|\s|^)(?:www\.)?bitbucket\.org\/(\w[\w-]+(?:\/\w[\w-]+)?)(?=\s|$)/;
	self.channels = [];
	self.ignores = [];

	self.load = function(data) {
		if (data && data.users)
			self.users = data.users;
		if (data && data.channels)
			self.channels = data.channels;
		if (data && data.ignores)
			self.ignores = data.ignores;
	};

	self.save = function() {
		return {
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

	self.getSize = function(href, callback) {
		self.request(href, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var j = JSON.parse(body);
				callback(null, j.size);
			}
			else
				callback(err);
		});
	};

	self.getSizes = function(map, obj, callback) {
		async.mapValues(map, function(value, key, callback) {
			self.getSize(obj.links.self.href + "/" + value, callback);
		}, function(err, counts) {
			if (!err)
				callback(counts);
			else {
				bot.out.error("bitbucket", err);
				callback({});
			}
		});
	};

	self.getPaginated = function(href, callback) {
		var ret = [];

		async.doWhilst(function(callback) {
			self.request(href, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					ret = ret.concat(j.values);
					callback(null, j);
				}
				else {
					bot.out.error("bitbucket", err, body);
					callback(err);
				}
			});
		}, function(result) {
			if (result.next) {
				href = result.next;
				return true;
			}
			else
				return false;
		}, function(err) {
			callback(!err ? ret : null);
		});
	};

	self.getUserLangs = function(user, callback) {
		self.getPaginated(user.links.repositories.href, function(repos) {
			if (repos) {
				var langs = {};
				repos.forEach(function(repo) {
					var lang = repo.language;
					if (!(lang in langs))
						langs[lang] = 0;
					langs[lang]++;
				});

				callback(langs);
			}
			else
				callback(null);
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

	self.bitbucket = function(arg, noError, callback) {
		var realarg = bot.plugins.util.getKeyByValue(self.users, arg) || arg;

		var prefix = "";
		var bits = [];

		var output = function() {
			callback(bot.plugins.bits.format(prefix, bits));
		};

		if (arg.match(self.repoRe)) { // repo
			self.request("https://api.bitbucket.org/2.0/repositories/" + arg, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var j = JSON.parse(body);
					prefix = j.full_name + (realarg.toLowerCase() != j.full_name.toLowerCase() ? " (" + realarg + ")" : "");
					if (j.parent)
						bits.push(["fork", j.parent.full_name]);
					if (j.name)
						bits.push([, j.name]);
					if (j.description)
						bits.push([, j.description, 0]);
					if (j.website)
						bits.push([, j.website, 2]);

					self.getSizes({
						watch: "watchers",
						forks: "forks",
						issues: "issues"
					}, j, function(counts) {
						if (counts.watch)
							bits.push(["watch", counts.watch]);
						if (counts.forks)
							bits.push(["forks", counts.forks]);

						if (j.language)
							bits.push(["language", j.language]);

						if (counts.issues)
							bits.push(["issues", counts.issues]);

						var finish = function() {
							bits.push([, j.links.html.href, 2]);
							output();
						};

						/*self.getCommits(j, function(weeks, days) {
							if (weeks)
								bits.push(["recent contributions", self.graph(weeks.slice(-14)), 0]);

							finish();
						});*/
						finish();
					});
				}
				else if (!err && res.statusCode == 404) {
					prefix = arg;
					bits.push([, "repo not found", 0]);

					if (!noError)
						output();
				}
				else
					bot.out.error("bitbucket", err, body);
			});
		}
		else if (arg.match(self.userRe)) { // user/team
			var parse = function(j) {
				prefix = j.username + (realarg.toLowerCase() != j.username.toLowerCase() ? " (" + realarg + ")" : "");
				bits.push([, j.type]);
				if (j.display_name)
					bits.push([, j.display_name]);
				if (j.location)
					bits.push(["location", j.location]);
				if (j.website)
					bits.push([, j.website, 2]);

				self.getSizes({
					repos: "repositories"
				}, j, function(counts) {
					if (counts.repos)
						bits.push(["repos", counts.repos]);

					var finish = function() {
						bits.push([, j.links.html.href, 2]);
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

						/*if (j.type == "User") {
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
							finish();*/
						finish();
					});
				});

			};

			var parse404 = function() {
				prefix = arg;
				bits.push([, "user/team not found", 0]);

				if (!noError)
					output();
			};

			self.request("https://api.bitbucket.org/2.0/users/" + arg, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					parse(JSON.parse(body));
				}
				else if (!err && res.statusCode == 404) {
					var j = JSON.parse(body);

					if (j.type == "error" && j.error.message.indexOf("team account") !== -1) {
						self.request("https://api.bitbucket.org/2.0/teams/" + arg, function(err, res, body) {
							if (!err && res.statusCode == 200) {
								parse(JSON.parse(body));
							}
							else if (!err && res.statusCode == 404) {
								parse404();
							}
							else
								bot.out.error("bitbucket", err, body);
						});
					}
					else {
						parse404();
					}
				}
				else
					bot.out.error("bitbucket", err, body);
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
		self.bitbucket(m[1], noError, callback);
	};

	self.events = {
		"cmd#bitbucket": function(nick, to, args) {
			var realarg = args[1] || nick;
			var arg = self.parseuser(realarg.toLowerCase());

			self.bitbucket(arg, false, function(str) {
				bot.say(to, str);
			});
		},

		"cmd#setbitbucket": function(nick, to, args) {
			bot.plugins.nickserv.nickIdentified(nick, function(identified) {
				if (identified) {
					if (args[1] !== undefined) {
						self.users[nick.toLowerCase()] = args[1];
						bot.notice(nick, "bitbucket set to " + args[1]);
					}
					else {
						delete self.users[nick.toLowerCase()];
						bot.notice(nick, "bitbucket unset");
					}
				}
				else
					bot.notice(nick, "must be identified for this nick to set bitbucket");
			});
		},

		"message": function(nick, to, text, message) {
			if ((self.channels.indexOf(to) != -1) && !bot.plugins.ignore.ignored(self.ignores, message)) {
				var m = text.match(self.urlRe);
				if (m) {
					bot.out.log("bitbucket", nick + " in " + to + ": " + m[0]);
					self.lookup(m, true, function(str) {
						bot.say(to, str);
					});
				}
			}
		},

		"pm": function(nick, text) {
			var m = text.match(self.urlRe);
			if (m) {
				bot.out.log("bitbucket", nick + " in PM: " + m[0]);
				self.lookup(m, true, function(str) {
					bot.say(nick, str);
				});
			}
		}
	};
}

module.exports = BitbucketPlugin;
