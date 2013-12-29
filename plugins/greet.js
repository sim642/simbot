function GreetPlugin(bot) {
	var self = this;
	self.name = "greet";
	self.help = "Greet plugin";
	
	self.re = /(yo(?:[\s-]yo)*|h[ea]l{2,}o+|h[ae]+[jiy]+|h[ei]+(?:-ya+)?|howdy|hola|bonjour|(?:what(?:\')?s)?\sup|fuck(?:ing|\soff|\syou(?:\stoo|2)?)?)\s([^!\s]+)/i

	self.events = {
		"message": function(nick, to, text) {
			var m = text.match(self.re);
			if (m && m[2].toLowerCase() == bot.nick.toLowerCase()) {
				bot.say(to, m[1] + " " + nick);
			}
		}
	}
}

module.exports = GreetPlugin;
