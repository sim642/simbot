var request = require("request");
var qs = require("querystring");

function OmeglePlugin(bot) {
	var self = this;
	self.name = "omegle";
	self.help = "Omegle plugin";
	self.depend = ["cmd"];

	self.regex = /^(\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)\s*[,:]|>(?!>))\s*(.*)$/i;

	self.skips = [];

	self.load = function(data) {
		if (data) {
			self.skips = data.skips;
		}
	};

	self.save = function() {
		return {"skips": self.skips};
	};

	self.chats = {};

	self.disable = function() {
		for (var to in self.chats) {
			(self.chats[to].hardDisconnect() || function(){})();
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
										bot.out.log("omegle", "stranger connected in " + to);
										bot.notice(to, "stranger connected");
										break;
									case "typing":
										bot.notice(to, "typing...");
										break;
									case "stoppedTyping": 
										bot.notice(to, "stopped typing");
										break;
									case "gotMessage":
										var msg = eventdata[i][1];
										bot.out.log("omegle", "stranger in " + to + ": " + msg);
										bot.say(to, "\x02" + msg);
										if (self.skips.some(function(skip) {
											return msg.match(new RegExp(skip));
										})) {
											bot.out.log("omegle", "stranger is bot, skipping");
											bot.notice(to, "bot detected, skipping");
											self.chats[to].softDisconnect();
										}
										break;
									case "strangerDisconnected":
										bot.out.log("omegle", "stranger disconnected");
										bot.notice(to, "stranger disconnected");
										self.chats[to].softDisconnect();
										break;
									case "statusInfo":
										//bot.notice(to, "Omegle users online: " + eventdata[i][1].count);
										break;
									case "commonLikes":
										bot.notice(to, "common likes: " + eventdata[i][1].join(","));
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
			else {
				bot.notice(to, "omegle failure");
				delete self.chats[to];
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
				(self.chats[to].hardDisconnect || function(){})();
				delete self.chats[to];
				bot.out.log("omegle", nick + " in " + to + " disconnected");
				bot.notice(to, "omegle stopped");
			}
			else
				bot.notice(to, "omegle not started");
		},

		"cmd#reomegle": function(nick, to, args, message) {
			if (to in self.chats) {
				(self.chats[to].hardDisconnect || function(){})();
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
					var msg = nick != to ? match[3] : text;
					bot.out.log("omegle", nick + " in " + to + ": " + msg);
					request.post({url: self.chats[to].server + "send", form: {"id": self.chats[to].id, "msg": msg}});
				}
			}
		}
	}
}

module.exports = OmeglePlugin;
