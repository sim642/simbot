var request = require("request");
var qs = require("querystring");

function OmeglePlugin(bot) {
	var self = this;
	self.name = "omegle";
	self.help = "Omegle plugin";
	self.depend = ["cmd", "bitly"];

	self.regex = /^(\s*([a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]*)\s*[,:]|>(?![>\.]))\s*(.*)$/i;

	self.skips = [];
	self.typing = true;
	self.colleges = {};

	self.load = function(data) {
		if (data) {
			self.skips = data.skips;
			self.typing = data.typing;
			self.colleges = data.colleges;
		}
	};

	self.save = function() {
		return {"skips": self.skips, "typing": self.typing, "colleges": self.colleges};
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
				"question": null,
				"spyee": false,
				"interval": null
			};
		}
		if (args !== undefined) {
			var extra = false; // colon seen
			for (var i = 1; i < args.length; i++) {
				var arg = args[i];
				if (arg.indexOf(":") >= 0)
					extra = true;

				if (arg == "auto")
					self.chats[to].auto = true;
				else if (arg == "my" || arg == "any")
					self.chats[to].collegeMode = arg;
				else if (arg == "spyee") {
					self.chats[to].spyee = true;
					self.chats[to].topics = [];
					self.chats[to].question = null;
				}
				else if (!extra && arg.length == 2)
					self.chats[to].lang = arg;
				else if (arg in self.colleges)
					self.chats[to].college = arg;
				else {
					self.chats[to].topics = arg.split(",").map(function(elem) { return elem.trim(); }).filter(function(elem) { return elem != ""; });
				}
			}

			var parts = args[0].split(":");
			if (parts.length == 2) {
				self.chats[to].question = parts[1].trim();
				self.chats[to].topics = [];
				self.chats[to].spyee = false;
			}
		}

		var server = "http://" + self.servers[Math.floor(Math.random() * self.servers.length)] + "/";
		self.chats[to].server = server;

		var query = {
			"rcs": 1,
			//"firstevents": 1,
			"spid": "",
			"lang": self.chats[to].lang,
		};

		if (self.chats[to].topics.join(",") != "") {
			query["topics"] = JSON.stringify(self.chats[to].topics);
		}

		if (self.chats[to].college !== null) {
			query["college"] = self.chats[to].college;
			query["college_auth"] = self.colleges[self.chats[to].college];
			query["any_college"] = self.chats[to].collegeMode == "any" ? 1 : 0;
		}

		if (self.chats[to].question !== null) {
			query["ask"] = self.chats[to].question;
		}

		if (self.chats[to].spyee !== false) {
			query["wantsspy"] = 1;
		}

		self.chats[to].req = request.post({url: server + "start?" + qs.stringify(query) }, function(err, res, body) {
			if (!err && res.statusCode == 200) {
				var data = JSON.parse(body);
				self.chats[to].id = data;

				self.chats[to].hardDisconnect = function() {
					request.post({url: server + "disconnect", form: {"id": data}});
					clearInterval(self.chats[to].interval);
					if (self.chats[to].typing !== null)
						clearTimeout(self.chats[to].typing);
				};
				self.chats[to].softDisconnect = function() {
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
							if (eventdata !== null) {
								for (var i = 0; i < eventdata.length; i++) {
									switch (eventdata[i][0]) {
									case "waiting":
										var who = "stranger";
										var bits = [];
										if (self.chats[to].lang != "en")
											bits.push("lang: " + self.chats[to].lang);
										if (self.chats[to].topics.join(",") != "")
											bits.push("interests: " + self.chats[to].topics.join(","));
										if (self.chats[to].college !== null)
											bits.push("college: " + (self.chats[to].collegeMode == "any" ? "any" : self.chats[to].college));
										if (self.chats[to].question !== null) {
											bits.push("spy");
											who += "s";
										}
										if (self.chats[to].spyee)
											bits.push("spyee");
										bot.notice(to, "waiting for " + who + (bits.length === 0 ? "" : " [" + bits.join("; ") + "]"));
										break;
									case "connected":
										var who = "stranger" + (self.chats[to].question !== null ? "s" : "");
										bot.out.log("omegle", who + " connected in " + to);
										bot.notice(to, who + " connected");
										break;
									case "typing":
										if (self.typing)
											bot.action(to, "is typing...");
										break;
									case "spyTyping":
										if (self.typing)
											bot.action(to, "<" + eventdata[i][1] + "> is typing...");
										break;
									case "stoppedTyping": 
										if (self.typing)
											bot.action(to, "stopped typing");
										break;
									case "spyStoppedTyping":
										if (self.typing)
											bot.action(to, "<" + eventdata[i][1] + "> stopped typing");
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
									case "spyMessage":
										var who = eventdata[i][1];
										var msg = eventdata[i][2];
										bot.out.log("omegle", who + " in " + to + ": " + msg);
										bot.say(to, "\x02<" + who + "> " + msg);
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
									case "spyDisconnected":
										var who = eventdata[i][1];
										bot.out.log("omegle", who + " disconnected");
										bot.notice(to, who + " disconnected");
										self.chats[to].softDisconnect();
										break;
									case "statusInfo":
										//bot.notice(to, "Omegle users online: " + eventdata[i][1].count);
										self.servers = eventdata[i][1].servers;
										break;
									case "identDigests":
										break;
									case "commonLikes":
										bot.notice(to, "common likes: " + eventdata[i][1].join(","));
										break;
									case "partnerCollege":
										bot.notice(to, "stranger's college: " + eventdata[i][1]);
										break;
									case "question":
										bot.notice(to, "question: " + eventdata[i][1]);
										break;
									case "recaptchaRequired":
									case "recaptchaRejected":
										request("https://www.google.com/recaptcha/api/challenge?k=" + eventdata[i][1], function(err, res, body) {
											if (!err && res.statusCode == 200) {
												var match = body.match(/challenge\s*:\s*'(.+)'/);
												self.chats[to].recaptcha = match[1];
												if (match) {
													bot.plugins.bitly.shorten("http://www.google.com/recaptcha/api/image?c=" + match[1], function(url) {
														bot.notice(to, "solve reCaptcha (using =recaptcha): " + url);
													});
												}
											}
										});
										break;
									case "error":
										bot.out.error("omegle", "Error: " + eventdata[i][1]);
										break;
									default:
										bot.out.debug("omegle", "Unhandled event: " + eventdata[i].toString());
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
					var j = JSON.parse(body);
					bot.say(to, nick + ": omegle college " + (j.success ? "success" : "failure") + " - " + j.msg.replace("\n", " ", "g"));
				}
			});
		},

		"cmd#collegeverify": function(nick, to, args) {
			if (args[1].match(/^http:\/\/chatserv\.omegle\.com\/verify\/\w+$/)) {
				request({url: args[1], followRedirect: false}, function(err, res, body) {
					if (!err && res.statusCode == 302) {
						var match = res.headers["set-cookie"].toString().match(/college=(\[[^\]]+\])/);
						if (match) {
							var arr = JSON.parse(match[1]);
							self.colleges[arr[0]] = arr[1];
							bot.say(to, nick + ": " + arr[0] + " added successfully");
						}
					}
					else
						bot.out.error("omegle", err);
				});
			}
			else
				bot.say(to, nick + ": invalid omegle college verification link");
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

		"cmd#question": function(nick, to, args) {
			if (to in self.chats) {
				self.chats[to].question = args[0];
				self.chats[to].topics = [];
				self.chats[to].spyee = false;
			}
		},

		"cmd#recaptcha": function(nick, to, args) {
			if (to in self.chats && self.chats[to].recaptcha !== undefined) {
				request.post({url: self.chats[to].server + "recaptcha", form: {"id": self.chats[to].id, "challenge": self.chats[to].recaptcha, "response": args[0]}}, function(err, res, body) {
					if (!err && res.statusCode == 200) {
						delete self.chats[to].recaptcha;
					}
				});
			}
		},

		"nocmd": function(nick, to, text) {
			if (to in self.chats && self.chats[to].question === null)
			{
				var match = text.match(self.regex);
				if (nick == to || (match && (match[1] == ">" || match[2] == bot.nick))) {
					var msg = nick != to ? match[3] : text;
					bot.out.log("omegle", nick + " in " + to + ": " + msg);
					request.post({url: self.chats[to].server + "send", form: {"id": self.chats[to].id, "msg": msg}});
					if (self.chats[to].typing !== null) {
						clearTimeout(self.chats[to].typing);
						self.chats[to].typing = null;
					}
				}
				else {
					if (self.chats[to].typing === null)
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
	};
}

module.exports = OmeglePlugin;
