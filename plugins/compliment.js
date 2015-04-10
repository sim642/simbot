var request = require("request");

function ComplimentPlugin(bot) {
	var self = this;
	self.name = "compliment";
	self.help = "Emergency Compliment plugin";
	self.depend = ["cmd"];

	self.compliments = null;
	self.update = function() {
		request("https://spreadsheets.google.com/feeds/list/1eEa2ra2yHBXVZ_ctH4J15tFSGEu-VTSunsrvaCAV598/od6/public/values?alt=json", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				self.compliments = JSON.parse(body).feed.entry;
			}
		});
	};
	self.interval = null;

	self.enable = function() {
		self.update();
		self.interval = setInterval(self.update, 60 * 60 * 1000);
	};

	self.disable = function() {
		clearInterval(self.interval);
	};

	self.events = {
		"cmd#compliment": function(nick, to, args) {
			var i = Math.floor(Math.random() * self.compliments.length);
			var compliment = self.compliments[i];
			bot.say(to, (args[1] || nick) + ": " + compliment["gsx$compliments"]["$t"]);
		}
	};
}

module.exports = ComplimentPlugin;
