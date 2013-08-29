function NickServPlugin(bot) {
	var self = this;
	self.name = "nickserv";
	self.help = "NickServ plugin";
	self.depend = [];

	self.password = null;

	self.load = function(data) {
		self.password = data.password;
	};


	self.events = {
		"registered": function() {
			bot.say("NickServ", "IDENTIFY " + self.password);
		}
	}
}

module.exports = NickServPlugin;
