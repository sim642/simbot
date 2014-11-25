var request = require("request");

function RantPlugin(bot) {
	var self = this;
	self.name = "rant";
	self.help = "berkin.me rantbox plugin";
	self.depend = ["cmd"];

	self.events = {
		"cmd#rant": function(nick, to, args) {
			request({url: "http://berkin.me/probox/run", method: "POST", form: {nsfw: true, code: args[0]}}, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					var data = JSON.parse(body);
					bot.say(to, nick + ": " + data.result);
				}
			});
		}
	}
}

module.exports = RantPlugin;
