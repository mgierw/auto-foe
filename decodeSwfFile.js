var fs = require('fs');

//var fd = fs.openSync('test/Main.swf', 'r');
var fdn = fs.openSync('test/Main-decoded.swf', 'w');

var byteArray = fs.readFileSync('test/Main.swf');
var byteArrayLength = byteArray.length;

console.log(byteArrayLength);

var getBufferLength = function() {
	return byteArray[byteArrayLength - 1] << 24 | byteArray[byteArrayLength - 2] << 16 | byteArray[byteArrayLength - 3] << 8 | byteArray[byteArrayLength - 4];
};

var getXorValue = function(bufferLength) {
	var xorIndex = bufferLength;
	while(xorIndex > 255) {
		xorIndex = xorIndex >> 1;
	}
	return xorIndex;
};

var bufferLength = getBufferLength();
var xorIndex = getXorValue(bufferLength);
console.log(bufferLength);
console.log(xorIndex);

for (var i = 0; i < bufferLength; i++) {
   byteArray[i] = byteArray[i] ^ xorIndex;
}

fs.writeSync(fdn, byteArray, 0, bufferLength, 0);

fs.closeSync(fdn);
//fs.closeSync(fd);
