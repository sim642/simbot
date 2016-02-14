require("./patch-buffer");

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var net = require("net");
var BufferReader = require("buffer-reader");

var enums = require("./enums")
var PACKET = enums.PACKET;
var DESTTYPE = enums.DESTTYPE;
var NETWORK_ACTION = enums.NETWORK_ACTION;
var NETWORK_ERROR = enums.NETWORK_ERROR;

function Client() {
	var self = this;

	self.socket = null;
	self.open = false;

	self.clientId = null;
	self.clients = {};
	self.companies = {};
	self.ackToken = null;
	self.frameCnt = 0;
	self.companyCbs = [];

	self.on("packet", function(packet) {
		var type = packet.readUInt8(0);
		self.emit("packet#" + type, packet.slice(1));
		self.emit("packet#" + PACKET.getName(type), packet.slice(1));
	});

	self.on("packet#SERVER_COMPANY_INFO", function(buffer) {
		var reader = new BufferReader(buffer);

		var version = reader.nextUInt8();
		var moreData = !!reader.nextUInt8();
		if (moreData) {
			var company = {};
			company.id = reader.nextUInt8();
			company.name = reader.nextStringZero();
			company.startYear = reader.nextUInt32LE();

			company.value = reader.nextInt64LE();
			company.money = reader.nextInt64LE();
			company.income = reader.nextInt64LE();
			company.performance = reader.nextUInt16LE();

			company.passworded = !!reader.nextUInt8();

			var types = ['train', 'lorry', 'bus', 'plane', 'ship'];

			company.vehicles = {};
			types.forEach(function(type) {
				company.vehicles[type] = reader.nextUInt16LE();
			});

			company.stations = {};
			types.forEach(function(type) {
				company.stations[type] = reader.nextUInt16LE();
			});

			company.ai = !!reader.nextUInt8();

			// TODO: parse client list

			//console.log(company);
			self.companies[company.id] = company;
		}
		else {
			self.companyCbs.forEach(function(cb) {
				cb();
			});
			self.companyCbs = [];
		}
	});

	self.on("packet#SERVER_WELCOME", function(buffer) {
		self.clientId = buffer.readUInt32LE(0);
		self.emit("status", "joined");

		self.send(new Buffer([PACKET.CLIENT_GETMAP]));
		self.emit("status", "getting map");
	});

	self.on("packet#SERVER_CLIENT_INFO", function(buffer) {
		var reader = new BufferReader(buffer);

		var client = {};
		client.id = reader.nextUInt32LE();
		client.companyId = reader.nextUInt8();
		client.name = reader.nextStringZero();

		client.company = client.companyId == 0xFF ? null : self.companies[client.companyId];

		self.clients[client.id] = client;
	});

	self.on("packet#SERVER_MAP_DONE", function(buffer) {
		self.send(new Buffer([PACKET.CLIENT_MAP_OK]));
		self.emit("status", "got map");
	});

	self.on("packet#SERVER_JOIN", function(buffer) {
		var reader = new BufferReader(buffer);

		var clientId = reader.nextUInt32LE();
		if (clientId != self.clientId) {
			self.emit("join", self.clients[clientId]);

			var client = self.clients[clientId]
			var company = client.company;
			if (company)
				self.emit("company#join", client, company);
			else
				self.emit("company#spectator", client);
		}
	});

	self.on("packet#SERVER_MOVE", function(buffer) {
		var reader = new BufferReader(buffer);

		var clientId = reader.nextUInt32LE();
		var companyId = reader.nextUInt8();

		self.emit("move", self.clients[clientId], self.companies[companyId]);
		self.clients[clientId].companyId = companyId;
	});

	self.on("packet#SERVER_QUIT", function(buffer) {
		var reader = new BufferReader(buffer);

		var clientId = reader.nextUInt32LE();

		self.emit("quit", self.clients[clientId], null);
		delete self.clients[clientId];
	});

	self.on("packet#SERVER_ERROR_QUIT", function(buffer) {
		var reader = new BufferReader(buffer);

		var clientId = reader.nextUInt32LE();
		var error = NETWORK_ERROR.getFullName(reader.nextUInt8());

		self.emit("quit", self.clients[clientId], error);
		delete self.clients[clientId];
	});

	self.on("packet#SERVER_FRAME", function(buffer) {
		var reader = new BufferReader(buffer);

		var frame = reader.nextUInt32LE();
		var frameMax = reader.nextUInt32LE();
		try {
			self.ackToken = reader.nextUInt8();
		}
		catch (e) {

		}

		if (++self.frameCnt >= 100) {
			var frameBuffer = new Buffer(4);
			frameBuffer.writeUInt32LE(frame, 0);

			var packet = Buffer.concat([
				new Buffer([PACKET.CLIENT_ACK]),
				frameBuffer,
				new Buffer([self.ackToken]),
			]);
			self.send(packet);

			self.frameCnt = 0;
		}
	});

	self.on("packet#SERVER_CHAT", function(buffer) {
		var reader = new BufferReader(buffer);

		var chat = {
			actionId: reader.nextUInt8(),
			clientId: reader.nextUInt32LE(),
			self: !!reader.nextUInt8(),
			msg: reader.nextStringZero(),
			data: reader.nextUInt64LE(),
		};
		//console.log("chat", chat);
		chat.action = NETWORK_ACTION.getName(chat.actionId);
		chat.client = self.clients[chat.clientId];

		self.emit("chat", chat);
	});

	self.on("chat", function(chat) {
		switch (chat.actionId) {
			case NETWORK_ACTION.CHAT:
				self.emit("chat#CHAT", chat.client, chat.msg);
				break;

			case NETWORK_ACTION.COMPANY_SPECTATOR:
				self.emit("company#spectator", chat.client);
				break;

			case NETWORK_ACTION.COMPANY_JOIN:
				self.emit("company#join", chat.client, self.companies[chat.data - 1]);
				break;

			case NETWORK_ACTION.COMPANY_NEW:
				self.companyCbs.push(function() {
					self.emit("company#new", chat.client, self.companies[chat.data - 1]);
				});
				self.send(new Buffer([PACKET.CLIENT_COMPANY_INFO]));
				break;
		}
	});

	self.on("packet#SERVER_ERROR", function(buffer) {
		self.emit("error", new Error(NETWORK_ERROR.getFullName(buffer.readUInt8(0))));
	});

	EventEmitter.call(self);
}

util.inherits(Client, EventEmitter);

Client.prototype.connect = function(addr, port) {
	var self = this;

	self.socket = net.connect(port, addr);
	self.data = new Buffer(0);
	self.emit("status", "connecting");

	self.socket.on("connect", function() {
		self.open = true;
		self.emit("connect");
		//console.log("connect");

		self.companyCbs.push(function() {
			/*var newGrfBuffer = new Buffer(4);
			newGrfBuffer.writeUInt32LE(0, 0);*/
			var newGrfBuffer = new Buffer([0x46, 0x6B, 0x38, 0x15]); // TODO: proper newGrf version

			var packet = Buffer.concat([
				new Buffer([PACKET.CLIENT_JOIN]),
				new Buffer("1.5.3\0"),
				newGrfBuffer,
				new Buffer("simbot\0"),
				new Buffer([0xFF, 0x00]),
			]);
			self.send(packet);
			self.emit("status", "joining");
		});
		self.send(new Buffer([PACKET.CLIENT_COMPANY_INFO]));
		self.emit("status", "getting company info");
	});

	self.socket.on("data", function(buffer) {
		//console.log("data", buffer);
		self.data = Buffer.concat([self.data, buffer]);
		self.handle();
	});

	self.socket.on("error", function(err) {
		self.emit("error", err);
	});

	self.socket.on("close", function(had_error) {
		self.emit("status", "closed");
		//console.log("close", had_error);
		self.emit("close");
	});
};

Client.prototype.send = function(packet) {
	var self = this;

	if (self.open) {
		var lenBuffer = new Buffer(2);
		lenBuffer.writeUInt16LE(packet.length + lenBuffer.length, 0);

		var outBuffer = Buffer.concat([lenBuffer, packet]);
		//console.log("send", outBuffer);
		self.socket.write(outBuffer);
	}
};

Client.prototype.handle = function() {
	var self = this;

	if (self.data.length >= 2) {
		var len = self.data.readUInt16LE(0);
		if (len <= self.data.length) {
			var packet = new Buffer(len - 2);
			self.data.copy(packet, 0, 2, len);
			//console.log("packet", packet);
			self.emit("packet", packet);

			self.data = self.data.slice(len);
			self.handle();
		}
	}
};

Client.prototype.chat = function(msg) {
	var self = this;

	var destBuffer = new Buffer(4);
	destBuffer.writeUInt32LE(1, 0);
	var dataBuffer = new Buffer(8);
	dataBuffer.fill(0x00);

	var packet = Buffer.concat([
		new Buffer([PACKET.CLIENT_CHAT, NETWORK_ACTION.CHAT, DESTTYPE.BROADCAST]),
		destBuffer,
		new Buffer(msg + "\0"),
		dataBuffer,
	]);
	self.send(packet);
};

Client.prototype.end = function() {
	var self = this;

	var packet = new Buffer([PACKET.CLIENT_QUIT]);
	self.send(packet);
};

module.exports = Client;
