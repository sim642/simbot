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

	self.on("packet", function(packet) {
		self.emit("packet#" + packet.readUInt8(0), packet.slice(1));
	});

	self.on("packet#" + PACKET.SERVER_COMPANY_INFO, function(buffer) {
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

			//console.log(company);
			self.companies[company.id] = company;
		}
		else {
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
		}
	});

	self.on("packet#" + PACKET.SERVER_WELCOME, function(buffer) {
		self.clientId = buffer.readUInt32LE(0);
	});

	self.on("packet#" + PACKET.SERVER_CLIENT_INFO, function(buffer) {
		var reader = new BufferReader(buffer);

		var client = {};
		client.id = reader.nextUInt32LE();
		client.companyId = reader.nextUInt8();
		client.name = reader.nextStringZero();

		self.clients[client.id] = client;

		self.send(new Buffer([PACKET.CLIENT_GETMAP]));
	});

	self.on("packet#" + PACKET.SERVER_MAP_DONE, function(buffer) {
		self.send(new Buffer([PACKET.CLIENT_MAP_OK]));
	});

	self.on("packet#" + PACKET.SERVER_FRAME, function(buffer) {
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

	self.on("packet#" + PACKET.SERVER_CHAT, function(buffer) {
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

	self.on("packet#" + PACKET.SERVER_ERROR, function(buffer) {
		self.emit("error", new Error(NETWORK_ERROR.getFullName(buffer.readUInt8(0))));
	});

	EventEmitter.call(self);
}

util.inherits(Client, EventEmitter);

Client.prototype.connect = function(addr, port) {
	var self = this;

	self.socket = net.connect(port, addr);
	self.data = new Buffer(0);

	self.socket.on("connect", function() {
		self.open = true;
		self.emit("connect");
		//console.log("connect");
		self.send(new Buffer([PACKET.CLIENT_COMPANY_INFO]));
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

	var packet = Buffer.concat([
		new Buffer([PACKET.CLIENT_CHAT, NETWORK_ACTION.CHAT, DESTTYPE.BROADCAST]),
		destBuffer,
		new Buffer(msg + "\0"),
		new Buffer(8),
	]);
	self.send(packet);
};

Client.prototype.end = function() {
	var self = this;

	var packet = new Buffer([PACKET.CLIENT_QUIT]);
	self.send(packet);
};

module.exports = Client;
