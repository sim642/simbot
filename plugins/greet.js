function GreetPlugin(bot) {
	var self = this;
	self.name = 'greet';
	self.help = 'Greet plugin';
	
	self.re = /(yo(?:\syo)*|h[ea]l{2,}o+|h[ae]+[jiy]+|hi+(?:-ya)?|howdy|hola|fuck(?:ing|\soff|\syou(?:\stoo|2)?)?)\s([^!\s]+)/i

	self.events = {
		'message': function(nick, to, text) {
			var m = text.match(self.re);
			if (m && m[2] == bot.nick) {
				bot.say(to, m[1] + " " + nick);
			}
		}
	}
}

module.exports = GreetPlugin;
