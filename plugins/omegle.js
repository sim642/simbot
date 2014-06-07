var request = require("request");

function OmeglePlugin(bot) {
	var self = this;
	self.name = "omegle";
	self.help = "Omegle plugin";
	self.depend = ["cmd"];

	self.regex = /^(\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)\s*[,:]|>)\s*(.*)$/i

	self.chats = {};

	self.disable = function() {
		for (var to in self.chats) {
			self.chats[to].hardDisconnect();
		}
		self.chats = {};
	};

	self.start = function(to) {
		var server = "http://front1.omegle.com/";
		request.post({url: server + "start", form: {"rcs": 1}}, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);
				var interval = setInterval(function() {
					request.post({url: server + "events", form: {"id": data}}, function(err, res, body) {
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
										self.chats[to].softDisconnect();
										break;
									}
								}
							}
						}
					});
				}, 1000);
				var hardDisconnect = function() {
					request.post({url: server + "disconnect", form: {"id": data}});
					clearInterval(interval);
				};
				var softDisconnect = function() {
					hardDisconnect();
					if (self.chats[to].auto) {
						self.start(to);
					}
					else {
						delete self.chats[to];
					}
				};

				var auto = self.chats[to] === undefined ? false : self.chats[to].auto;
				self.chats[to] = {"server": server, "id": data, "interval": interval, "hardDisconnect": hardDisconnect, "softDisconnect": softDisconnect, "auto": auto};
			}
		});
	};

	self.events = {
		"cmd#omegle": function(nick, to, args) {
			if (!(to in self.chats)) {
				bot.notice(to, "omegle started");
				self.start(to);
			}
			else
				bot.notice(to, "omegle already started");
		},

		"cmd#unomegle": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].hardDisconnect();
				delete self.chats[to];
				bot.notice(to, "omegle stopped");
			}
			else
				bot.notice(to, "omegle not started");
		},

		"cmd#reomegle": function(nick, to, args, message) {
			if (to in self.chats) {
				self.chats[to].hardDisconnect();
			}
			self.start(to);
		},

		"cmd#autoomegle": function(nick, to, args) {
			if (to in self.chats) {
				if (self.chats[to].auto) {
					self.chats[to].auto = false;
					bot.notice(to, "autoreomegle disabled");
				}
				else {
					self.chats[to].auto = true;
					bot.notice(to, "autoreomegle enabled");
				}
			}
			else
				bot.notice(to, "omegle not started");
		},

		"nocmd": function(nick, to, text) {
			if (to in self.chats)
			{
				var match = text.match(self.regex);
				if (nick == to || (match && (match[1] == ">" || match[2] == bot.nick))) {
					request.post({url: self.chats[to].server + "send", form: {"id": self.chats[to].id, "msg": (nick != to ? match[2] : text)}});
				}
			}
		}
	}
}

module.exports = OmeglePlugin;
