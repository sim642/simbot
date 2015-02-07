var request = require("request");
var dom = require("xmldom").DOMParser;
var xpath = require("xpath");

function GithubPlugin(bot) {
	var self = this;
	self.name = "github";
	self.help = "Github stats plugin";
	self.depend = ["cmd"];

	self.userRe = /^\w[\w-]+$/;
	self.repoRe = /^(\w[\w-]+)\/(\w[\w-]+)$/;

	self.request = request.defaults({headers: {"User-Agent": "simbot GitHub"}});

	self.formatPair = function(key, value, data) {
		if (value !== undefined)
			return key + ": \x02" + value + "\x02";
		else {
			var wrap = ["", "\x02", "\x1F"][data || 0];
			return wrap + key + wrap;
		}
	};

	self.events = {
		"cmd#github": function(nick, to, args) {
			var arg = args[1];

			var prefix = "";
			var bits = [];

			var output = function() {
				var str = "\x02" + prefix + ": \x02";
				for (var i = 0; i < bits.length; i++) {
					str += self.formatPair(bits[i][0], bits[i][1], bits[i][2]);
					if (i != bits.length - 1)
						str += ", ";
				}

				bot.say(to, str);
			};

			if (arg.match(self.repoRe)) { // repo
				self.request("https://api.github.com/repos/" + arg, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);
						prefix = j.full_name;
						if (j.description)
							bits.push([j.description, , 0]);
						bits.push(["stars", j.stargazers_count]);
						bits.push(["watch", j.watchers_count]);
						bits.push(["forks", j.forks_count]);
						if (j.language)
							bits.push(["language", j.language]);
						bits.push(["issues", j.open_issues_count]);
						bits.push([j.html_url, , 2]);

						output();
					}
				});
			}
			else if (arg.match(self.userRe)) { // user/org
				self.request("https://api.github.com/users/" + arg, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var j = JSON.parse(body);
						prefix = j.login;
						bits.push([j.type, , 1]);
						if (j.bio)
							bits.push([j.bio, , 0]);
						bits.push(["repos", j.public_repos]);
						bits.push(["followers", j.followers]);
						bits.push(["following", j.following]);

						var finish = function() {
							bits.push([j.html_url, , 2]);
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
									var total = contribs[0][1];
									var most = 0;
									for (var i = 1; i < contribs.length; i++) {
										total += contribs[i][1];

										if (contribs[i][1] > 0) {
											if (contribs[i - 1][1] > 0)
												contribs[i][2] = contribs[i - 1][2] + 1;
											else
												contribs[i][2] = 1;
										}

										longstreak = Math.max(longstreak, contribs[i][2]);
										most = Math.max(most, contribs[i][1]);
									}
									var curstreak = Math.max(contribs[contribs.length - 2][2], contribs[contribs.length - 1][2]);

									bits.push(["commits", total]);
									bits.push(["most daily contributions", most]);
									bits.push(["longest streak", longstreak + " days"]);
									bits.push(["current streak", curstreak + " days"]);

									finish();
								}
							});
						}
						else
							finish();
					}
				});
			}
			else {
				bot.say(to, nick + ": invalid argument '\x02" + arg + "\x02'");
			}
		}
	}
}

module.exports = GithubPlugin;
