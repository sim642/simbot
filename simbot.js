var irc = require("irc");
	require("./patch-whois");
	require("./patch-bel");
	require("./patch-join");
var repl = require("repl");
var fs = require("fs");
var util = require("util");

var config = JSON.parse(fs.readFileSync("config.json"));
var defcfg = {
	autoRejoin: false,
	channels: [],
	messageSplit: 300,
};
config.__proto__ = defcfg;

var bot = new irc.Client(config.server, config.nick, config);

bot.setMaxListeners(50);

bot.forward = function(to) {
	return function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(to);
		//bot.out.debug("simbot", args);
		return bot.emit.apply(bot, args);
	};
};

bot.out = require("./out");

bot.out.ok("bot", "bot started");

bot.conn.setTimeout(180 * 1000);
bot.conn.on("timeout", function() {
	bot.conn.destroy();
	//bot.connect();
});

bot.on("error", function(message) {
	bot.out.error("irc", util.inspect(message, {colors: true}));
});

bot.on("registered", function(message) {
	bot.send("UMODE2", "+B");
	bot.out.ok("irc", "registered on server");
});

bot.plugins = require("./plugins");

fs.readFile("autoload.json", function(err, data) {
	bot.out.doing("bot", "autoloading plugins...");
	var autoload = JSON.parse(data).autoload;
	for (var i = 0; i < autoload.length; i++) {
		bot.plugins.load(autoload[i]);
	}
});

if (config.saveinterval) {
	bot.saver = setInterval(function() {
		//bot.out.doing("bot", "autosaving plugins...");
		for (var name in bot.plugins) {
			if (bot.plugins[name].name) {
				bot.plugins.save(name);
			}
		}
	}, config.saveinterval * 60 * 1000);
}

process.on("SIGINT", function() {
	bot.out.doing("bot", "unloading plugins...");
	for (var name in bot.plugins) {
		if (bot.plugins[name].name) {
			bot.plugins.unload(name);
		}
	}
	bot.out.ok("bot", "bot stopped");
	process.exit(0);
});

process.on("uncaughtException", function(e) {
	bot.out.error("bot", "uncaught exception: " + e.stack);
});

repl.start({
	useGlobal: true,
	ignoreUndefined: true
}).context.bot = bot;

