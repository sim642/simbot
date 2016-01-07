var request = require("request");

function ChoosePlugin(bot) {
	var self = this;
	self.name = "choose";
	self.help = "Random chooser plugin";
	self.depend = ["cmd"];

	self.randoms = {
		"random.org": function(n, callback) {
			request("http://www.random.org/integers/?num=1&min=0&max=" + (n - 1) + "&col=1&base=10&format=plain&rnd=new", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var i = parseInt(body.toString().trim());
					callback(i);
				}
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
			});
		}
	};

	self.events = {
		"cmd#choose": function(nick, to, args) {
			var choices = args[0].split(",");
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
		},

		"message": function(nick, to, text) {
			var dotRe = /^\.choose\s(.*)/;
			var match = text.match(dotRe);
			if (match && match[1].split(",").length > 1) {
				var choices = match[1].split(",");
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
