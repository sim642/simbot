var fs = require("fs");
var path = require("path");

function HistoryPlugin(bot) {
	var self = this;
	self.name = "history";
	self.help = "History plugin";
	self.depend = ["cmd", "auth", "gist", "util"];
	
	self.basedir = null;
	self.basename = null;

	self.grepRe = new RegExp(
		"(/)((?:\\\\\\1|(?!\\1).)+)" +
		"\\1([a-z])*"); // simplified from sed plugin

	self.load = function(data) {
		if (data) {
			self.basedir = data.basedir;
			self.basename = data.basename;
		}
	};

	self.save = function() {
		return {basedir: self.basedir, basename: self.basename};
	};

	self.iterate = function(channel, lineCb, endCb, fileCb) {
		fs.readdir(self.basedir, function(err, files) {
			var re = new RegExp("^" + self.basename + channel + "_(\\d{4})(\\d{2})(\\d{2})\\.log$");
			var logfiles = files.filter(function (file) {
				return file.match(re);
			}).sort();

			var found = false;
			var func = function(logfiles) {
				if (!found && logfiles.length > 0) {
					var logfile = logfiles.pop();
					var match = logfile.match(re);

					fs.readFile(path.join(self.basedir, logfile), {encoding: "utf8"}, function(err, data) {
						if (err)
							throw err;

						var lines = data.split("\n");

						for (var j = lines.length - 1 - 1; !found && j >= 0; j--) {
							if (!lineCb(lines[j]))
								found = true;
						}

						(fileCb || function(){})(logfile, match.slice(1, 3 + 1));

						func(logfiles);
					});
				}
				else {
					(endCb || function(){})(found);
				}
			};

			func(logfiles);
		});
	};

	self.makeWhoRe = function(who) {
		var escaped = bot.plugins.util.escapeRegExp(who);
		// TODO: http://stackoverflow.com/a/27191354/854540
		return new RegExp(
			"^\\[(\\d{2}:\\d{2}:\\d{2})\\] " +
			"(" +
				"<" + escaped + ">" + // PRIVMSG
			"|" +
				"-" + escaped + "-" + // NOTICE
			"|" +
				"\\* " + escaped +    // ACTION
			") (.*)$", "i");
	};

	self.makeModeRe = function(mode) {
		return new RegExp(
			"^\\[(\\d{2}:\\d{2}:\\d{2})\\] " +
			"\\*\\*\\* " +
			"(\\S+) sets mode: " +
			"(?:[+-][^\\s+-]+)*" +
			bot.plugins.util.escapeRegExp(mode[1]) + "\\S*" + bot.plugins.util.escapeRegExp(mode[2]), "i");
	};

	self.events = {
		"cmd#history": function(nick, to, args) {
			var linecnt;
			var channel = to;
			var who = null;
			var mode = null;
			var re = null;
			var preSurround;
			var postSurround;
			var gist = false;
			var strip = false;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];
				var m;

				if (arg == "gist")
					gist = true;
				else if (arg == "strip")
					strip = true;
				else if (arg.match(/^#/))
					channel = arg;
				else if (arg.match(/^\d+$/))
					linecnt = parseInt(arg);
				else if (m = arg.match(/^-(\d+)$/))
					preSurround = parseInt(m[1]);
				else if (m = arg.match(/^\+(\d+)$/))
					postSurround = parseInt(m[1]);
				else if (m = arg.match(/^([+-]?)([a-z])$/))
					mode = m;
				else if (m = arg.match(/^(\w+)[,:]?$/))
					who = m[1];
				else if (m = arg.match(self.grepRe))
					re = new RegExp(m[2], bot.plugins.util.filterRegexFlags(m[3]));
			}

			var whoRe = (who !== null ? self.makeWhoRe(who) : null);
			var modeRe = (mode !== null ? self.makeModeRe(mode) : null);
			preSurround = Math.min(preSurround !== undefined ? preSurround : (gist ? 5 : 3), gist ? 20 : 10);
			postSurround = Math.min(postSurround !== undefined ? postSurround : (gist ? 2 : 1), gist ? 20 : 10);

			var extra = channel == to;
			linecnt = Math.min(linecnt || (gist ? 50 : 15), re === null ? (gist ? 1000 : 50) : Math.ceil((gist ? 1000 : 50) / (preSurround + 1 + postSurround)));

			var argStr = "";
			if (who !== null) {
				argStr += who + ",";
			}
			if (re !== null) {
				argStr += (argStr ? " " : "") + "/" + re.source + "/" + re.toString().match(/[gimuy]*$/)[0]; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/flags
				argStr += " -" + preSurround.toString() + " +" + postSurround.toString();
			}
			argStr += (argStr ? " " : "") + linecnt.toString();

			var outlines = [];
			var context = [];
			var contextTodo = 0;
			var fileUsed = false;
			var contextEnded = false;
			self.iterate(channel, function(line) {
				if (extra) {
					extra = false;
					return true;
				}

				if (strip)
					line = bot.plugins.util.stripColors(line);

				if (linecnt > 0 &&
					(whoRe !== null ? line.match(whoRe) : true) &&
					(modeRe !== null ? line.match(modeRe) : true) &&
					(re === null || line.match(re))) {
					if (re !== null) {
						if (contextEnded) {
							outlines.unshift("\x031 --------");
							contextEnded = false;
						}
						//bot.out.debug("history", context);
						context.forEach(function(cline) {
							outlines.unshift(cline);
						});
						context = [];
						contextTodo = preSurround;
					}
					outlines.unshift(re !== null ? line.replace(re, "\x16$&\x16") : line); // highlight matches by color reversal

					linecnt--;
					fileUsed = true;
				}
				else if (re !== null) {
					if (contextTodo > 0) {
						outlines.unshift(line);
						contextTodo--;

						if (contextTodo == 0)
							contextEnded = true;
					}
					else if (context.length <= postSurround) {
						context.push(line);

						if (context.length > postSurround) // overflow -> rotate
							context.shift();
					}
				}

				return linecnt > 0 || contextTodo > 0;
			}, function() {
				if (gist) {
					bot.plugins.gist.create({
						"history.txt": outlines.map(bot.plugins.util.stripColors).join("\n")
					}, false, "History for " + channel + (argStr ? " (" + argStr + ")" : ""), function(data) {
						bot.say(to, nick + ": " + data.html_url);
					});
				}
				else {
					bot.say(nick, "\x031--- Begin history for " + channel + (argStr ? " (" + argStr + ")" : "") + " ---");
					for (var i = 0; i < outlines.length; i++) {
						var str = outlines[i];
						bot.say(nick, str);
					}
					bot.say(nick, "\x031--- End history for " + channel + (argStr ? " (" + argStr + ")" : "") + " ---");
				}
			}, function(logfile, date) {
				if (fileUsed) {
					outlines.unshift("\x031--- " + date.join("-") + " ---");
					fileUsed = false;
					contextEnded = false;
				}
			});
		},

		"cmd#gistory": function(nick, to, args) {
			bot.emit("cmd#history", nick, to, args.concat("gist")); // only appends the parsed arguments, not args[0]
		},

		"cmd#historycount": function(nick, to, args, message) {
			var channel = to;
			var re = null;

			for (var i = 1; i < args.length; i++) {
				var arg = args[i];

				if (arg.match(/^#/))
					channel = arg;
				else {
					var m = arg.match(self.grepRe);
					if (m) {
						re = new RegExp(m[2], bot.plugins.util.filterRegexFlags(m[3]));
					}
				}
			}

			message.authChannel = channel;

			bot.plugins.auth.proxy(2, message, function() {
				var cnt = 0;
				self.iterate(channel, function(line) {
					if (re !== null) {
						var m = line.match(re);
						cnt += (m || []).length;
					}
					else
						cnt++;

					return true; // continue forever
				}, function() {
					bot.say(to, nick + ": " + cnt);
				});
			});
		}
	};
}

module.exports = HistoryPlugin;
