Buffer.prototype.readUInt64BE = function(offset, noAssert) {
	return this.readInt32BE(offset + 4, noAssert) + 0x100000000 * this.readUInt32BE(offset, noAssert);
};

Buffer.prototype.readInt64BE = function(offset, noAssert) {
	var word0 = this.readUInt32BE(offset + 4, noAssert);
	var word1 = this.readUInt32BE(offset, noAssert);
	if (!(word1 & 0x80000000))
		return word0 + 0x100000000 * word1;
	return -((((~word1) >>> 0) * 0x100000000) + ((~word0) >>> 0) + 1);
};

Buffer.prototype.readUInt64LE = function(offset, noAssert) {
	return this.readInt32LE(offset, noAssert) + 0x100000000 * this.readUInt32LE(offset + 4, noAssert);
};

Buffer.prototype.readInt64LE = function(offset, noAssert) {
	var word0 = this.readUInt32LE(offset, noAssert);
	var word1 = this.readUInt32LE(offset + 4, noAssert);
	if (!(word1 & 0x80000000))
		return word0 + 0x100000000 * word1;
	return -((((~word1) >>> 0) * 0x100000000) + ((~word0) >>> 0) + 1);
};

var BufferReader = require('buffer-reader');

// from buffer-reader internals
var assert = require('assert');

function MAKE_NEXT_READER(valueName, size) {
    valueName = cap(valueName);
    BufferReader.prototype['next' + valueName] = function() {
        assert(this.offset + size <= this.buf.length, "Out of Original Buffer's Boundary");
        var val = this.buf['read' + valueName](this.offset);
        this.offset += size;
        return val;
    };
}

function MAKE_NEXT_READER_BOTH(valueName, size) {
    MAKE_NEXT_READER(valueName + 'LE', size);
    MAKE_NEXT_READER(valueName + 'BE', size);
}

MAKE_NEXT_READER_BOTH('UInt64', 8);
MAKE_NEXT_READER_BOTH('Int64', 8);

function cap(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
