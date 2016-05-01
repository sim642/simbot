var request = require("request");

function ChoosePlugin(bot) {
	var self = this;
	self.name = "choose";
	self.help = "Random chooser plugin";
	self.depend = ["cmd"];

	self.randomOrgApiKey = null;

	self.load = function(data) {
		if (data) {
			self.randomOrgApiKey = data.randomOrgApiKey || null;
		}
	};

	self.save = function() {
		return {
			randomOrgApiKey: self.randomOrgApiKey
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

	self.events = {
		"cmd#choose": function(nick, to, args, message) {
			var choices = args[0].split(",");

			if (message.cmdChar != ".") {
				if (choices.length == 1 && choices[0].trim() == "") {
					bot.say(to, "Nothing to choose from");
				}
				else if (choices.length == 1) {
					for (var name in self.randoms)
						bot.say(to, name + " chose '\x02" + choices[0].trim() + "\x02'");
				}
				else {
					for (var name in self.randoms) {
						(function(name) {
							self.randoms[name](choices.length, function(i) {
								bot.say(to, name + " chose '\x02" + choices[i].trim() + "\x02'");
							});
						})(name);
					}
				}
			}
			else {
				if (choices.length == 1) {
					for (var name in self.randoms)
						bot.say(to, nick + ": " + choices[0].trim());
				}
				else {
					for (var name in self.randoms) {
						(function(name) {
							self.randoms[name](choices.length, function(i) {
								bot.say(to, nick + ": " + choices[i].trim());
							});
						})(name);
					}
				}
			}
		}
	};
}

module.exports = ChoosePlugin;
