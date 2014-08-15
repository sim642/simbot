var request = require("request");

function ChoosePlugin(bot) {
	var self = this;
	self.name = "choose";
	self.help = "Random chooser plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#choose": function(nick, to, args) {
			var choices = args[0].split(",");
			request("http://www.random.org/integers/?num=1&min=0&max=" + (choices.length - 1) + "&col=1&base=10&format=plain&rnd=new", function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var i = parseInt(body.toString().trim());
					bot.say(to, "random.org chose '\x02" + choices[i].trim() + "\x02'");
				}
			});
		}
	}
}

module.exports = ChoosePlugin;
