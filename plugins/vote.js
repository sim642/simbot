function VotePlugin(bot) {
	var self = this;
	self.name = "vote";
	self.help = "Vote plugin";
	self.depend = ["cmd", "auth"];

	self.votes = {};
	self.regex = /^\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)[\s,:]*(\+\+||--)\s*$/i

	self.voteend = function(to) {
		var vote = self.votes[to];
		bot.say(to, "Vote by " + vote.by + " over: " + vote.question);
		bot.say(to, "Agreed: " + vote.agree.length + ", disagreed: " + vote.disagree.length);
		clearTimeout(vote.timeout);
		delete self.votes[to];
	};

	self.activity = function(to) {
		var vote = self.votes[to];
		if (vote.timeout !== null)
			clearTimeout(vote.timeout);

		vote.timeout = setTimeout(function() {
			self.voteend(to);
		}, 5 * 60 * 1000);
	};

	self.disable = function() {
		for (var to in self.votes) {
			self.voteend(to);
		}
	};

	self.events = {
		"cmd#votestart": function(nick, to, args) {
			if (!(to in self.votes)) {
				if (args[0] == "") {
					bot.notice(nick, "Vote must have a question");
					return;
				}

				var vote = self.votes[to] = {
					by: nick,
					question: args[0],
					agree: [],
					disagree: [],
					timeout: null
				};
				bot.say(to, "Vote by " + vote.by + " started: " + vote.question);
				bot.say(to, "Write '" + bot.nick + ": ++' to agree, '" + bot.nick + ": --' to disagree");
				self.activity(to);
			}
			else {
				bot.notice(nick, "Already ongoing vote in " + to + " by " + self.votes[to].by);
			}
		},

		"cmd#voteend": function(nick, to, args, message) {
			if (to in self.votes) {
				if (nick == self.votes[to].by)
					self.voteend(to);
				else {
					bot.plugins.auth.check(5, message, function(check) {
						if (check)
							self.voteend(to);
						else
							bot.notice(nick, "You can only stop your own vote");
					});
				}
			}
			else {
				bot.notice(nick, "No ongoing vote in " + to);
			}
		},

		"cmd#vote": function(nick, to) {
			if (to in self.votes) {
				var vote = self.votes[to];
				bot.say(to, "Vote by " + vote.by + ": " + vote.question);
				bot.say(to, "Agreed: " + vote.agree.length + ", disagreed: " + vote.disagree.length);
			}
		},

		"message#": function(nick, to, text) {
			if (to in self.votes) {
				var vote = self.votes[to];
				var m = text.match(self.regex);
				if (m && (m[1].toLowerCase() == bot.nick.toLowerCase())) {
					if (m[2] == "++") {
						var i = vote.disagree.indexOf(nick);
						if (i != -1)
							vote.disagree.splice(i, 1);
						if (vote.agree.indexOf(nick) == -1) {
							vote.agree.push(nick);
							bot.notice(nick, "vote for '" + vote.question + "' in " + to + " counted");
						}
					}
					else if (m[2] == "--") {
						var i = vote.agree.indexOf(nick);
						if (i != -1)
							vote.agree.splice(i, 1);
						if (vote.disagree.indexOf(nick) == -1) {
							vote.disagree.push(nick);
							bot.notice(nick, "vote against '" + vote.question + "' in " + to + " counted");
						}
					}
					self.activity(to);
				}
			}
		},
	}
}

module.exports = VotePlugin;
