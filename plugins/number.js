function NumberPlugin(bot) {
	var self = this;
	self.name = "number";
	self.help = "Number plugin";
	self.depend = ["cmd", "auth"];

	self.number = 0;

	self.load = function(data) {
		if (data)
			self.number = data.number;
	};

	self.save = function() {
		return {number: self.number};
	};

	self.events = {
		"cmd#resetnumber": bot.plugins.auth.proxy(6, function(nick, to, args) {
			self.number = 0;
			bot.say(to, "The number has been reset to " + self.number);
		}),

		"cmd#add": function(nick, to, args) {
			self.number++;
			bot.say(to, "The number has been incremented to " + self.number);
		},

		"cmd#subtract": function(nick, to, args) {
			self.number--;
			bot.say(to, "The number has been decremented to " + self.number);
		},

		"cmd#multiply": function(nick, to, args) {
			self.number *= 2;
			bot.say(to, "The number has been doubled to " + self.number);
		},

		"cmd#divide": function(nick, to, args) {
			self.number /= 2;
			bot.say(to, "The number has been halved to " + self.number);
		},

		"cmd#square": function(nick, to, args) {
			self.number = Math.pow(self.number, 2);
			bot.say(to, "The number has been squared to " + self.number);
		},

		"cmd#sqrt": function(nick, to, args) {
			self.number = Math.sqrt(self.number);
			bot.say(to, "The number has been square rooted to " + self.number);
		},

		"cmd#negate": function(nick, to, args) {
			self.number *= -1;
			bot.say(to, "The number has been negated to " + self.number);
		},

		"cmd#invert": function(nick, to, args) {
			self.number = 1 / self.number;
			bot.say(to, "The number has been inverted to " + self.number);
		},
	}
}

module.exports = NumberPlugin;
