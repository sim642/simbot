var irc = require("irc");
var repl = require("repl");

var bot = new irc.Client("irc.awfulnet.org", "simbot", {
	userName: "simbot",
	realName: "sim642",
	autoRejoin: false,
	channels: ["#twerky"],
});

bot.chanRe = /^=(\S+)(?:(\s+.*))?$/;
bot.argsRe = /\s+(?:"([^"]*)"|'([^']+)'|([^\s'"]+))/g;

bot.on("error", function(message) {
	console.log(message);
});

bot.on("registered", function(message) {
	bot.send("UMODE2", "+B");
});

bot.on("message", function(nick, to, text, message) {
	var m = text.match(bot.chanRe);
	if (m) {
		var args2 = [m[2]];
		for (var res; (res = bot.argsRe.exec(m[2])) !== null;) {
			var i;
			for (i = 1; res[i] === undefined; i++);
			args2.push(res[i]);
		}

		bot.emit("cmd", nick, to == bot.nick ? nick : to, m[1], args2, message);
	}
});

bot.on("cmd", function(nick, to, cmd, args, message) {
	if (bot.listeners("cmd#" + cmd)[0] !== undefined)
		bot.emit("cmd#" + cmd, nick, to, args, message);
	else
		bot.emit("cmd#", nick, to, cmd, args, message);
});

bot.on("cmd#", function(nick, to, cmd, args, message) {
	bot.notice(nick, "no such command: " + cmd);
});

bot.on("cmd#help", function(nick, to, args, message) {
	if (bot.plugins[args[1]])
		bot.say(to, nick + ": " + args[1] + " - " + bot.plugins[args[1]].help);
	else if (args[1])
		bot.say(to, nick + ": no such module `" + args[1] + "`");
	else
		bot.say(to, nick + ": " + bot.nick + " by sim642");
});

bot.plugins = require('./plugins');
bot.auth = require('./auth');

repl.start({
	useGlobal: true
}).context.bot = bot;

