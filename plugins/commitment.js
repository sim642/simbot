function CommitmentPlugin(bot) {
	var self = this;
	self.name = "commitment";
	self.help = "WhatTheCommit plugin";
	self.depend = ["cmd", "github"];

	self.messages = null;
	self.update = function() {
		bot.plugins.github.request("https://raw.githubusercontent.com/ngerakines/commitment/master/commit_messages.txt", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				self.messages = body.split(/\r?\n/).filter(function(elem) {
					return elem.trim() !== "";
				});
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
		"cmd#whatthecommit": function(nick, to, args) {
			var i = Math.floor(Math.random() * self.messages.length);
			bot.say(to, nick + ": " + self.messages[i]);
		}
	};
}

module.exports = CommitmentPlugin;
