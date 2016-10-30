var request = require("request");

function PolitenessPlugin(bot) {
	var self = this;
	self.name = "politeness";
	self.help = "FoxType Labs politeness plugin";
	self.depend = ["cmd"];

	self.politeness = function(text, callback) {
		request.post({
			url: "https://elb-classifier.foxtype.com/v1/all/politeness02",
			body: {
				"text": text,
			},
			json: true
		}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				callback(body);
			}
			else {
				bot.out.error("politeness", err, res, body);
			}
		});
	};

	self.overall = function(text, callback) {
		self.politeness(text, function(body) {
			callback(body.overall.politeness.scoreBinProb);
		});
	};

	self.events = {
		"cmd#politeness": function(nick, to, args) {
			self.overall(args[0], function(politeness) {
				bot.say(to, nick + ": " + (politeness * 100) + "%");
			});
		}
	};
}

module.exports = PolitenessPlugin;
