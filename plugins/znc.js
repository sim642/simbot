function ZNCPlugin(bot) {
	var self = this;
	self.name = "znc";
	self.help = "ZNC plugin";
	self.depend = ["cmd", "auth"];

	self.zncRe = /^([^!\s]+)!([^@\s]+)@znc\.in$/;

	self.events = {
		"message": function(nick, to, text, message) {
			var match = message.prefix.match(self.zncRe);
			if (match) {
				bot.out.log("znc", match[1] + ": " + text);
			}
		},

		"cmd#znc": bot.plugins.auth.proxyEvent(10, function(nick, to, args) {
			bot.say("*status", args[0]);
		})
	};
}

module.exports = ZNCPlugin;
