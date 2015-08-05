function AgePlugin(bot) {
	var self = this;
	self.name = "age";
	self.help = "Age calculator plugin";
	self.depend = ["cmd", "date"];

	self.events = {
		"cmd#age": function(nick, to, args) {
			var birth = bot.plugins.date.toUTC(new Date(args[0]));
			var years = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.24);
			bot.say(to, nick + " is " + bot.plugins.date.printDur(bot.plugins.date.toUTC(new Date(args[0])), "second") + " (" + years.toFixed(3) + " years) old in UTC");
		},

		"wit#age": function(nick, to, ents, conf) {
			if (ents.datetime) {
				var birth = bot.plugins.date.toUTC(new Date(ents.datetime[0].value));
				var years = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.24);
				bot.say(to, nick + " is " + bot.plugins.date.printDur(bot.plugins.date.toUTC(new Date(ents.datetime[0].value)), "second") + " (" + years.toFixed(3) + " years) old in UTC");
			}
		}
	};

}

module.exports = AgePlugin;

