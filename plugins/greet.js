function GreetPlugin(bot) {
	var self = this;
	self.name = "greet";
	self.help = "Greet plugin";
	
	self.midre = /(yo(?:[\s-]yo)*|h[ea]l{2,}o+|h[ae]+[jiy]+[aol]*|hi+(?:-?y[ao]+)?|howdy|hola|bonjour|(?:what(?:\')?s)?\sup|fuck(?:ing|\soff|\syou(?:\stoo|2)?)?)/;

	self.events = {
		"message": function(nick, to, text) {
			var re = new RegExp("(\\b" + bot.nick + "[\\s,:]+)?" + self.midre.source + "(\\s+" + bot.nick + "\\b)?", "i");
			var m = text.match(re);
			
			
			/*if (m && (m[1] !== undefined || m[3] !== undefined)) {
				bot.say(to, m[2] + " " + nick);
			}*/

			if (m) {
				if (m[1] !== undefined)
					bot.say(to, m[1].replace(bot.nick, nick) + m[2]);
				else if (m[3] !== undefined)
					bot.say(to, m[2] + m[3].replace(bot.nick, nick));
			}
		}
	}
}

module.exports = GreetPlugin;
