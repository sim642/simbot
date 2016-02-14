require('./patch-buffer');

var dgram = require('dgram');
var BufferReader = require('buffer-reader');

var server = dgram.createSocket('udp4');

function openttdDate(days, old) {
	var d = new Date(0, 0, 1);
	d.setFullYear((old || false) ? 1920 : 0);
	d.setDate(days + 1);
	return d;
}

function openttdParse(buffer) {
	var reader = new BufferReader(buffer);
	var obj = {};

	obj.length = reader.nextUInt16LE();
	if (buffer.length != obj.length)
		return obj;

	obj.type = reader.nextUInt8();
	var data = {};
	switch (obj.type) {
		case 0x01: // PACKET_UDP_SERVER_RESPONSE
			data.version = reader.nextUInt8();

			if (data.version >= 4) {
				var numNewgrf = reader.nextUInt8();
				data.newgrfs = [];
				for (var i = 0; i < numNewgrf; i++) {
					data.newgrfs.push({id: reader.nextBuffer(4), md5: reader.nextBuffer(16)});
				}
			}

			if (data.version >= 3) {
				data.curDate = openttdDate(reader.nextUInt32LE());
				data.startDate = openttdDate(reader.nextUInt32LE());
			}

			if (data.version >= 2) {
				data.maxCompany = reader.nextUInt8();
				data.numCompany = reader.nextUInt8();
				data.maxSpectator = reader.nextUInt8();
			}

			if (data.version >= 1) {
				data.name = reader.nextStringZero();
				data.rev = reader.nextStringZero();
				data.lang = ['any', 'en', 'de', 'fr'][reader.nextUInt8()];
				data.passworded = !!reader.nextUInt8();
				data.maxClient = reader.nextUInt8();
				data.numClient = reader.nextUInt8();
				data.numSpectator = reader.nextUInt8();

				if (data.version < 3) {
					data.curDate = openttdDate(reader.nextUInt16LE(), true);
					data.startDate = openttdDate(reader.nextUInt16LE(), true);
				}

				data.map = {
					name: reader.nextStringZero(),
					width: reader.nextUInt16LE(),
					height: reader.nextUInt16LE(),
					set: ['temperate', 'arctic', 'desert', 'toyland'][reader.nextUInt8()]
				};

				data.dedicated = !!reader.nextUInt8();
			}
			break;

		case 0x03: // PACKET_UDP_SERVER_DETAIL_INFO
			data.version = reader.nextUInt8();
			var numCompany = reader.nextUInt8();

			var types = ['train', 'lorry', 'bus', 'plane', 'ship'];

			data.companies = [];
			for (var i = 0; i < numCompany; i++) {
				var company = {};

				company.id = reader.nextUInt8();
				company.name = reader.nextStringZero();
				company.startYear = reader.nextUInt32LE();

				company.value = reader.nextInt64LE();
				company.money = reader.nextInt64LE();
				company.income = reader.nextInt64LE();
				company.performance = reader.nextUInt16LE();

				company.passworded = !!reader.nextUInt8();

				company.vehicles = {};
				types.forEach(function(type) {
					company.vehicles[type] = reader.nextUInt16LE();
				});

				company.stations = {};
				types.forEach(function(type) {
					company.stations[type] = reader.nextUInt16LE();
				});

				company.ai = !!reader.nextUInt8();

				data.companies.push(company);
			}
			break;
	}
	obj.data = data;

	return obj;
}

function openttdQuery(addr, port, callback) {
	var server = dgram.createSocket('udp4');
	var ret = {};
	var todo = null;

	var send = function(type) {
		server.send(new Buffer([0x03, 0x00, type]), 0, 3, port, addr);
	};

	var timeout = setTimeout(function() {
		server.close();
		callback(new Error("Timed out"));
	}, 10 * 1000);

	server.on('listening', function() {
		todo = 2;
		send(0x00); // PACKET_UDP_CLIENT_FIND_SERVER
		send(0x02); // PACKET_UDP_CLIENT_DETAIL_INFO
	});

	server.on('message', function(buffer, remote) {
		// TODO: check remote correctness
		var obj = openttdParse(buffer);
		ret[obj.type] = obj.data;
		todo--;

		if (todo == 0) {
			clearTimeout(timeout);
			server.close();
			callback(null, ret);
		}
	});

	server.once('error', function(err) {
		clearTimeout(timeout);
		callback(err);
	});

	server.bind();
}

exports.query = openttdQuery;
