  var CoreLibIntUtil = function() {};

  CoreLibIntUtil.hexChars = "0123456789abcdef";
  CoreLibIntUtil.rol = function(arg1, arg2) {
		return arg1 << arg2 | arg1 >>> 32 - arg2;
  };
  CoreLibIntUtil.ror = function(arg1, arg2) {
		var tmp = 32 - arg2;
		return arg1 << tmp | arg1 >>> 32 - tmp;
  };
  CoreLibIntUtil.toHex = function(value) {
		var retVal = "";
		for (var i = 0; i < 4; i++) {
			  retVal = retVal + (CoreLibIntUtil.hexChars.charAt(value >> i * 8 + 4 & 15) + CoreLibIntUtil.hexChars.charAt(value >> i * 8 & 15));
		}
		return retVal;
  };

  var CoreLibMD5 = function() {
  };

  CoreLibMD5.hash = function(stringToHash) {
		return CoreLibMD5.hashBinary(new Buffer(stringToHash, "utf8"));
  };
  CoreLibMD5.hashBinary = function(inputBuffer) {
		var _loc3_ = 0;
		var _loc2_ = 0;
		var _loc12_ = 0;
		var _loc11_ = 0;
		var _loc6_ = 0;
		var _loc8_ = 1732584193;
		var _loc7_ = -271733879;
		var _loc10_ = -1732584194;
		var _loc9_ = 271733878;
		var _loc5_ = CoreLibMD5.createBlocks(inputBuffer);
		var _loc4_ = _loc5_.length;
		_loc6_ = 0;
		while (_loc6_ < _loc4_) {
			  _loc3_ = _loc8_;
			  _loc2_ = _loc7_;
			  _loc12_ = _loc10_;
			  _loc11_ = _loc9_;
			  _loc8_ = CoreLibMD5.ff(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 0], 7, -680876936);
			  _loc9_ = CoreLibMD5.ff(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 1], 12, -389564586);
			  _loc10_ = CoreLibMD5.ff(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 2], 17, 606105819);
			  _loc7_ = CoreLibMD5.ff(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 3], 22, -1044525330);
			  _loc8_ = CoreLibMD5.ff(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 4], 7, -176418897);
			  _loc9_ = CoreLibMD5.ff(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 5], 12, 1200080426);
			  _loc10_ = CoreLibMD5.ff(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 6], 17, -1473231341);
			  _loc7_ = CoreLibMD5.ff(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 7], 22, -45705983);
			  _loc8_ = CoreLibMD5.ff(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 8], 7, 1770035416);
			  _loc9_ = CoreLibMD5.ff(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 9], 12, -1958414417);
			  _loc10_ = CoreLibMD5.ff(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 10], 17, -42063);
			  _loc7_ = CoreLibMD5.ff(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 11], 22, -1990404162);
			  _loc8_ = CoreLibMD5.ff(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 12], 7, 1804603682);
			  _loc9_ = CoreLibMD5.ff(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 13], 12, -40341101);
			  _loc10_ = CoreLibMD5.ff(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 14], 17, -1502002290);
			  _loc7_ = CoreLibMD5.ff(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 15], 22, 1236535329);
			  _loc8_ = CoreLibMD5.gg(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 1], 5, -165796510);
			  _loc9_ = CoreLibMD5.gg(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 6], 9, -1069501632);
			  _loc10_ = CoreLibMD5.gg(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 11], 14, 643717713);
			  _loc7_ = CoreLibMD5.gg(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 0], 20, -373897302);
			  _loc8_ = CoreLibMD5.gg(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 5], 5, -701558691);
			  _loc9_ = CoreLibMD5.gg(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 10], 9, 38016083);
			  _loc10_ = CoreLibMD5.gg(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 15], 14, -660478335);
			  _loc7_ = CoreLibMD5.gg(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 4], 20, -405537848);
			  _loc8_ = CoreLibMD5.gg(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 9], 5, 568446438);
			  _loc9_ = CoreLibMD5.gg(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 14], 9, -1019803690);
			  _loc10_ = CoreLibMD5.gg(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 3], 14, -187363961);
			  _loc7_ = CoreLibMD5.gg(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 8], 20, 1163531501);
			  _loc8_ = CoreLibMD5.gg(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 13], 5, -1444681467);
			  _loc9_ = CoreLibMD5.gg(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 2], 9, -51403784);
			  _loc10_ = CoreLibMD5.gg(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 7], 14, 1735328473);
			  _loc7_ = CoreLibMD5.gg(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 12], 20, -1926607734);
			  _loc8_ = CoreLibMD5.hh(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 5], 4, -378558);
			  _loc9_ = CoreLibMD5.hh(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 8], 11, -2022574463);
			  _loc10_ = CoreLibMD5.hh(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 11], 16, 1839030562);
			  _loc7_ = CoreLibMD5.hh(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 14], 23, -35309556);
			  _loc8_ = CoreLibMD5.hh(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 1], 4, -1530992060);
			  _loc9_ = CoreLibMD5.hh(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 4], 11, 1272893353);
			  _loc10_ = CoreLibMD5.hh(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 7], 16, -155497632);
			  _loc7_ = CoreLibMD5.hh(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 10], 23, -1094730640);
			  _loc8_ = CoreLibMD5.hh(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 13], 4, 681279174);
			  _loc9_ = CoreLibMD5.hh(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 0], 11, -358537222);
			  _loc10_ = CoreLibMD5.hh(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 3], 16, -722521979);
			  _loc7_ = CoreLibMD5.hh(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 6], 23, 76029189);
			  _loc8_ = CoreLibMD5.hh(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 9], 4, -640364487);
			  _loc9_ = CoreLibMD5.hh(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 12], 11, -421815835);
			  _loc10_ = CoreLibMD5.hh(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 15], 16, 530742520);
			  _loc7_ = CoreLibMD5.hh(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 2], 23, -995338651);
			  _loc8_ = CoreLibMD5.ii(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 0], 6, -198630844);
			  _loc9_ = CoreLibMD5.ii(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 7], 10, 1126891415);
			  _loc10_ = CoreLibMD5.ii(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 14], 15, -1416354905);
			  _loc7_ = CoreLibMD5.ii(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 5], 21, -57434055);
			  _loc8_ = CoreLibMD5.ii(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 12], 6, 1700485571);
			  _loc9_ = CoreLibMD5.ii(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 3], 10, -1894986606);
			  _loc10_ = CoreLibMD5.ii(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 10], 15, -1051523);
			  _loc7_ = CoreLibMD5.ii(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 1], 21, -2054922799);
			  _loc8_ = CoreLibMD5.ii(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 8], 6, 1873313359);
			  _loc9_ = CoreLibMD5.ii(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 15], 10, -30611744);
			  _loc10_ = CoreLibMD5.ii(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 6], 15, -1560198380);
			  _loc7_ = CoreLibMD5.ii(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 13], 21, 1309151649);
			  _loc8_ = CoreLibMD5.ii(_loc8_, _loc7_, _loc10_, _loc9_, _loc5_[_loc6_ + 4], 6, -145523070);
			  _loc9_ = CoreLibMD5.ii(_loc9_, _loc8_, _loc7_, _loc10_, _loc5_[_loc6_ + 11], 10, -1120210379);
			  _loc10_ = CoreLibMD5.ii(_loc10_, _loc9_, _loc8_, _loc7_, _loc5_[_loc6_ + 2], 15, 718787259);
			  _loc7_ = CoreLibMD5.ii(_loc7_, _loc10_, _loc9_, _loc8_, _loc5_[_loc6_ + 9], 21, -343485551);
			  _loc8_ = (_loc8_ + _loc3_) & 0xFFFFFFFF;
			  _loc7_ = (_loc7_ + _loc2_) & 0xFFFFFFFF;
			  _loc10_ = (_loc10_ + _loc12_) & 0xFFFFFFFF;
			  _loc9_ = (_loc9_ + _loc11_) & 0xFFFFFFFF;
			  _loc6_ = (_loc6_ + 16) & 0xFFFFFFFF;
		}
		return CoreLibIntUtil.toHex(_loc8_) + CoreLibIntUtil.toHex(_loc7_) + CoreLibIntUtil.toHex(_loc10_) + CoreLibIntUtil.toHex(_loc9_);
  };
  CoreLibMD5.f = function(param1, param2, param3) {
		var ret = param1 & param2 | ~param1 & param3;
		return ret;
  };
  CoreLibMD5.g = function(param1, param2, param3) {
		return param1 & param3 | param2 & ~param3;
  };
  CoreLibMD5.h = function(param1, param2, param3) {
		return param1 ^ param2 ^ param3;
  };
  CoreLibMD5.i = function(param1, param2, param3) {
		return param2 ^ (param1 | ~param3);
  };
  CoreLibMD5.transform = function(param1, param2, param3, param4, param5, param6, param7, param8) {
	  param6 = param6 || 0;
		var _loc9_ = (param2 + parseInt(param1(param3, param4, param5)) + param6 + param8) & 0xFFFFFFFF;
		var rol = CoreLibIntUtil.rol(_loc9_, param7);
		var ret = (rol + param3) & 0xFFFFFFFF;
		return ret;
  };
  CoreLibMD5.ff = function(param1, param2, param3, param4, param5, param6, param7) {
		return CoreLibMD5.transform(CoreLibMD5.f, param1, param2, param3, param4, param5, param6, param7);
  };
  CoreLibMD5.gg = function(param1, param2, param3, param4, param5, param6, param7) {
		return CoreLibMD5.transform(CoreLibMD5.g, param1, param2, param3, param4, param5, param6, param7);
  };
  CoreLibMD5.hh = function(param1, param2, param3, param4, param5, param6, param7) {
		return CoreLibMD5.transform(CoreLibMD5.h, param1, param2, param3, param4, param5, param6, param7);
  };
  CoreLibMD5.ii = function(param1, param2, param3, param4, param5, param6, param7) {
		return CoreLibMD5.transform(CoreLibMD5.i, param1, param2, param3, param4, param5, param6, param7);
  };
  CoreLibMD5.createBlocks = function(inputBuffer) {
		var _loc4_ = 0;
		var _loc3_ = [];
		var _loc2_ = inputBuffer.length * 8;
		var _loc5_ = 255;
		var _loc6_, _loc7_;
		_loc4_ = 0;
		while (_loc4_ < _loc2_) {
			  _loc6_ = _loc4_ >> 5;
			  _loc7_ = _loc3_[_loc6_] | (inputBuffer[_loc4_ / 8] & _loc5_) << _loc4_ % 32;
			  _loc3_[_loc6_] = _loc7_;
			  _loc4_ = _loc4_ + 8;
		}
		_loc7_ = _loc2_ >> 5;
		_loc6_ = _loc3_[_loc7_] | 128 << _loc2_ % 32;
		_loc3_[_loc7_] = _loc6_;
		_loc3_[(_loc2_ + 64 >>> 9 << 4) + 14] = _loc2_;
		for (var i = 0; i < _loc3_.length; i++) {
			_loc3_[i] = _loc3_[i] || 0;
		}
		return _loc3_;
  };

exports.hash = CoreLibMD5.hash;
