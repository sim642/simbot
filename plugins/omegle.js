var request = require("request");

function OmeglePlugin(bot) {
	var self = this;
	self.name = "omegle";
	self.help = "Omegle plugin";
	self.depend = ["cmd"];

	self.chats = {};

	self.disable = function() {
		for (var to in self.chats) {
			self.chats[to].disconnect();
		}
		self.chats = {};
	};

	self.events = {
		"cmd#omegle": function(nick, to, args) {
			if (!(to in self.chats))
			{
				bot.notice(to, "omegle started");
				request.post({url: "http://front1.omegle.com/start", form: {"rcs": 1}}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						var data = JSON.parse(body);
						var interval = setInterval(function() {
							request.post({url: "http://front1.omegle.com/events", form: {"id": data}}, function(err, res, body) {
								if (!err && res.statusCode == 200) {
									var eventdata = JSON.parse(body);
									if (eventdata != null) {
										for (var i = 0; i < eventdata.length; i++) {
											switch (eventdata[i][0]) {
											case "waiting":
												bot.notice(to, "waiting for stranger");
												break;
											case "connected":
												bot.notice(to, "stranger connected");
												break;
											case "typing":
												bot.notice(to, "typing...");
												break;
											case "stoppedTyping": 
												bot.notice(to, "stopped typing");
												break;
											case "gotMessage":
												bot.say(to, eventdata[i][1]);
												break;
											case "strangerDisconnected":
												bot.notice(to, "stranger disconnected");
												self.chats[to].disconnect();
												delete self.chats[to];
												break;
											}
										}
									}
								}
							});
						}, 1000);
						var disconnect = function() {
							request.post({url: "http://front1.omegle.com/disconnect", form: {"id": data}});
							clearInterval(interval);
						};
						self.chats[to] = {"id": data, "interval": interval, "disconnect": disconnect};
					}
				});
			}
			else
				bot.notice(to, "omegle already started");
		},

		"cmd#unomegle": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].disconnect();
				delete self.chats[to];
				bot.notice(to, "omegle stopped");
			}
			else
				bot.notice(to, "omegle not started");
		},

		"cmd#reomegle": function(nick, to, args, message) {
			if (to in self.chats) {
				bot.emit("cmd#unomegle", nick, to, args, message);
				bot.emit("cmd#omegle", nick, to, args, message);
			}
		},

		"nocmd": function(nick, to, text) {
			if (to in self.chats)
			{
				request.post({url: "http://front1.omegle.com/send", form: {"id": self.chats[to].id, "msg": text}});
			}
		}
	}
}

module.exports = OmeglePlugin;
