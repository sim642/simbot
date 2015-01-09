var request = require("request");

function OeisPlugin(bot) {
	var self = this;
	self.name = "oeis";
	self.help = "Online Encyclopedia of Integer Sequences lookup plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#oeis": function(nick, to, args) {
			var search = args[1];
			request("http://oeis.org/search?fmt=text&q=" + search, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = {};
					var order = [];
					body.replace(/^%([A-Z]) (A\d{6}) (.*)$/mg, function(match, type, id, content) {
						if (data[id] === undefined) {
							data[id] = {};
							order.push(id);
						}
						if (data[id][type] === undefined)
							data[id][type] = [];

						data[id][type].push(content);
						return match; // don't actually edit body
					});

					//bot.out.debug("oeis", data);
					var d = data[order[0]];
					if (d)
						bot.say(to, nick + ": OEIS " + order[0] + " - \x02" + d["N"][0] + "\x02: " + d["S"][0] + " (\x1fhttp://oeis.org/" + order[0] + "\x1f)");
					else
						bot.say(to, nick + ": couldn't find such entry from OEIS");
				}
			});
		}
	}
}

module.exports = OeisPlugin;
