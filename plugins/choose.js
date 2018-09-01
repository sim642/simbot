var request = require("request");

function ChoosePlugin(bot) {
	var self = this;
	self.name = "choose";
	self.help = "Random chooser plugin";
	self.depend = ["cmd"];

	self.randomOrgApiKey = null;
	self.aggregate = false;
	self.aggregateTimeout = 2 * 1000;
	self.tieBreak = false;

	self.aggregateChannels = {};
	self.aggregateRe = /^(\S+):[\s\u200B]*([^\s\u200B]*)[\s\u200B]*$/; // shoko has ZWSP for some reason...

	self.load = function(data) {
		if (data) {
			self.randomOrgApiKey = data.randomOrgApiKey || null;
			self.aggregate = data.aggregate || false;
			self.aggregateTimeout = data.aggregateTimeout || (2 * 1000);
			self.tieBreak = data.tieBreak || false;
		}
	};

	self.save = function() {
		return {
			randomOrgApiKey: self.randomOrgApiKey,
			aggregate: self.aggregate,
			aggregateTimeout: self.aggregateTimeout,
			tieBreak: self.tieBreak
		};
	};

	self.randoms = {
		"random.org": function(n, callback) {
			request.post({
				url: "https://api.random.org/json-rpc/1/invoke",
				json: true,
				body: {
				    "jsonrpc": "2.0",
					"method": "generateIntegers",
					"params": {
						"apiKey": self.randomOrgApiKey,
						"n": 1,
						"min": 0,
						"max": n - 1,
						"base": 10
					},
					"id": 1
				}
			}, function(err, res, body) {
				if (!err) {
					if (res.statusCode == 200) {
						var i = parseInt(body.result.random.data[0]);
						callback(i);
					}
					else
						bot.out.error("choose", res.statusCode, body);
				}
				else
					bot.out.error("choose", err);
			});
		},

		"ANU": function(n, callback) {
			request("http://qrng.anu.edu.au/form_handler.php?numofsets=1&num_per_set=1&repeats=no&min_num=0&max_num=" + (n - 1) + "&time=" + Date.now(), function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var re = /Set 1: (\d+)/;
					var match = body.match(re);
					if (match) {
						var i = parseInt(match[1]);
						callback(i);
					}
				}
				else
					bot.out.error("choose", err, body);
			});
		}
	};

	self.chooseSimbot = function(nick, to, choices) {
		if (choices.length == 1 && choices[0] == "") {
			bot.say(to, "Nothing to choose from");
		}
		else if (choices.length == 1) {
			for (var name in self.randoms)
				bot.say(to, name + " chose '\x02" + choices[0] + "\x02'");
		}
		else {
			for (var name in self.randoms) {
				(function(name) {
					self.randoms[name](choices.length, function(i) {
						bot.say(to, name + " chose '\x02" + choices[i] + "\x02'");
					});
				})(name);
			}
		}
	};

	self.chooseCommon = function(nick, to, choices) {
		if (self.aggregate)
			self.aggregateStart(nick, to, choices);

		if (choices.length == 1) {
			for (var name in self.randoms) {
				bot.say(to, nick + ": " + choices[0]);
				self.aggregateCount("simbot (" + name + ")", nick, to, choices[0]);
			}
		}
		else {
			for (var name in self.randoms) {
				(function(name) {
					self.randoms[name](choices.length, function(i) {
						bot.say(to, nick + ": " + choices[i]);
						self.aggregateCount("simbot (" + name + ")", nick, to, choices[i]);
					});
				})(name);
			}
		}
	};

	self.sortCounts = function(counts) {
		var scounts = [];
		for (var choice in counts) {
			scounts.push([choice, counts[choice]]);
		}

		scounts.sort(function(lhs, rhs) {
			return rhs[1] - lhs[1];
		});
		return scounts;
	};

	self.aggregateStart = function(nick, to, choices) {
		if (!(to in self.aggregateChannels))
			self.aggregateChannels[to] = [];

		var counts = {};
		for (var i = 0; i < choices.length; i++)
			counts[choices[i]] = 0;

		var data = {
			nick: nick,
			choices: choices,
			counts: counts,
			bots: {},
			timeout: null
		};

		data.end = function() {
			self.aggregateChannels[to].splice(self.aggregateChannels[to].indexOf(data), 1); // remove data
			if (self.aggregateChannels[to].length == 0)
				delete self.aggregateChannels[to];

			var scounts = self.sortCounts(counts);

			if (self.tieBreak) {
				var tieChoices = scounts.filter(function(scount, i) {
					return scount[1] == scounts[0][1];
				}).map(function(scount) {
					return scount[0];
				});
				if (tieChoices.length > 1) {
					var breakI = Math.floor(Math.random() * tieChoices.length);
					var breakChoice = tieChoices[breakI];

					bot.say(to, nick + ": " + breakChoice);
					data.counts[breakChoice]++;
					data.bots["simbot (tiebreak)"] = breakChoice;

					scounts = self.sortCounts(counts);
				}
			}

			var str = scounts.map(function(scount, i) {
				var wrap = i == 0 ? "\x02" : "";
				return wrap + scount[0] + " (" + scount[1] + ")" + wrap;
			}).join(", ");
			bot.say(to, nick + ": " + str);

		};

		data.count = function(botNick, choice) {
			data.counts[choice]++;
			data.bots[botNick] = choice;

			clearTimeout(data.timeout);
			data.timeout = setTimeout(data.end, self.aggregateTimeout);
		};

		self.aggregateChannels[to].push(data);
		data.timeout = setTimeout(data.end, self.aggregateTimeout);
	};

	self.aggregateCount = function(botNick, nick, to, choice) {
		if (to in self.aggregateChannels) {
			for (var i = 0; i < self.aggregateChannels[to].length; i++) {
				var data = self.aggregateChannels[to][i];

				if ((data.nick == nick) && (choice in data.counts) && !(botNick in data.bots)) {
					data.count(botNick, choice);
					break;
				}
			}
		}
	};

	self.events = {
		"cmd#choose": function(nick, to, args, message) {
			var choices = args[0].split(",");
			for (var i = 0; i < choices.length; i++)
				choices[i] = choices[i].trim();

			var choose = message.cmdChar != "." ? self.chooseSimbot : self.chooseCommon;
			choose(nick, to, choices);
		},

		"message": function(botNick, to, text, message) {
			if (self.aggregate) {
				var m = text.match(self.aggregateRe);
				if (m) {
					var nick = m[1];
					var choice = m[2];

					self.aggregateCount(botNick, nick, to, choice);
				}
			}
		}
	};
}

module.exports = ChoosePlugin;
