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
bot.out.log = function(module, message) {
	var c = clc.cyan;
	console.log(c("[LOG:") + c.bold(module) + c("] ") + message);
};

bot.out.ok = function(module, message) {
	var c = clc.greenBright;
	console.log(c("[OK:") + c.bold(module) + c("] ") + message);
};

bot.out.debug = function(module, message) {
	var c = clc.magentaBright;
	console.log(c("[DEBUG:") + c.bold(module) + c("] ") + message);
};

bot.out.warn = function(module, message) {
	var c = clc.yellowBright;
	console.log(c("[WARN:") + c.bold(module) + c("] ") + message);
};

bot.out.error = function(module, message) {
	var c = clc.redBright;
	console.log(c("[ERROR:") + c.bold(module) + c("] ") + message);
};

bot.conn.on("timeout", function() {
	bot.conn.destroy();
	//bot.connect();
});

bot.on("error", function(message) {
	console.log(message);
});

bot.on("registered", function(message) {
	bot.send("UMODE2", "+B");
});

bot.plugins = require("./plugins");

fs.readFile("autoload.json", function(err, data) {
	var autoload = JSON.parse(data).autoload;
	for (var i = 0; i < autoload.length; i++) {
		console.log(autoload[i]);
		bot.plugins.load(autoload[i]);
	}
});

if (config.saveinterval) {
	bot.saver = setInterval(function() {
		for (var name in bot.plugins) {
			if (bot.plugins[name].name) {
				bot.plugins.save(name);
			}
		}
	}, config.saveinterval * 60 * 1000);
}

process.on("SIGINT", function() {
	for (var name in bot.plugins) {
		if (bot.plugins[name].name) {
			bot.plugins.unload(name);
		}
	}
	process.exit(0);
});

process.on("uncaughtException", function(e) {
	console.trace("ERROR process uncaught: " + e);
});

repl.start({
	useGlobal: true
}).context.bot = bot;

