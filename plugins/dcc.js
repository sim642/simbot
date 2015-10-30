var net = require("net");
var ip = require("ip");
var request = require("request");
var path = require("path");

function DCCPlugin(bot) {
	var self = this;
	self.name = "dcc";
	self.help = "DCC plugin";
	self.depend = ["util"];

	self.ctcpChatRe = /^DCC CHAT chat (\d+) (\d+)$/i;
	self.ctcpMsgRe = /^(\x01ACTION )?([^\x01\r\n]*)\x01?\r?\n(.*)$/i;
	self.ctcpSendRe = /^DCC SEND (\S+) (\d+) (\d+) (\d+)$/i;

	self.port = null;
	self.blockSize = 65536;
	self.ackCheck = true;
	self.ackSend = true;

	self.chats = {};
	self.autoReceive = false;
	self.receives = [];

	self.targetRe = /^dcc#(.*)$/;
	self._say = null;
	self._action = null;
	self._notice = null;

	self.chat = function(from, client) {
		self.chats[from] = client;

		var str = "";

		client.on("connect", function() {
			bot.emit("dcc-chat-open", from);
		});

		client.on("data", function(data) {
			str += data.toString();
			//bot.out.debug("dcc", [str, data.toString()]);

			str = str.replace(self.ctcpMsgRe, function(line, action, text, rest) {
				bot.emit("dcc-chat", from, text, action ? "action" : "privmsg");
				return rest;
			});
		});

		client.on("end", function() {
			bot.emit("dcc-chat-close", from);
			delete self.chats[from];
		});

		client.on("error", function(err) {
			bot.out.error("dcc", from, client, err);
		});
	};

	self.say = function(to, text) {
		self.chats[to].write(text + "\r\n");
	};

	self.action = function(to, text) {
		self.say(to, "\x01ACTION " + text + "\x01");
	};

	self.chat2 = function(to) {
		request("https://api.ipify.org/", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				bot.ctcp(to, "privmsg", "DCC CHAT chat " + ip.toLong(body) + " " + self.port);

				var server = net.createServer(function(client) {
					self.chat(to, client);
					client.emit("connect");
					server.close();
				});

				server.listen(self.port);
			}
		});
	};

	self.send = function(to, filename) {
		var filepath = path.join("./data/dcc/", filename);

		request("https://api.ipify.org/", function(err, res, body) {
			if (!err && res.statusCode == 200) {
				fs.stat(filepath, function(err, stats) {
					if (!err) {
						bot.ctcp(to, "privmsg", "DCC SEND " + filename + " " + ip.toLong(body) + " " + self.port + " " + stats.size);

						var server = net.createServer(function(client) {
							server.close();

							fs.open(filepath, "r", function(err, fd) {
								if (!err) {
									var func = function() {
										var buffer = new Buffer(self.blockSize);

										fs.read(fd, buffer, 0, self.blockSize, null, function(err, readsize, buffer) {
											buffer = buffer.slice(0, readsize);
											client.write(buffer);

											if (self.ackCheck) {
												client.once("data", function(data) {
													var acksize = data.readUInt32BE(0);

													if (readsize < self.blockSize/* || acksize < readsize*/) // EOF || error
														client.end();
													else
														func();
												});
											}
											else {
												if (readsize < self.blockSize) // EOF
													client.end();
												else
													func();
											}
										});
									};

									func();
								}
								else
									bot.out.error("dcc", err);
							});
						});

						server.listen(self.port);
					}
				});
			}
		});
	};

	self.receive = function(from, filename, filesize, client) {
		var filepath = path.join("./data/dcc/", from + "." + filename);

		fs.open(filepath, "w", function(err, fd) {
			if (!err) {
				client.on("connect", function() {

				});

				client.on("end", function() {
					bot.out.debug("dcc", "recv closed");
				});

				client.on("error", function(err) {
					bot.out.error("dcc", from, client, err);
				});

				var func = function(data) {
					//bot.out.debug("dcc", "recv: " + data.length);
					fs.write(fd, data, 0, data.length, null, function(err, written, buffer) {
						//bot.out.debug("dcc", "write: " + written);

						fs.fstat(fd, function(err, stats) {
							if (!err) {
								var func2 = function() {
									if (stats.size < filesize) {
										bot.out.debug("dcc", [stats.size, filesize]);
									}
									else {
										bot.out.debug("dcc", [stats.size, filesize, "done"]);
										fs.close(fd);
									}
								};

								if (self.ackSend) {
									var ack = new Buffer(4);
									ack.writeUInt32BE(written, 0);

									client.write(ack, func2);
								}
								else
									func2();
							}
							else
								bot.out.error("dcc", err);
						});
					});
				};

				client.on("data", func);
			}
			else
				bot.out.error("dcc", err);
		});
	};

	self.receive2 = function(receiveId) {
		var receive = self.receives.splice(receiveId, 1)[0];
		self.receive(receive.from, receive.filename, receive.filesize, net.connect(receive.port, receive.host));
	};

	self.load = function(data) {
		if (data && data.port)
			self.port = data.port;
		if (data && data.blockSize)
			self.blockSize = data.blockSize;
		if (data && data.ackCheck)
			self.ackCheck = data.ackCheck;
		if (data && data.autoReceive)
			self.autoReceive = data.autoReceive;
	};

	self.enable = function() {
		self._say = bot.say; // copy old function
		bot.say = function(target, message) {
			var m = target.match(self.targetRe);
			if (m) // DCC say
				return self.say(m[1], message);
			else
				return self._say.call(this, target, message);
		};

		self._action = bot.action; // copy old function
		bot.action = function(target, message) {
			var m = target.match(self.targetRe);
			if (m) // DCC action
				return self.action(m[1], message);
			else
				return self._action.call(this, target, message);
		};

		self._notice = bot.notice; // copy old function
		bot.notice = function(target, message) {
			var m = target.match(self.targetRe);
			if (m) // DCC notice
				return self.action(m[1], " NOTICE: " + message);
			else
				return self._notice.call(this, target, message);
		};
	};

	self.disable = function() {
		for (var from in self.chats) {
			self.chats[from].end();
		}

		bot.say = self._say; // restore old function
		self._say = null;
		bot.action = self._action; // restore old function
		self._action = null;
		bot.notice = self._notice; // restore old function
		self._notice = null;
	};

	self.save = function() {
		return {port: self.port, blockSize: self.blockSize, ackCheck: self.ackCheck, autoReceive: self.autoReceive};
	};

	self.events = {
		"ctcp-privmsg": function(from, to, text) {
			var m = text.match(self.ctcpChatRe);
			//bot.out.debug("dcc", m);
			if (m) {
				var host = ip.fromLong(m[1]);
				var port = parseInt(m[2]);

				//bot.out.debug("dcc", [host, port]);

				self.chat(from, net.connect(port, host));
			}

			var m = text.match(self.ctcpSendRe);
			if (m) {
				var filename = m[1];
				var host = ip.fromLong(m[2]);
				var port = parseInt(m[3]);
				var filesize = parseInt(m[4]);

				//bot.out.debug("dcc", [filename, host, port, filesize]);

				var receiveId = self.receives.push({
					"from": from,
					"filename": filename,
					"filesize": filesize,
					"host": host,
					"port": port
				}) - 1;

				bot.out.log("dcc", receiveId + ": " + from + " (" + host + ":" + port + ") sending " + filename + " (" + bot.plugins.util.formatSize(filesize) + ")");

				if (self.autoReceive)
					self.receive2(receiveId);
			}
		},

		"dcc-chat-open": function(from) {
			bot.out.log("dcc", from + " open");
		},

		"dcc-chat": function(from, text, type) {
			bot.out.log("dcc", from + " " + type + ": " + text);

			switch (type) {
				case "privmsg":
					bot.emit("dcc-chat-privmsg", from, text);
					break;

				case "action":
					bot.emit("dcc-chat-action", from, text);
					break;
			}

			var message = {
				nick: from,
				user: "dcc",
				host: self.chats[from].remoteAddress,
				command: "PRIVMSG",
				args: ["dcc#" + from, text]
			};
			message.prefix = message.nick + "!" + message.user + "@" + message.host;
			bot.emit("raw", message);
		},

		"dcc-chat-privmsg": function(from, text) {
			//bot.emit("message", from, "dcc#" + from, text);
		},

		"dcc-chat-action": function(from, text) {
			//bot.emit("action", from, "dcc#" + from, text);
		},

		"dcc-chat-close": function(from) {
			bot.out.log("dcc", from + " close");
		},
	};
}

module.exports = DCCPlugin;
