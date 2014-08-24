var request = require("request");

function ChoosePlugin(bot) {
	var self = this;
	self.name = "choose";
	self.help = "Random chooser plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#choose": function(nick, to, args) {
			var choices = args[0].split(",");
			if (choices.length == 1 && choices[0].trim() == "") {
				bot.say(to, "Nothing to choose from");
			}
			else if (choices.length == 1) {
				bot.say(to, "random.org chose '\x02" + choices[0].trim() + "\x02'");
				bot.say(to, "ANU chose '\x02" + choices[0].trim() + "\x02'");
			}
			else {
				request("http://www.random.org/integers/?num=1&min=0&max=" + (choices.length - 1) + "&col=1&base=10&format=plain&rnd=new", function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var i = parseInt(body.toString().trim());
						bot.say(to, "random.org chose '\x02" + choices[i].trim() + "\x02'");
					}
				});

				request("http://qrng.anu.edu.au/form_handler.php?numofsets=1&num_per_set=1&repeats=no&min_num=0&max_num=" + (choices.length - 1) + "&time=" + (new Date()).getTime(), function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var re = /Set 1: (\d+)/;
						var match = body.match(re);
						if (match) {
							var i = parseInt(match[1]);
							bot.say(to, "ANU chose '\x02" + choices[i].trim() + "\x02'");
						}
					}
				});
			}
		},

		"message": function(nick, to, text) {
			var dotRe = /^\.choose(.*)/;
			var match = text.match(dotRe);
			if (match && match[1].trim() != "") {
				bot.emit("cmd#choose", nick, to, [match[1]]);
			}
		}
	}
}

module.exports = ChoosePlugin;
