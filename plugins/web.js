var http = require("http");
var url = require("url");

function WebPlugin(bot) {
	var self = this;
	self.name = "web";
	self.help = "HTTP endpoint plugin";
	self.depend = [];

	self.port = 8080;
	self.server = null;

	self.reqListener = function(req, res) {
		var u = url.parse(req.url, true);

		var chunks = [];
		req.on('data', function(chunk) {
			chunks.push(chunk);
		});
		req.on('end', function() {
			var body = chunks.join("");

			bot.emit("web", u.pathname.substr(1), req, u.query, body, res);
			bot.emit("web#" + u.pathname.substr(1), req, u.query, body, res);
		});
	};

	self.load = function(data) {
		if (data) {
			self.port = data.port || 8080;
		}
	};

	self.enable = function() {
		bot.out.doing("web", "starting web server on port " + self.port);
		self.server = http.createServer(self.reqListener);
		self.server.on('error', function(e) {
			bot.out.error("web", "failed to start web server on port " + self.port);
			self.server = null;
		});
		self.server.listen(self.port, function() {
			bot.out.ok("web", "web server started on port " + self.port);
		});
	};

	self.disable = function() {
		if (self.server) {
			self.server.close(function() {
				bot.out.ok("web", "web server stopped");
			});
			self.server = null;
		}
	};

	self.save = function() {
		return {
			port: self.port
		};
	}

	self.events = {

	};
}

module.exports = WebPlugin;
