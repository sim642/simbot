require("./patch-buffer");

var util = require("util");
var EventEmitter = require("events").EventEmitter;

var net = require("net");
var BufferReader = require("buffer-reader");

var packetTypes = {
	PACKET_SERVER_FULL: 0,
	PACKET_SERVER_FULL: 1,
	PACKET_CLIENT_JOIN: 2,
	PACKET_SERVER_ERROR: 3,
	PACKET_CLIENT_COMPANY_INFO: 4,
	PACKET_SERVER_COMPANY_INFO: 5,
	PACKET_SERVER_CHECK_NEWGRFS: 6,
	PACKET_CLIENT_NEWGRFS_CHECKED: 7,
	PACKET_SERVER_NEED_GAME_PASSWORD: 8,
	PACKET_CLIENT_GAME_PASSWORD: 9,
	PACKET_SERVER_NEED_COMPANY_PASSWORD: 10,
	PACKET_CLIENT_COMPANY_PASSWORD: 11,
	PACKET_SERVER_WELCOME: 12,
	PACKET_SERVER_CLIENT_INFO: 13,
	PACKET_CLIENT_GETMAP: 14,
	PACKET_SERVER_WAIT: 15,
	PACKET_SERVER_MAP_BEGIN: 16,
	PACKET_SERVER_MAP_SIZE: 17,
	PACKET_SERVER_MAP_DATA: 18,
	PACKET_SERVER_MAP_DONE: 19,
	PACKET_CLIENT_MAP_OK: 20,
	PACKET_SERVER_JOIN: 21,
	PACKET_SERVER_FRAME: 22,
	PACKET_CLIENT_ACK: 23,
	PACKET_SERVER_SYNC: 24,
	PACKET_CLIENT_COMMAND: 25,
	PACKET_SERVER_COMMAND: 26,
	PACKET_CLIENT_CHAT: 27,
	PACKET_SERVER_CHAT: 28,
	PACKET_CLIENT_RCON: 29,
	PACKET_SERVER_RCON: 30,
	PACKET_CLIENT_MOVE: 31,
	PACKET_SERVER_MOVE: 32,
	PACKET_CLIENT_SET_PASSWORD: 33,
	PACKET_CLIENT_SET_NAME: 34,
	PACKET_SERVER_COMPANY_UPDATE: 35,
	PACKET_SERVER_CONFIG_UPDATE: 36,
	PACKET_SERVER_NEWGAME: 37,
	PACKET_SERVER_SHUTDOWN: 38,
	PACKET_CLIENT_QUIT: 39,
	PACKET_SERVER_QUIT: 40,
	PACKET_CLIENT_ERROR: 41,
	PACKET_SERVER_ERROR_QUIT: 42,
	PACKET_END: 43,
};

function Client() {
	var self = this;

	self.socket = null;

	self.clientId = null;
	self.clients = {};
	self.ackToken = null;
	self.frameCnt = 0;

	self.on("packet", function(packet) {
		self.emit("packet#" + packet.readUInt8(0), packet.slice(1));
	});

	self.on("packet#5", function(buffer) {
		var moreData = !!buffer.readUInt8(1);
		if (!moreData) {
			/*var newGrfBuffer = new Buffer(4);
			newGrfBuffer.writeUInt32LE(0, 0);*/
			var newGrfBuffer = new Buffer([0x46, 0x6B, 0x38, 0x15]);

			var packet = Buffer.concat([
				new Buffer([0x02]),
				new Buffer("1.5.3\0"),
				newGrfBuffer,
				new Buffer("simbot\0"),
				new Buffer([0xFF, 0x00]),
			]);
			self.send(packet);
		}
	});

	self.on("packet#12", function(buffer) {
		self.clientId = buffer.readUInt32LE(0);
	});

	self.on("packet#13", function(buffer) {
		var reader = new BufferReader(buffer);

		var client = {};
		client.id = reader.nextUInt32LE();
		client.playAs = reader.nextUInt8();
		client.name = reader.nextStringZero();

		self.clients[client.id] = client;

		self.send(new Buffer([0x0E]));
	});

	self.on("packet#19", function(buffer) {
		self.send(new Buffer([0x14]));
	});

	self.on("packet#22", function(buffer) {
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
				new Buffer([0x17]),
				frameBuffer,
				new Buffer([self.ackToken]),
			]);
			self.send(packet);

			self.frameCnt = 0;
		}
	});

	self.on("packet#28", function(buffer) {
		var reader = new BufferReader(buffer);

		var chat = {
			actionId: reader.nextUInt8(),
			clientId: reader.nextUInt32LE(),
			self: !!reader.nextUInt8(),
			msg: reader.nextStringZero(),
			data: reader.nextUInt64LE(),
		};
		console.log("chat", chat);
	});

	EventEmitter.call(self);
}

util.inherits(Client, EventEmitter);

Client.prototype.connect = function(addr, port) {
	var self = this;

	self.socket = net.connect(port, addr);
	self.data = new Buffer(0);

	self.socket.on("connect", function() {
		console.log("connect");
		self.send(new Buffer([0x04]));
	});

	self.socket.on("data", function(buffer) {
		//console.log("data", buffer);
		self.data = Buffer.concat([self.data, buffer]);
		self.handle();
	});

	self.socket.on("close", function(had_error) {
		console.log("close", had_error);
	});
};

Client.prototype.send = function(packet) {
	var self = this;

	var lenBuffer = new Buffer(2);
	lenBuffer.writeUInt16LE(packet.length + lenBuffer.length, 0);

	var outBuffer = Buffer.concat([lenBuffer, packet]);
	//console.log("send", outBuffer);
	self.socket.write(outBuffer);
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
		new Buffer([0x1B, 0x03, 0x00]),
		destBuffer,
		new Buffer(msg + "\0"),
		new Buffer(8),
	]);
	self.send(packet);
};

module.exports = Client;
