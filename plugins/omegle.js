var request = require("request");
var qs = require("querystring");

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

	self.start = function(to, topics, lang) {
		if (self.chats[to] === undefined) {
			self.chats[to] = {
				"auto": false,
				"lang": lang || "en",
				"topics": topics || []
			};
		}
		else {
			if (topics !== undefined)
				self.chats[to].topics = topics;
			if (lang !== undefined)
				self.chats[to].lang = lang;
		}

		var server = "http://front1.omegle.com/";
		self.chats[to].server = server;

		var query = {
			"rcs": 1,
			//"firstevents": 1,
			"spid": "",
			"lang": self.chats[to].lang,
			"topics": JSON.stringify(self.chats[to].topics)
		};
		request.post({url: server + "start?" + qs.stringify(query) }, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);
				self.chats[to].id = data;
				var interval = setInterval(function() {
					request.post({url: server + "events", form: {"id": data}}, function(err, res, body) {
						if (!err && res.statusCode == 200) {
							var eventdata = JSON.parse(body);
							if (eventdata != null) {
								for (var i = 0; i < eventdata.length; i++) {
									switch (eventdata[i][0]) {
									case "waiting":
										bot.notice(to, "waiting for stranger [lang: " + self.chats[to].lang + "; interests: " + self.chats[to].topics.join(",") + "]");
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
										bot.say(to, "\x02" + eventdata[i][1]);
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

				self.chats[to].interval = interval;
				self.chats[to].hardDisconnect = hardDisconnect;
				self.chats[to].softDisconnect = softDisconnect;
			}
		});
	};

	self.events = {
		"cmd#omegle": function(nick, to, args) {
			if (!(to in self.chats)) {
				bot.notice(to, "omegle started");
				self.start(to, args[1] === undefined ? undefined : args[1].split(","), args[2]);
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
			self.start(to, args[1] === undefined ? undefined : args[1].split(","), args[2]);
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

		"cmd#lang": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].lang = args[1];
			}
		},

		"cmd#interests": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].topics = args[1].split(",");
			}
		},

		"nocmd": function(nick, to, text) {
			if (to in self.chats)
			{
				var match = text.match(self.regex);
				if (nick == to || (match && (match[1] == ">" || match[2] == bot.nick))) {
					request.post({url: self.chats[to].server + "send", form: {"id": self.chats[to].id, "msg": (nick != to ? match[3] : text)}});
				}
			}
		}
	}
}

module.exports = OmeglePlugin;
