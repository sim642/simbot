function ZNCPlugin(bot) {
	var self = this;
	self.name = "znc";
	self.help = "ZNC plugin";
	self.depend = [];

	self.zncRe = /^([^!\s]+)!([^@\s]+)@znc\.in$/;

	self.events = {
		"message": function(nick, to, text, message) {
			var match = message.prefix.match(self.zncRe);
			if (match) {
				bot.out.log("znc", match[1] + ": " + text);
			}
		}
	};
}

module.exports = ZNCPlugin;
