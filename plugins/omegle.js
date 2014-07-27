var request = require("request");
var qs = require("querystring");

function OmeglePlugin(bot) {
	var self = this;
	self.name = "omegle";
	self.help = "Omegle plugin";
	self.depend = ["cmd"];

	self.regex = /^(\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)\s*[,:]|>(?!>))\s*(.*)$/i;

	self.skips = [];
	self.colleges = {};

	self.load = function(data) {
		if (data) {
			self.skips = data.skips;
			self.colleges = data.colleges;
		}
	};

	self.save = function() {
		return {"skips": self.skips, "colleges": self.colleges};
	};

	self.chats = {};
	self.servers = ["front1.omegle.com"];

	self.disable = function() {
		for (var to in self.chats) {
			(self.chats[to].hardDisconnect() || function(){})();
		}
		self.chats = {};
	};

	self.start = function(to, args) {
		if (self.chats[to] === undefined) {
			self.chats[to] = {
				"auto": false,
				"lang": "en",
				"topics": [],
				"college": null,
				"collegeMode": "any",
				"interval": null
			};
		}
		if (args !== undefined) {
			for (var i = 1; i < args.length; i++) {
				var arg = args[i];
				if (arg == "auto")
					self.chats[to].auto = true;
				else if (arg == "my" || arg == "any")
					self.chats[to].collegeMode = arg;
				else if (arg.length == 2)
					self.chats[to].lang = arg;
				else if (arg in self.colleges)
					self.chats[to].college = arg;
				else {
					self.chats[to].topics = arg.split(",").map(function(elem) { return elem.trim(); }).filter(function(elem) { return elem != ""; });
				}
			}
		}

		var server = "http://" + self.servers[Math.floor(Math.random() * self.servers.length)] + "/";
		self.chats[to].server = server;

		var query = {
			"rcs": 1,
			//"firstevents": 1,
			"spid": "",
			"lang": self.chats[to].lang,
			"topics": JSON.stringify(self.chats[to].topics),
		};

		if (self.chats[to].college != null) {
			query["college"] = self.chats[to].college;
			query["college_auth"] = self.colleges[self.chats[to].college];
			query["any_college"] = self.chats[to].collegeMode == "any" ? 1 : 0;
		}

		self.chats[to].req = request.post({url: server + "start?" + qs.stringify(query) }, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);
				self.chats[to].id = data;

				self.chats[to].hardDisconnect = function() {
					bot.out.debug("omegle", "hardDisconnect");
					request.post({url: server + "disconnect", form: {"id": data}});
					clearInterval(self.chats[to].interval);
					if (self.chats[to].typing != null)
						clearTimeout(self.chats[to].typing);
				};
				self.chats[to].softDisconnect = function() {
					bot.out.debug("omegle", "softDisconnect");
					self.chats[to].hardDisconnect();
					if (self.chats[to].auto) {
						self.start(to);
					}
					else {
						delete self.chats[to];
					}
				};

				self.chats[to].interval = setInterval(function() {
					request.post({url: server + "events", form: {"id": data}}, function(err, res, body) {
						if (!err && res.statusCode == 200) {
							var eventdata = JSON.parse(body);
							if (eventdata != null) {
								for (var i = 0; i < eventdata.length; i++) {
									switch (eventdata[i][0]) {
									case "waiting":
										var bits = [];
										if (self.chats[to].lang != "en")
											bits.push("lang: " + self.chats[to].lang);
										if (self.chats[to].topics.join(",") != "")
											bits.push("interests: " + self.chats[to].topics.join(","));
										if (self.chats[to].college != null)
											bits.push("college: " + (self.chats[to].collegeMode == "any" ? "any" : self.chats[to].college));
										bot.notice(to, "waiting for stranger" + (bits.length == 0 ? "" : " [" + bits.join("; ") + "]"));
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
											return msg.match(new RegExp(skip, "i"));
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
										self.servers = eventdata[i][1].servers;
										break;
									case "commonLikes":
										bot.notice(to, "common likes: " + eventdata[i][1].join(","));
										break;
									case "partnerCollege":
										bot.notice(to, "stranger's college: " + eventdata[i][1]);
										break;
									}
								}
							}
						}
					});
				}, 1000);
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
				self.start(to, args);
			}
			else
				bot.notice(to, "omegle already started");
		},

		"cmd#unomegle": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].req.abort();
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
				self.chats[to].req.abort();
				(self.chats[to].hardDisconnect || function(){})();
			}
			self.start(to, args);
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

		"cmd#collegeemail": function(nick, to, args) {
			request.post({url: "http://" + self.servers[0] + "/send_email", form: {email: args[1]}}, function(err, res, body) {
				if (!err && res.statusCode == 200) {
					bot.say(to, body);
				}
			});
		},

		"cmd#collegeverify": function(nick, to, args) {
			request({url: args[1], followRedirect: false}, function(err, res, body) {
				if (!err && res.statusCode == 302) {
					var match = res.headers["set-cookie"].toString().match(/college=(\[[^\]]+\])/);
					if (match) {
						var arr = JSON.parse(match[1]);
						self.colleges[arr[0]] = arr[1];
					}
				}
			});
		},

		"cmd#colleges": function(nick, to, args) {
			bot.say(to, "Usable omegle colleges: " + Object.keys(self.colleges).join(", "));
		},

		"cmd#college": function(nick, to, args) {
			var college = args[1];
			if (to in self.chats && college in self.colleges) {
				self.chats[to].college = college;
			}
		},

		"cmd#collegemode": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].collegeMode = args[1];
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
					if (self.chats[to].typing != null) {
						clearTimeout(self.chats[to].typing);
						self.chats[to].typing = null;
					}
				}
				else {
					if (self.chats[to].typing == null)
						request.post({url: self.chats[to].server + "typing", form: {"id": self.chats[to].id}});
					else
						clearTimeout(self.chats[to].typing);

					self.chats[to].typing = setTimeout(function() {
						request.post({url: self.chats[to].server + "stoppedtyping", form: {"id": self.chats[to].id}});
						self.chats[to].typing = null;
					}, 7 * 1000);
				}
			}
		}
	}
}

module.exports = OmeglePlugin;
