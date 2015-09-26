function GreetPlugin(bot) {
	var self = this;
	self.name = "greet";
	self.help = "Greet plugin";
	
	self.midre = /\b(yo(?:[\s-]yo)*|h[ea]l{2,}o+|h[ae]+[jiy]+[ao]*|hi+(?:-?y[ao]+)?|howdy|hola|bonjour|(?:what(?:\')?s\s|s)up|fuck(?:ing|\soff|\syou(?:\stoo|2)?)?)\b/;
	self.bdayRe = /happy\s+b(?:irth)?day[\s,]+(\w+)/i;

	self.events = {
		"message": function(nick, to, text) {
			var re = new RegExp("(\\b" + bot.nick + "[\\s,:]+)?" + self.midre.source + "(\\s+" + bot.nick + "\\b)?", "i");
			var m = text.match(re);
			
			
			/*if (m && (m[1] !== undefined || m[3] !== undefined)) {
				bot.say(to, m[2] + " " + nick);
			}*/

			if (m) {
				if (m[1] !== undefined)
					bot.say(to, m[1].replace(new RegExp(bot.nick, "i"), nick) + m[2]);
				else if (m[3] !== undefined)
					bot.say(to, m[2] + m[3].replace(new RegExp(bot.nick, "i"), nick));
			}
		},

		"message#": function(nick, to, text) {
			var m = text.match(self.bdayRe);
			if (m) {
				bot.say(to, m[0]);
			}
		},

		"action": function(nick, to, text, message) { // undocumented event, message is undefined for no reason
			var text2 = text.replace(new RegExp(bot.nick, "i"), nick);
			if (text != text2) { // something was replaced, simbot was mentioned
				bot.action(to, text2);
			}
		}
	};
}

module.exports = GreetPlugin;
