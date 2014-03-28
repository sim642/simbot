var irc = require("irc");
var repl = require("repl");
var fs = require("fs");
var clc = require("cli-color");

var config = JSON.parse(fs.readFileSync("config.json"));
var defcfg = {
	autoRejoin: false,
	channels: [],
	messageSplit: 300,
};
config.__proto__ = defcfg;

var bot = new irc.Client(config.server, config.nick, config);
bot.out = {};

bot.conn.setTimeout(180 * 1000);
bot.out.time = function() {
	return clc.blackBright(new Date().toISOString());
};

bot.out.log = function(module, message) {
	var c = clc.cyan;
	console.log(bot.out.time() + " " + c("[LOG:") + c.bold(module) + c("] ") + message);
};

bot.out.doing = function(module, message) {
	var c = clc.cyanBright;
	console.log(bot.out.time() + " " + c("[DOING:") + c.bold(module) + c("] ") + message);
};

bot.out.ok = function(module, message) {
	var c = clc.greenBright;
	console.log(bot.out.time() + " " + c("[OK:") + c.bold(module) + c("] ") + message);
};

bot.out.debug = function(module, message) {
	var c = clc.magentaBright;
	console.log(bot.out.time() + " " + c("[DEBUG:") + c.bold(module) + c("] ") + message);
};

bot.out.warn = function(module, message) {
	var c = clc.yellowBright;
	console.log(bot.out.time() + " " + c("[WARN:") + c.bold(module) + c("] ") + message);
};

bot.out.error = function(module, message) {
	var c = clc.redBright;
	console.log(bot.out.time() + " " + c("[ERROR:") + c.bold(module) + c("] ") + message);
};

bot.conn.on("timeout", function() {
	bot.conn.destroy();
	//bot.connect();
});

bot.on("error", function(message) {
	bot.out.error("irc", message);
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
		bot.out.doing("bot", "autosaving plugins...");
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
	process.exit(0);
});

process.on("uncaughtException", function(e) {
	bot.out.error("bot", "uncaught exception");
	console.trace("ERROR process uncaught: " + e);
});

repl.start({
	useGlobal: true
}).context.bot = bot;

