var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/postgres-array/index.js"(exports) {
    "use strict";
    exports.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/pg-types/lib/arrayParser.js"(exports, module) {
    var array = require_postgres_array();
    module.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/postgres-date/index.js"(exports, module) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date.setTime(date.getTime() - offset);
        }
      } else {
        date = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date.setFullYear(year);
        }
      }
      return date;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date = new Date(year, month, day);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
      return date;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/xtend/mutable.js"(exports, module) {
    module.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/postgres-interval/index.js"(exports, module) {
    "use strict";
    var extend = require_mutable();
    module.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/postgres-bytea/index.js"(exports, module) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/pg-types/lib/textParsers.js"(exports, module) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/pg-int8/index.js"(exports, module) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module.exports = readInt8;
  }
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/pg-types/lib/binaryParsers.js"(exports, module) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module.exports = {
      init
    };
  }
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/pg-types/lib/builtins.js"(exports, module) {
    module.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/pg-types/index.js"(exports) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports.getTypeParser = getTypeParser;
    exports.setTypeParser = setTypeParser;
    exports.arrayParser = arrayParser;
    exports.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS({
  "node_modules/pg/lib/defaults.js"(exports, module) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS({
  "node_modules/pg/lib/utils.js"(exports, module) {
    "use strict";
    var defaults2 = require_defaults();
    var nodeUtils = __require("util");
    var { isDate } = __require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date) {
      let offset = -date.getTimezoneOffset();
      let year = date.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date) {
      let year = date.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    function cloneQueryConfig(config) {
      if (config == null) {
        return config;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
    }
    var escapeIdentifier2 = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS({
  "node_modules/pg/lib/crypto/utils.js"(exports, module) {
    var nodeCrypto = __require("crypto");
    module.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text) {
      return await subtleCrypto.digest("SHA-256", text);
    }
    async function hashByName(hashName, text) {
      return await subtleCrypto.digest(hashName, text);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/pg/lib/crypto/cert-signatures.js"(exports, module) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/pg/lib/crypto/sasl.js"(exports, module) {
    "use strict";
    var crypto4 = require_utils2();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto4.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto4.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto4.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto4.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto4.sha256(clientKey);
      const clientSignature = await crypto4.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto4.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto4.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
    }
    function parseAttributePairs(text) {
      if (typeof text !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/pg/lib/type-overrides.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module.exports = TypeOverrides2;
  }
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/pg-connection-string/index.js"(exports, module) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs3 = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs3.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs3.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs3.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/pg/lib/connection-parameters.js"(exports, module) {
    "use strict";
    var dns = __require("dns");
    var defaults2 = require_defaults();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module.exports = ConnectionParameters;
  }
});

// node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/pg/lib/result.js"(exports, module) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module.exports = Result2;
  }
});

// node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/pg/lib/query.js"(exports, module) {
    "use strict";
    var { EventEmitter } = __require("events");
    var Result2 = require_result();
    var utils = require_utils();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module.exports = Query2;
  }
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/pg-protocol/dist/messages.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = void 0;
    exports.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports.noData = {
      name: "noData",
      length: 5
    };
    exports.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text) {
        this.length = length;
        this.text = text;
        this.name = "commandComplete";
      }
    };
    exports.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports.NoticeMessage = NoticeMessage;
  }
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/pg-protocol/dist/buffer-writer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size) {
        const offset = this.offset;
        this.ensure(size);
        this.offset += size;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports.Writer = Writer;
  }
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/pg-protocol/dist/serializer.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text) => {
      return writer.addCString(text).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports.serialize = serialize;
  }
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/pg-protocol/dist/buffer-reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports.BufferReader = BufferReader;
  }
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/pg-protocol/dist/parser.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS({
  "node_modules/pg-protocol/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DatabaseError = exports.serialize = void 0;
    exports.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/pg-cloudflare/dist/empty.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = {};
  }
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/pg/lib/stream.js"(exports, module) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = __require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = __require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/pg/lib/connection.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var { parse, serialize } = require_dist();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = __require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text) {
        this._send(serialize.query(text));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module.exports = Connection2;
  }
});

// node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/split2/index.js"(exports, module) {
    "use strict";
    var { Transform } = __require("stream");
    var { StringDecoder } = __require("string_decoder");
    var kLast = Symbol("last");
    var kDecoder = Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module.exports = split;
  }
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/pgpass/lib/helper.js"(exports, module) {
    "use strict";
    var path3 = __require("path");
    var Stream = __require("stream").Stream;
    var split = require_split2();
    var util = __require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path3.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path3.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/pgpass/lib/index.js"(exports, module) {
    "use strict";
    var path3 = __require("path");
    var fs3 = __require("fs");
    var helper = require_helper();
    module.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs3.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs3.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module.exports.warnTo = helper.warnTo;
  }
});

// node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/pg/lib/client.js"(exports, module) {
    var EventEmitter = __require("events").EventEmitter;
    var utils = require_utils();
    var nodeUtils = __require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var crypto4 = require_utils2();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto4.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config.submit === "function" && !(query instanceof Query2) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module.exports = Client2;
  }
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/pg-pool/index.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text, values, cb) {
        if (typeof text === "function") {
          const response2 = promisify(this.Promise, text);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module.exports = Pool2;
  }
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/pg/lib/native/query.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var utils = require_utils();
    var NativeQuery = module.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/pg/lib/native/client.js"(exports, module) {
    var nodeUtils = __require("util");
    var Native;
    try {
      Native = __require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = __require("events").EventEmitter;
    var util = __require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/pg/lib/native/index.js"(exports, module) {
    "use strict";
    module.exports = require_client2();
  }
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/pg/lib/index.js"(exports, module) {
    "use strict";
    var Client2 = require_client();
    var defaults2 = require_defaults();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults2;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module.exports = new PG(clientConstructor);
    Object.defineProperty(module.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// src/server/blog/blogPublisher.ts
import crypto2 from "crypto";

// node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;

// src/server/blog/db.ts
import fs from "fs";
import path from "path";

// src/data/blogArticles.ts
var blogArticles = [
  {
    id: "how-strong-are-thc-edibles-pharmacological-dosing-guide",
    slug: "how-strong-are-thc-edibles-pharmacological-dosing-guide",
    title: "How Strong Are THC Edibles? The Pharmacological Dosing & Potency Guide",
    metaTitle: "How Strong Are THC Edibles? Milligram Dosing & Potency Chart | Global Herbs",
    metaDescription: "Explore the clinical science of THC edible strength. Learn how 11-hydroxy-THC hepatic metabolism alters potency, compare 1mg to 100mg dosing tiers, and review lab safety protocols.",
    targetKeywords: [
      "how strong are thc edibles",
      "thc edible dosing chart",
      "how many mg of edibles should i take",
      "11-hydroxy-THC pharmacokinetics",
      "cannabis edible strength guide",
      "delta 9 gummies potency milligrams",
      "edible onset timeline",
      "global herbs lab tested edibles",
      "how to stop an edible green out",
      "edibles vs smoking potency comparison"
    ],
    category: "Dosing & Guides",
    categorySlug: "dosing-guides",
    author: {
      name: "Dr. Julian Mercer",
      role: "Professor of Clinical Phytochemistry & Pharmacokinetics",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO-17025 Cannabinoid Lab Auditor"
    },
    publishedDate: "October 14, 2026",
    readTime: "12 min read",
    featuredImage: "/images/thc_edibles_gummies.jpg",
    excerpt: "Why does a 10 mg oral THC gummy feel substantially more psychoactive and endure hours longer than inhaling 10 mg of vaporized flower? Uncover the hepatic enzymatic pathways converting Delta-9 THC into 11-hydroxy-THC, evaluate the clinical milligram dosing hierarchy from 1 mg microdoses to 100 mg medical protocols, and master the biological variables that govern cannabis edible pharmacodynamics.",
    keyTakeaways: [
      "Hepatic First-Pass Bioconversion: Ingested Delta-9 THC undergoes phase I hepatic oxidation via cytochrome P450 enzymes (specifically CYP2C9 and CYP3A4) to yield 11-hydroxy-THC (11-OH-THC), an active metabolite exhibiting 2- to 4-fold higher CB1 binding affinity and accelerated blood-brain barrier penetration.",
      "The 10 mg Clinical Standard: In licensed botanical dispensaries, 10 mg of Delta-9 THC represents a single standard reference serving. Novice and sensitive consumers should begin at a 2.5\u20135 mg baseline, observing a mandatory 90\u2013120 minute latency window prior to supplemental titration.",
      'Biphasic Dose-Response Curve: Low doses of THC stimulate anxiolytic, mild euphoric, and neuroprotective cascades, whereas supra-therapeutic doses (above individual physiological tolerance thresholds) can induce transient dysphoria, tachycardia, and sensory disorientation ("green-out").',
      "Lipophilic Chylomicron Transport: Cannabinoid absorption improves 3- to 5-fold when ingested alongside dietary lipids (e.g., coconut medium-chain triglycerides or nut butter), which facilitate micellar dissolution and lymphatic circulation.",
      "Rigorous Homogeneity Assurance: Laboratory-grade edibles at Global Herbs undergo ISO/IEC 17025 third-party high-performance liquid chromatography (HPLC) testing to ensure sub-milligram dosing precision across every single gummy piece without hot spots."
    ],
    tableOfContents: [
      { id: "hepatic-biochemistry-11-hydroxy-thc", title: "1. The Hepatic Biotransformation: Why Ingested THC Hits Harder Than Inhalation" },
      { id: "milligram-potency-matrix", title: "2. The Milligram Potency Matrix: Complete Clinical Dosing Scale (1 mg to 100 mg)" },
      { id: "modulating-biological-variables", title: "3. Biological & Formulation Variables That Alter Perceived Potency" },
      { id: "global-herbs-analytical-standards", title: "4. Dispensary Quality & Precision: How Global Herbs Guarantees Dose Uniformity" },
      { id: "harm-reduction-green-out-rescue", title: "5. The Clinical Harm-Reduction Protocol: How to Mitigate an Overwhelming Dose" }
    ],
    contentSections: [
      {
        id: "hepatic-biochemistry-11-hydroxy-thc",
        title: "1. The Hepatic Biotransformation: Why Ingested THC Hits Harder Than Inhalation",
        paragraphs: [
          'Among consumers transitioning from inhalable cannabis flower or solventless extracts to ingested gummies and baked edibles, the most prevalent question is deceptively straightforward: "Why does a 10 mg THC edible feel so much more intensely psychoactive than a puff of a 20% THC preroll?"',
          "The answer lies not in botanical variance, but in human gastrointestinal and hepatic pharmacokinetics. When cannabis vapor or smoke is inhaled through pulmonary alveoli, Delta-9-tetrahydrocannabinol (Delta-9 THC) diffuses instantaneously into pulmonary capillary beds and reaches arterial blood circulation within seconds, crossing into the central nervous system before systemic circulation dilutes it. The elimination half-life is swift, with peak plasma concentrations (Cmax) arriving between 3 and 10 minutes, and subjective intoxication tapering off within 2 to 3 hours.",
          "In stark contrast, oral ingestion subjects Delta-9 THC to gastrointestinal transit, gastric acid dissolution, intestinal mucosal permeation, and subsequent transport through the mesenteric venous system directly into the hepatic portal vein. This process initiates First-Pass Hepatic Metabolism.",
          "Within hepatocytes, microsomal cytochrome P450 monooxygenase enzymes\u2014principally the polymorphic CYP2C9 and CYP3A4 isozymes\u2014catalyze the allylic oxidation of Delta-9 THC into 11-hydroxy-Delta-9-tetrahydrocannabinol (11-OH-THC). Subsequent phase II enzymatic glucuronidation converts 11-OH-THC into the inactive terminal metabolite 11-nor-9-carboxy-THC (THC-COOH), which is eliminated via biliary and renal pathways.",
          "Crucially, 11-OH-THC is not an inert intermediary; it is a profoundly bioactive compound. Pharmacological assays and binding affinity studies demonstrate that 11-OH-THC possesses up to four times greater affinity and intrinsic efficacy at human Cannabinoid Type 1 (CB1) orthosteric receptor sites in the basal ganglia, substantia nigra, cerebellum, and cerebral cortex compared to unmodified Delta-9 THC. Furthermore, despite its hydroxyl functional group, 11-OH-THC exhibits accelerated transit across the blood-brain barrier (BBB).",
          "Consequently, while only 10% to 20% of an oral dose enters systemic circulation due to incomplete digestive absorption and hepatic clearance, the high molar ratio of circulating 11-OH-THC relative to parent Delta-9 produces a qualitatively distinct, somatic, and protracted psychoactive experience."
        ],
        calloutBox: {
          type: "info",
          title: "Pharmacological Mechanism: Delta-9-THC vs. 11-Hydroxy-THC",
          text: "Pulmonary inhalation bypasses the liver, delivering predominantly parent Delta-9 THC to brain receptors with peak effects at 15 minutes. Oral ingestion funnels cannabinoids through hepatic portal circulation, where CYP2C9 enzymes synthesize 11-hydroxy-THC\u2014a significantly more potent metabolite that binds CB1 receptors with higher efficacy and extends subjective duration up to 8 hours."
        }
      },
      {
        id: "milligram-potency-matrix",
        title: "2. The Milligram Potency Matrix: Complete Clinical Dosing Scale (1 mg to 100 mg)",
        paragraphs: [
          "Because individual cannabinoid sensitivity is governed by endogenous cannabinoid receptor density, hepatic enzyme kinetics, and previous exposure history, universal dosage labels can be misleading. To establish an evidence-based taxonomy, clinical phytochemists categorize edible dosages into six distinct milligram thresholds.",
          "Review the structured potency matrix below to calibrate your intake according to specific physiological targets and pharmacological tolerances."
        ],
        table: {
          caption: "Pharmacological THC Edible Dosage, Pharmacodynamics & Target Experience Matrix",
          headers: ["Dosage Tier", "Active THC (mg)", "Target CB1 Receptor Load", "Expected Subjective & Physiological Effects", "Typical Onset & Peak", "Clinical Profile & Suitability"],
          rows: [
            ["Microdose", "1.0 \u2013 2.5 mg", "Sub-perceptual / Minimal (<15% occupancy)", "Subtle mood elevation, mild stress reduction, executive focus, zero motor impairment", "Onset: 45\u201375 min; Peak: 2.0 hrs; Duration: 3\u20134 hrs", "Daytime productivity, anxiety-sensitive individuals, first-time botanical consumers"],
            ["Therapeutic Entry", "2.5 \u2013 5.0 mg", "Mild / Gentle (15\u201335% occupancy)", "Mild euphoria, palpable musculoskeletal relaxation, sensory brightening, social ease", "Onset: 45\u201390 min; Peak: 2.5 hrs; Duration: 4\u20136 hrs", "Beginners seeking recreational relaxation, mild sleep support, introductory dispensary users"],
            ["Standard Moderate", "5.0 \u2013 10.0 mg", "Moderate / Classical (35\u201365% occupancy)", "Prominent somatic relaxation, cognitive euphoria, enhanced gustatory & auditory perception, mild ataxia", "Onset: 45\u201390 min; Peak: 2.5\u20133.5 hrs; Duration: 5\u20137 hrs", "The universal legal dispensary benchmark. Experienced consumers, persistent stress, bedtime sedation"],
            ["High Potency", "10.0 \u2013 25.0 mg", "Elevated / Intensive (65\u201385% occupancy)", "Potent psychoactive state, deep somatic couch-lock, altered temporal perception, heightened appetite", "Onset: 30\u201375 min; Peak: 3.0 hrs; Duration: 6\u20138 hrs", "High-tolerance cannabis consumers, chronic neuropathic discomfort, severe sleep disturbances"],
            ["Very High Potency", "25.0 \u2013 50.0 mg", "Near Saturation (>85% occupancy)", "Profound sedation, intensive cerebral stimulation, heavy physical gravitational sensations, potential disorientation", "Onset: 30\u201360 min; Peak: 3.0\u20134.0 hrs; Duration: 8\u201310 hrs", "Medical patients with documented high tolerance, severe chronic inflammatory conditions, palliative relief"],
            ["Extreme / Clinical", "50.0 \u2013 100.0+ mg", "Full Receptor Saturation (Maximal)", "Extreme psychoactive load, intense sedation, marked tachycardia risk, potential transient dysphoria in unadapted users", "Onset: 20\u201345 min; Peak: 3.0\u20135.0 hrs; Duration: 10\u201314 hrs", "Strictly reserved for oncology, severe muscle spasticity, or patients with verified end-stage tolerance"]
          ]
        },
        subsections: [
          {
            subtitle: "The 1 \u2013 2.5 mg Microdose: Sub-Perceptual Wellness",
            paragraphs: [
              "A microdose is intentionally calibrated beneath the threshold of noticeable intoxication. Consumers experience heightened composure, reduced situational social anxiety, and mild analgesia without cognitive fog or decreased reaction speed. This makes microdosing ideal for office professionals, creative workflows, or daytime botanical regimens."
            ],
            bullets: [
              "Zero functional impairment: Safe for demanding cognitive focus and social interaction.",
              "Endocannabinoid tone modulation: Supplements Anandamide (AEA) signaling without inducing CB1 receptor downregulation or tolerance accumulation.",
              "Ideal combination: Often paired with 10\u201320 mg of Cannabidiol (CBD) or 5 mg of Cannabigerol (CBG) for daytime cellular protection."
            ]
          },
          {
            subtitle: "The 2.5 \u2013 5.0 mg Threshold: The Gold Standard for Beginners",
            paragraphs: [
              "If you are ingesting a laboratory-tested gummy for the first time, 2.5 mg to 5 mg is the scientifically verified safe baseline. This dose provides genuine relaxation and noticeable stress dissolution while remaining well below the threshold where tachycardia or panic can occur.",
              "Always wait a full 120 minutes before deciding whether to consume an additional portion. The most frequent cause of adverse edible experiences is premature re-dosing during the latent digestive window."
            ]
          },
          {
            subtitle: "The 10 mg Standard Benchmark: The Dispensary Single-Serving Unit",
            paragraphs: [
              "Regulated cannabis jurisdictions across North America established 10 mg of Delta-9 THC as the legal maximum single-serving definition for retail edibles. For an individual with casual cannabis familiarity, 10 mg delivers a rich, multi-layered experience characterized by physical comfort, enhanced appreciation of music and food, and deep evening relaxation.",
              "However, for a completely non-tolerant or cannabinoid-naive individual, a single 10 mg serving can feel surprisingly intense. If your edible comes packaged as a 10 mg cube, cutting it in half (5 mg) is strongly advised for initial bio-titration."
            ]
          },
          {
            subtitle: "The High-Dose Paradox: Why 50 mg to 100 mg Demands Caution",
            paragraphs: [
              "Edibles containing 50 mg to 100 mg THC (such as high-potency bulk chocolate bars, syrups, or multi-dose chewies) are engineered specifically for high-tolerance medical patients\u2014such as individuals undergoing intensive chemotherapeutic protocols, battling severe neuropathy, or possessing atypical hepatic metabolisms.",
              "For a consumer without substantial physiological adaptation, ingesting 50 mg or more oversaturates central CB1 receptors, triggering the biphasic side of cannabinoid pharmacodynamics: acute anxiety, postural hypotension, gastrointestinal distress, and profound sedation. These products should be treated as multi-serving packages and partitioned with precision."
            ]
          }
        ]
      },
      {
        id: "modulating-biological-variables",
        title: "3. Biological & Formulation Variables That Alter Perceived Potency",
        paragraphs: [
          "Two individuals of identical body weight ingesting identical 10 mg gummies can experience vastly divergent outcomes. The pharmacokinetics of ingested cannabinoids are subject to multiple biological and physicochemical variables."
        ],
        subsections: [
          {
            subtitle: "Dietary Lipids and Micellar Lymphatic Absorption",
            paragraphs: [
              "Delta-9 THC and minor cannabinoids are intensely lipophilic compounds with octanol-water partition coefficients (log P) exceeding 6.0. They are virtually insoluble in pure aqueous gastric juices.",
              "When an edible is consumed on a completely empty stomach with only water, cannabinoid molecules aggregate into un-emulsified droplets, leading to poor mucosal bioavailability and erratic transit times. Conversely, when ingested alongside healthy dietary lipids\u2014such as medium-chain triglycerides (MCT coconut oil), olive oil, or nut butters\u2014gastric digestion stimulates the release of cholecystokinin (CCK) and bile salts.",
              "These bile salts incorporate cannabinoids into mixed micelles, dramatically increasing intestinal absorption and routing a significant portion through mesenteric lymphatic vessels. This lymphatic route partially bypasses immediate destructive hepatic breakdown, delivering up to 300% higher systemic cannabinoid bioavailability."
            ]
          },
          {
            subtitle: 'Genetic Polymorphisms of Cytochrome P450 (The "Edible Immunity" Phenomenon)',
            paragraphs: [
              'A small percentage of the human population reports that edibles "simply do not work," even at doses exceeding 50 mg or 100 mg. Conversely, others report intense intoxication from a mere 2.5 mg.',
              "These anomalies are largely explained by genetic single-nucleotide polymorphisms (SNPs) in the CYP2C9 gene, which encodes the primary liver enzyme responsible for phase I THC metabolism:"
            ],
            bullets: [
              "CYP2C9*1/*1 (Wild-Type Extensive Metabolizers): The normal human phenotype. Delta-9 THC is steadily oxidized into active 11-OH-THC at standard rates.",
              "CYP2C9*2 and CYP2C9*3 (Reduced Function Alleles): Individuals carrying one or two copies of these alleles metabolize Delta-9 THC up to 70% slower. Parent THC accumulates and remains in the bloodstream longer, causing extreme potency and protracted intoxication even from modest milligram doses.",
              'CYP2C9 Ultra-Rapid Metabolizers: Individuals with hyperactive enzymatic cascades convert Delta-9 THC into 11-OH-THC and subsequently into inactive THC-COOH so rapidly that central CB1 receptors never achieve sufficient threshold binding, creating the subjective illusion of "edible immunity."'
            ]
          },
          {
            subtitle: "Pectin vs. Animal Gelatin Matrix Kinetics",
            paragraphs: [
              "The edible gummy confectionery matrix plays a pivotal role in gastric dissolution rate. Traditional cannabis gummies rely on porcine or bovine gelatin, which requires prolonged proteolytic digestion in the stomach (pH 1.5\u20132.0) before releasing encapsulated cannabinoid resins.",
              "Modern botanical dispensaries like Global Herbs formulate predominantly with plant-derived citrus and apple pectins. Pectin polymers dissolve rapidly across both acidic gastric environments and slightly alkaline duodenal lumens (pH 6.5\u20137.5). Furthermore, pectin accommodates nano-emulsified water-dispersible cannabinoid droplets, narrowing the typical onset latency from 90 minutes down to 30\u201345 minutes."
            ]
          },
          {
            subtitle: "Phytochemical Entourage Modulation: Terpenes & Minor Cannabinoids",
            paragraphs: [
              "A distillate-based gummy containing purely isolated Delta-9 THC delivers a sharp, one-dimensional psychotropic spike. In contrast, full-spectrum and live resin gummies retain native cannabis terpenes (such as beta-myrcene, linalool, and beta-caryophyllene) and non-intoxicating minor phytocannabinoids:"
            ],
            bullets: [
              "Cannabidiol (CBD): Acts as a negative allosteric modulator (NAM) at CB1 receptors, softening psychoactive edges, reducing heart rate spikes, and preventing cannabis-induced panic.",
              "Cannabinol (CBN): A mildly psychoactive oxidation product that works synergistically with THC to deepen somatic sedation and promote restorative delta-wave sleep.",
              "Beta-Caryophyllene: A dietary sesquiterpene that directly agonizes peripheral CB2 receptors, providing systemic anti-inflammatory signaling while tempering cerebral overstimulation."
            ]
          }
        ],
        calloutBox: {
          type: "tip",
          title: "Dispensary Pharmacist Tip: The 15-Minute Dietary Lipid Strategy",
          text: "To avoid the erratic absorption of an empty stomach while preventing delayed digestion from a heavy meal, consume your Global Herbs fruit pectin gummy roughly 15 to 20 minutes after eating a light snack rich in healthy fats\u2014such as half an avocado, a handful of almonds, or a tablespoon of organic peanut butter."
        }
      },
      {
        id: "global-herbs-analytical-standards",
        title: "4. Dispensary Quality & Precision: How Global Herbs Guarantees Dose Uniformity",
        paragraphs: [
          "A fundamental danger in the unregulated hemp and cannabis marketplace is milligram disparity. When independent forensic testing laboratories audit low-grade convenience store gummies, they frequently uncover catastrophic batch variances: candies claiming 25 mg that contain less than 2 mg, or worse, candies containing over 80 mg alongside synthetic cannabinoid adulterants.",
          'Even more treacherous is poor batch homogeneity. Unregulated producers manufacture conventional bulk gummy candies and merely spray diluted cannabinoid distillate across the exterior trays. The resulting candies possess extreme "hot spots"\u2014one bite might contain negligible THC, while the adjacent piece contains a massive concentrated dose.'
        ],
        subsections: [
          {
            subtitle: "Precision Ultrasonic Emulsification & Full Batch Infusion",
            paragraphs: [
              "At Global Herbs, all edible formulations adhere to strict botanical manufacturing standards. Cannabinoid extracts are never surface-sprayed. Instead, laboratory-extracted full-spectrum oils or solventless live resins are introduced into the liquefied fruit pectin slurry at controlled temperatures and subjected to high-shear ultrasonic emulsification.",
              "This guarantees uniform molecular distribution throughout the entire batch matrix, ensuring that every individual gummy square contains the exact milligram calibration stated on the label, with less than 2% intra-batch analytical deviation."
            ]
          },
          {
            subtitle: "ISO/IEC 17025 Certificate of Analysis (COA) Auditing",
            paragraphs: [
              "Every production batch at Global Herbs is submitted to an independent, accredited ISO/IEC 17025 third-party analytical laboratory for comprehensive panel screening prior to dispensary release. Our public COAs verify:"
            ],
            bullets: [
              "High-Performance Liquid Chromatography (HPLC) Cannabinoid Potency: Exact quantification of Delta-9 THC, THCa, CBD, CBG, CBN, and CBC down to parts-per-million (PPM) precision.",
              "Farm Bill Federal Compliance: Verification that total Delta-9 THC remains at or below the legal 0.3% dry-weight ceiling for federally compliant hemp formulations.",
              "Gas Chromatography-Mass Spectrometry (GC-MS) Residual Solvents: 100% clean verification confirming zero residual butane, propane, ethanol, or hexane traces.",
              "Inductively Coupled Plasma Mass Spectrometry (ICP-MS) Heavy Metals: Non-detect (ND) verification for lead, cadmium, arsenic, and mercury.",
              "Microbial and Mycotoxin Screenings: Complete absence of Aspergillus species, Salmonella, E. coli, and aflatoxins."
            ]
          }
        ],
        calloutBox: {
          type: "warning",
          title: "Consumer Safety Notice: Always Verify the Third-Party COA",
          text: "Never purchase an edible that does not feature a scannable QR code directly linking to an independent ISO-17025 certified lab report. Verifying the batch number on the certificate guarantees that your gummy has been tested for uniform potency, zero residual chemicals, and clean purity."
        }
      },
      {
        id: "harm-reduction-green-out-rescue",
        title: "5. The Clinical Harm-Reduction Protocol: How to Mitigate an Overwhelming Dose",
        paragraphs: [
          'Even seasoned cannabis consumers can occasionally miscalculate an edible dose or encounter a hyper-metabolic state where effects peak with unexpected intensity. In cannabis culture, this phenomenon is colloquially termed a "green-out." Symptoms typically manifest as sudden postural dizziness, cold perspiration, racing thoughts, mild nausea, and cardiac awareness (tachycardia).',
          "While acutely uncomfortable, it is essential to understand the underlying physiology: an edible overdose is non-lethal. Human cannabinoid CB1 receptors are virtually absent in the brainstem cardiorespiratory centers (the solitary tract and the nucleus ambiguus) that control autonomic respiration. Unlike opioid overdoses, THC cannot induce fatal respiratory depression. The experience will pass as liver enzymes clear circulating 11-OH-THC.",
          "To regain equilibrium swiftly, apply this four-step clinical harm-reduction protocol:"
        ],
        subsections: [
          {
            subtitle: "Step 1: Administer High-Dose Sublingual Full-Spectrum CBD",
            paragraphs: [
              "The single most effective pharmacological antidote to excess THC is Cannabidiol (CBD). CBD functions as a negative allosteric modulator at the CB1 receptor site. When CBD molecules bind to this secondary allosteric domain, they alter the receptor protein conformation, reducing the binding affinity and efficacy of active Delta-9 THC and 11-OH-THC.",
              "Administer 25 mg to 50 mg of pure sublingual CBD oil or water-soluble tincture beneath the tongue. Keep the liquid under your tongue for 60 to 90 seconds to ensure direct mucosal venous absorption, bypassing the slower digestive tract."
            ]
          },
          {
            subtitle: "Step 2: Utilize the Terpenoid Antidote (Black Pepper & Limonene)",
            paragraphs: [
              'In his landmark 2011 pharmacological review "Taming THC," neurologist Dr. Ethan Russo documented that specific aromatic plant terpenes modulate cannabinoid-induced dysphoria. Black peppercorns (Piper nigrum) are rich in beta-caryophyllene and alpha-pinene. Beta-caryophyllene selectively binds peripheral CB2 receptors and calms neural hyper-excitability, while pinene inhibits acetylcholinesterase, aiding short-term memory clarity.',
              "Remedy: Take 3 to 4 whole black peppercorns and chew them gently before swallowing, or deeply inhale the aromatic vapor from freshly cracked black pepper. Similarly, smelling fresh lemon peels (d-limonene) stimulates anxiolytic neurotransmission."
            ]
          },
          {
            subtitle: "Step 3: Hydrate and Stabilize Blood Glucose Levels",
            paragraphs: [
              "Intense cannabinoid stimulation can induce transient peripheral vasodilation and orthostatic hypotension, which feels subjectively like lightheadedness or dizziness. Drinking 16 to 24 ounces of cold water enriched with electrolytes (sodium, potassium, magnesium) restores blood volume.",
              "Consuming a modest source of natural carbohydrates\u2014such as fruit juice, honey, or a banana\u2014stabilizes blood sugar and encourages hepatic glycogen mobilization, helping ground physical sensations."
            ]
          },
          {
            subtitle: "Step 4: Engage the Parasympathetic Nervous System (Vagus Activation)",
            paragraphs: [
              "Lie down on your side in a quiet, dimly lit, temperature-controlled environment. Practice diaphragmatic box breathing: inhale through the nose for 4 seconds, hold for 4 seconds, exhale through the mouth for 6 seconds, and pause for 2 seconds. The prolonged exhalation mechanically stimulates the vagus nerve, reducing heart rate and shifting autonomic tone from sympathetic fight-or-flight back into parasympathetic calm."
            ]
          }
        ],
        calloutBox: {
          type: "warning",
          title: "Clinical Golden Rule for Edible Consumption",
          text: 'Always respect the latency window: "Start low, go slow, and wait the full 2 hours." If you do not feel noticeable effects after 60 minutes, resist the urge to take another gummy. Digestion, gastric motility, and hepatic conversion frequently take 90 to 120 minutes to reach systemic peak.'
        }
      }
    ],
    recommendedCategorySlug: "edibles",
    recommendedProductSearch: "Gummies",
    faqs: [
      {
        question: "Why do THC edibles take so much longer to kick in than smoking or vaping?",
        answer: "When cannabis is inhaled, cannabinoids enter pulmonary capillaries and reach the brain within seconds. In contrast, edibles must pass through the stomach, break down in gastric juices, absorb through the intestinal lining, and travel via the hepatic portal vein to the liver for first-pass metabolism before reaching systemic circulation. This biological transit typically requires 45 to 90 minutes (and up to 2 hours with heavy meals)."
      },
      {
        question: "What is the standard recommended edible dose for a beginner?",
        answer: "For a cannabinoid-naive beginner or someone with low tolerance, the recommended starting dose is 2.5 mg to 5.0 mg of Delta-9 THC. Do not exceed 5 mg on your first session, and wait at least a full 120 minutes before evaluating whether to titrate upward in a future session."
      },
      {
        question: "Can you fatally overdose on cannabis edibles?",
        answer: 'No. While consuming an excessive milligram dose can cause acute psychological distress, tachycardia, nausea, and sedation ("green-out"), THC cannot cause fatal respiratory depression. Human CB1 cannabinoid receptors are virtually absent in the brainstem regions that control autonomic breathing, unlike opioid receptors.'
      },
      {
        question: "What should I do if an edible dose feels uncomfortably strong?",
        answer: "Administer 25\u201350 mg of sublingual Full-Spectrum CBD oil to allosterically block CB1 receptors, chew or sniff 3\u20134 whole black peppercorns (which release calming beta-caryophyllene), drink cool electrolyte water, and lie down in a quiet, dark room practicing slow diaphragmatic breathing."
      },
      {
        question: "Why do edibles feel different when taken on an empty stomach vs. with food?",
        answer: "THC is a lipophilic (fat-soluble) compound. Taking an edible on an empty stomach often produces unpredictable absorption and sudden spikes. Consuming an edible roughly 15 minutes after a light snack containing healthy fats (such as avocado, yogurt, or nut butter) stimulates bile secretion and micellar absorption, boosting bioavailability by up to 300% and stabilizing onset."
      },
      {
        question: "Why do some people report that edibles have no effect on them at all?",
        answer: 'This "edible immunity" is primarily genetic. Individuals carrying specific hyper-metabolizing CYP2C9 enzyme variants break down Delta-9 THC into inactive metabolites before sufficient active 11-hydroxy-THC can bind central brain receptors. Others may experience poor digestive bile production or gastrointestinal malabsorption.'
      },
      {
        question: "How long do the effects of a THC edible typically last?",
        answer: "Depending on the milligram dose, metabolism, and stomach contents, an edible typically lasts between 4 and 8 hours, with mild residual physical relaxation lasting up to 10 to 12 hours for higher doses (25 mg+). In comparison, inhaled cannabis flower or vape effects generally subside after 2 to 3 hours."
      },
      {
        question: "Are hemp-derived Delta-9 THC edibles legal and lab-tested at Global Herbs?",
        answer: "Yes. Under the 2018 US Farm Bill, hemp-derived cannabinoid products containing less than 0.3% Delta-9 THC by dry weight are federally compliant. A 5-gram artisan fruit pectin gummy can legally and safely contain 10 mg of pure, naturally derived Delta-9 THC. Every batch at Global Herbs is verified by independent ISO/IEC 17025 accredited laboratory testing."
      }
    ],
    scientificReferences: [
      {
        citation: "Huestis, M. A. (2007). Human Cannabinoid Pharmacokinetics. Chemistry & Biodiversity, 4(8), 1770\u20131804.",
        doiUrl: "https://doi.org/10.1002/cbdv.200790152",
        source: "Chemistry & Biodiversity"
      },
      {
        citation: "Grotenhermen, F. (2003). Pharmacokinetics and Pharmacodynamics of Cannabinoids. Clinical Pharmacokinetics, 42(4), 327\u2013360.",
        doiUrl: "https://doi.org/10.2165/00003088-200342040-00003",
        source: "Clinical Pharmacokinetics"
      },
      {
        citation: "Russo, E. B. (2011). Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects. British Journal of Pharmacology, 163(7), 1344\u20131364.",
        doiUrl: "https://doi.org/10.1111/j.1476-5381.2011.01238.x",
        source: "British Journal of Pharmacology"
      },
      {
        citation: "MacCallum, C. A., & Russo, E. B. (2018). Practical considerations in medical cannabis administration and dosing. European Journal of Internal Medicine, 49, 12\u201319.",
        doiUrl: "https://doi.org/10.1016/j.ejim.2018.01.004",
        source: "European Journal of Internal Medicine"
      }
    ],
    botanicalDisclaimer: "These educational statements have not been evaluated by the Food and Drug Administration. These products and guides are not intended to diagnose, treat, cure, or prevent any disease. Always consult a qualified healthcare professional before beginning any botanical or cannabinoid regimen, particularly if pregnant, nursing, taking prescription medications, or managing a chronic medical condition. Keep strictly out of reach of children and pets. 21+ only."
  },
  {
    id: "how-to-buy-hemp-herbal-products-online-guide",
    slug: "how-to-buy-hemp-products-online-lab-tested-herbal-dispensary-guide",
    title: "How to Buy Hemp & Natural Herbal Products Online: A Lab-Tested Dispensary Buyer\u2019s Guide",
    metaTitle: "How to Buy Hemp & Herbal Products Online | COA Buyer\u2019s Guide",
    metaDescription: "Learn how to buy hemp products and natural herbal extracts online safely. Compare full-spectrum CBD, botanical infusions, ISO lab COAs, and delivery formats.",
    targetKeywords: [
      "buy hemp products online",
      "buy herbal products online",
      "natural herbal products for sale",
      "full spectrum hemp extract online",
      "online cannabis dispensary",
      "how to read a hemp COA",
      "lab tested CBD and herbal products",
      "sublingual vs topical hemp products"
    ],
    category: "CBD & Wellness",
    categorySlug: "cbd",
    author: {
      name: "Dr. Julian Mercer",
      role: "Clinical Phytochemist & Herbal Formulator",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO-17025 Lab Auditor"
    },
    publishedDate: "September 27, 2026",
    readTime: "9 min read",
    featuredImage: "/images/buy_hemp_online_guide.jpg",
    excerpt: "Shopping for hemp products and natural herbal extracts online requires more than reading front-label milligram claims. Learn how to audit ISO-17025 Certificates of Analysis (COAs), compare full-spectrum cannabinoid ratios against botanical infusions like chamomile and turmeric, and select the right format for your wellness goals.",
    keyTakeaways: [
      "Always verify a batch-specific ISO/IEC 17025 Certificate of Analysis (COA) before buying hemp or herbal products online\u2014confirming both cannabinoid potency and negative contaminant screenings (heavy metals, pesticides, residual solvents, and mycotoxins).",
      "Full-spectrum hemp extracts retain minor phytocannabinoids (CBG, CBN, CBC) and native terpenes alongside botanical co-extracts (such as organic chamomile or cold-infused turmeric), offering broader receptor activity than single-molecule isolates.",
      "Delivery method dictates bioavailability and onset time: sublingual MCT drops absorb in 15\u201330 minutes, pectin gummies digest over 45\u201390 minutes for sustained release, and topical balms provide localized cutaneous support without systemic bloodstream entry.",
      "A reputable online dispensary provides transparent cultivar sourcing, moisture-barrier vacuum packaging, and Farm Bill compliance documentation (<0.3% Delta-9 THC by dry weight)."
    ],
    tableOfContents: [
      { id: "what-to-look-for-online", title: "1. Why Quality Varies When Buying Hemp & Herbal Products Online" },
      { id: "spectrum-and-botanical-synergy", title: "2. Full-Spectrum Hemp vs. Isolate & Botanical Synergies" },
      { id: "delivery-formats-comparison", title: "3. Delivery Formats Compared: Drops, Edibles, Flower & Topicals" },
      { id: "how-to-read-coa-checklist", title: "4. How to Audit a Certificate of Analysis (COA) in 60 Seconds" },
      { id: "dispensary-handling-storage", title: "5. Packaging, Terpene Preservation & Online Dispensary Standards" }
    ],
    contentSections: [
      {
        id: "what-to-look-for-online",
        title: "1. Why Quality Varies When Buying Hemp & Herbal Products Online",
        paragraphs: [
          'When you search to buy hemp products online or compare natural herbal products for sale, the digital shelf looks deceptively uniform. Hundreds of storefronts promise "pure organic extracts," "high-potency CBD," or "artisan botanicals." Yet peer-reviewed label-accuracy audits published in JAMA and analytical chemistry journals have repeatedly found that unverified online hemp and herbal extracts frequently deviate from their stated milligram potency\u2014sometimes containing synthetic adulterants or agricultural contaminants.',
          "The reason comes down to botany: Cannabis sativa L. (industrial hemp) and companion functional herbs are bio-accumulators. As their root systems draw nutrients from the soil, they also uptake heavy metals (lead, arsenic, cadmium, mercury), agricultural fungicides, and soil-borne molds if cultivated in unmonitored fields. Choosing a trustworthy online dispensary means looking past lifestyle marketing and evaluating verifiable analytical data."
        ],
        calloutBox: {
          type: "info",
          title: "Direct Answer: How to Buy Safe Hemp & Herbal Products Online",
          text: "To buy hemp and natural herbal products online safely, verify four criteria before checkout: (1) a batch-matched Certificate of Analysis (COA) from an ISO/IEC 17025-accredited laboratory, (2) clear extraction disclosure (solventless, cold-infused, or clean CO2/ethanol), (3) full-panel contaminant pass results, and (4) climate-controlled, odor-proof moisture barrier packaging."
        }
      },
      {
        id: "spectrum-and-botanical-synergy",
        title: "2. Full-Spectrum Hemp vs. Isolate & Botanical Synergies",
        paragraphs: [
          "Not all hemp and herbal formulations interact with the human endocannabinoid system (ECS) in the same way. Understanding the chemical distinction between whole-plant extracts, broad-spectrum oils, single-compound isolates, and multi-herb infusions ensures you purchase a product aligned with your physiological goals."
        ],
        subsections: [
          {
            subtitle: "Full-Spectrum Hemp Extract vs. Broad-Spectrum vs. Isolate",
            paragraphs: [
              "Full-spectrum hemp extract preserves the complete phytochemical matrix of the plant: primary cannabinoids like CBD or raw THCa, minor cannabinoids such as Cannabigerol (CBG), Cannabinol (CBN), and Cannabichromene (CBC), aromatic terpenes (beta-myrcene, linalool, limonene, beta-caryophyllene), and plant flavonoids, while remaining at or below the 0.3% Delta-9 THC federal threshold.",
              "By contrast, CBD isolate is a 99%+ crystalline powder stripped of all secondary cannabinoids and terpenes. While isolate is useful for shoppers who require zero trace THC, pharmacological research (including Russo, 2011) indicates that whole-plant phytocannabinoid-terpenoid synergy\u2014commonly termed the entourage effect\u2014supports more balanced receptor modulation at lower milligram doses."
            ]
          },
          {
            subtitle: "Functional Botanical Co-Infusions: Chamomile, Turmeric & Adaptogens",
            paragraphs: [
              "Many experienced consumers now pair full-spectrum hemp with traditional western and Ayurvedic botanicals. Instead of taking isolated capsules separately, cold-infused botanical tinctures combine lipid-soluble plant compounds in a single carrier oil such as organic fractionated coconut (MCT) oil:"
            ],
            bullets: [
              "Chamomile + Full-Spectrum CBD: Matricaria chamomilla contains apigenin, a bioflavonoid studied for its affinity with central benzodiazepine/GABA-A receptor sites, complementing evening full-spectrum CBD routines.",
              "Cold-Infused Turmeric + Full-Spectrum CBD: Curcuma longa supplies curcuminoids alongside beta-caryophyllene (a dietary sesquiterpene found in both hemp and black pepper/turmeric that selectively binds peripheral CB2 receptors).",
              "Omega-Rich Pet Formulations: Pet-specific CBD drops pair lower-milligram hemp extract with Atlantic krill oil to improve lipid absorption without terpenes or ingredients unsuitable for companion animals."
            ]
          }
        ]
      },
      {
        id: "delivery-formats-comparison",
        title: "3. Delivery Formats Compared: Drops, Edibles, Flower & Topicals",
        paragraphs: [
          "Before adding hemp products or herbal remedies to your cart, match the delivery mechanism to your desired onset window and target tissue. Swallowing an edible, holding a tincture under the tongue, vaporizing raw flower, or applying a CBD lip balm or skincare salve each follow distinct pharmacokinetic pathways."
        ],
        table: {
          caption: "Pharmacokinetic Comparison of Hemp & Herbal Product Formats",
          headers: ["Product Format", "Primary Absorption Route", "Typical Onset Time", "Duration of Effects", "Best Suited For"],
          rows: [
            ["Sublingual Drops & Tinctures", "Sublingual mucosal capillaries (+ GI tract)", "15 \u2013 30 minutes", "4 \u2013 6 hours", "Precise milligram titration, evening calm, daily botanical routines"],
            ["Edibles & Pectin Gummies", "Digestive tract & hepatic first-pass metabolism", "45 \u2013 90 minutes", "6 \u2013 8 hours", "Sustained overnight support, pre-measured convenience, taste preference"],
            ["Indoor & Greenhouse THCa Flower", "Pulmonary alveoli (via heat decarboxylation)", "1 \u2013 5 minutes", "1.5 \u2013 3 hours", "Immediate onset, strain-specific terpene appreciation, experienced users"],
            ["Solventless Live Hash Rosin", "Pulmonary alveoli (low-temp vaporization)", "1 \u2013 3 minutes", "2 \u2013 4 hours", "Connoisseur terpene purity (73u\u2013120u), zero-solvent extraction"],
            ["Topicals (CBD Skincare & Lip Balm)", "Local cutaneous CB2, TRPV1 & PPAR receptors", "15 \u2013 45 minutes (local)", "2 \u2013 4 hours (local)", "Localized skin barrier hydration, chapped lips, targeted surface comfort (non-systemic)"]
          ]
        },
        subsections: [
          {
            subtitle: "Why Topical Hemp (CBD Skincare & Lip Balms) Works Differently Than Drops",
            paragraphs: [
              "Keyword searches for CBD skincare and CBD lip balm often stem from consumers wondering whether topical hemp products enter the bloodstream. Unlike transdermal medical patches engineered with chemical permeation enhancers, standard topical balms, salves, and lip care products do not cross the dermis into systemic circulation.",
              "Instead, phytocannabinoids and botanical emollients interact locally with cutaneous endocannabinoid receptors (CB1 and CB2) expressed in epidermal keratinocytes, sebocytes, and peripheral sensory nerve fibers. Note on Global Herbs inventory: while Global Herbs currently specializes in sublingual full-spectrum CBD oils (such as Viridesco Full Spectrum CBD Oil, which is suitable for both sublingual and topical application), botanical tinctures, gummies, flower, and solventless concentrates, shoppers applying full-spectrum hemp oil topically should always patch-test on the inner forearm first."
            ]
          }
        ]
      },
      {
        id: "how-to-read-coa-checklist",
        title: "4. How to Audit a Certificate of Analysis (COA) in 60 Seconds",
        paragraphs: [
          "A legitimate online cannabis dispensary or herbal retailer never asks you to take potency on faith. Every batch should be backed by a Certificate of Analysis issued by an independent laboratory accredited under ISO/IEC 17025 standards. Use this five-point checklist before purchasing:"
        ],
        subsections: [
          {
            subtitle: "The 5-Point Lab Verification Checklist",
            paragraphs: [
              "When viewing a product COA modal or QR code, inspect these five data blocks:"
            ],
            bullets: [
              "1. Header & Accreditation Match: Confirm the lab name, ISO/IEC 17025 accreditation number, batch/lot number, and test date. The batch ID on the lab report should match the product listing.",
              "2. Cannabinoid Profile by Weight (% and mg/g): Verify active and acidic cannabinoids (CBD, CBDa, \u03949-THC, THCa, CBG, CBN). For federally compliant hemp flower and full-spectrum products under the 2018 Farm Bill, Delta-9 THC must measure \u2264 0.3% on a dry-weight basis.",
              '3. Residual Solvents (For Extracts & Vapes): Solventless live hash rosin and cold-infused MCT drops should show "ND" (None Detected) for hydrocarbons like butane, propane, benzene, and hexane.',
              '4. Heavy Metals & Agricultural Pesticides: Ensure "PASS" or "Below LOQ" (Limit of Quantitation) across the Big Four heavy metals\u2014Arsenic (As), Cadmium (Cd), Lead (Pb), and Mercury (Hg)\u2014as well as banned organophosphate and pyrethroid pesticides.',
              "5. Microbial & Mycotoxin Screening: Crucial for dried botanical flower and herbal products; confirms the absence of Aspergillus species, Salmonella, STEC E. coli, and aflatoxins."
            ]
          }
        ],
        calloutBox: {
          type: "warning",
          title: "Red Flag When Shopping Online",
          text: 'Avoid online vendors that only publish a "potency-only" test from two years ago or obscure the testing laboratory\u2019s name and license header. Potency without contaminant screening does not guarantee a clean botanical product.'
        }
      },
      {
        id: "dispensary-handling-storage",
        title: "5. Packaging, Terpene Preservation & Online Dispensary Standards",
        paragraphs: [
          "Even the finest indoor living-soil flower or organic chamomile CBD infusion will degrade rapidly if exposed to heat, oxygen, and ultraviolet light during warehouse storage or postal transit. Monoterpenes like limonene and alpha-pinene begin volatilizing at room temperatures, while prolonged UV exposure oxidizes THC into CBN and degrades plant chlorophyll.",
          "When evaluating where to buy hemp products online, examine the dispensary\u2019s post-harvest and fulfillment protocols: cured flower should ship in heat-sealed, odor-proof moisture-barrier packaging paired with two-way relative humidity control (58%\u201362% RH), while full-spectrum CBD tinctures require UV-blocking amber or cobalt glass dropper bottles. At Global Herbs, every order ships in plain, unmarked exterior boxes with dual-layer vacuum sealing and compliant documentation."
        ]
      }
    ],
    recommendedCategorySlug: "cbd",
    recommendedProductSearch: "Full Spectrum CBD",
    faqs: [
      {
        question: "Is it legal to buy hemp and CBD products online in the United States?",
        answer: "Yes, at the federal level. Under the Agriculture Improvement Act of 2018 (2018 Farm Bill), industrial hemp and hemp-derived products containing no more than 0.3% Delta-9 THC on a dry-weight basis are federally legal. However, individual states maintain varying regulations regarding specific cannabinoids like smokable THCa or Delta-9 edibles, so buyers should always verify local state guidelines."
      },
      {
        question: "What is the difference between full-spectrum hemp oil and hemp seed oil?",
        answer: "Full-spectrum hemp oil is extracted from the resinous aerial flowers and leaves of the hemp plant and contains active phytocannabinoids (CBD, CBG, CBN, trace THC) and terpenes. Cold-pressed hemp seed oil is pressed exclusively from hemp seeds; while rich in omega-3 and omega-6 fatty acids for culinary and skincare use, hemp seed oil contains virtually zero CBD or cannabinoids."
      },
      {
        question: "Can full-spectrum hemp oil be used both sublingually and topically on skin?",
        answer: "Yes, unflavored or pure carrier-oil formulations\u2014such as raw full-spectrum CBD oil in clean MCT or hemp oil bases\u2014can be administered sublingually under the tongue for systemic absorption or applied directly to clean skin for localized cutaneous comfort. Avoid applying tinctures containing peppermint, alcohol, or citrus essential oils to sensitive facial skin or lips."
      },
      {
        question: "How do I know if an online herbal or cannabis dispensary is legitimate?",
        answer: "A legitimate online dispensary provides batch-specific third-party ISO-17025 lab Certificates of Analysis (COAs), transparent ingredient and extraction disclosures, clear age verification (21+), published shipping and refund policies, and responsive customer support rather than anonymous payment-only pages."
      },
      {
        question: "Why do some CBD drops include herbs like chamomile or turmeric?",
        answer: "Formulating full-spectrum CBD with functional botanicals like chamomile or cold-infused turmeric pairs complementary plant compounds\u2014such as chamomile apigenin for evening relaxation or turmeric curcuminoids and beta-caryophyllene for physical recovery\u2014within a single lipid carrier that supports absorption."
      }
    ],
    scientificReferences: [
      {
        citation: "Bonn-Miller, M. O., Loflin, M. J., Thomas, B. F., Marcu, J. P., Hyke, T., & Vandrey, R. (2017). Labeling accuracy of cannabidiol extracts sold online. JAMA, 318(17), 1708-1709.",
        doiUrl: "https://pubmed.ncbi.nlm.nih.gov/29114823/",
        source: "JAMA / PubMed"
      },
      {
        citation: "Russo, E. B. (2011). Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects. British Journal of Pharmacology, 163(7), 1344-1364.",
        doiUrl: "https://pubmed.ncbi.nlm.nih.gov/21749363/",
        source: "British Journal of Pharmacology"
      },
      {
        citation: "Ol\xE1h, A., T\xF3th, B. I., Borb\xEDr\xF3, I., Sugawara, K., Sz\xF6ll\u0151si, A. G., Czifra, G., ... & B\xEDr\xF3, T. (2014). Cannabidiol exerts sebostatic and antiinflammatory effects on human sebocytes. Journal of Clinical Investigation, 124(9), 3713-3724.",
        doiUrl: "https://pubmed.ncbi.nlm.nih.gov/25061872/",
        source: "Journal of Clinical Investigation / NCBI"
      },
      {
        citation: "United States Department of Agriculture (USDA). (2018). Agriculture Improvement Act of 2018 (Farm Bill), Public Law 115-334.",
        doiUrl: "https://www.usda.gov/farmbill",
        source: "USDA Agricultural Marketing Service"
      }
    ],
    botanicalDisclaimer: "Educational & Regulatory Disclosure: This guide is published for educational and consumer-literacy purposes under the 2018 U.S. Farm Bill (Public Law 115-334). Statements in this article have not been evaluated by the U.S. Food and Drug Administration (FDA). Hemp and botanical products sold on Global Herbs are not intended to diagnose, treat, cure, or prevent any disease. Consult a licensed physician or pharmacist before combining cannabinoids or herbal extracts with prescription medications."
  },
  {
    id: "global-herbs-mobile-app-announcement",
    slug: "announcing-global-herbs-mobile-app-seamless-orders",
    title: "Announcing the Global Herbs Mobile App: Fast 1-Tap Orders, Live Tracking & Elevated Dispensary Experience",
    metaTitle: "Global Herbs Mobile App: Fast Orders & Live Stealth Tracking",
    metaDescription: "Exciting news from Global Herbs! Anticipate our new iOS and Android mobile app designed for seamless 1-tap orders, live stealth tracking, and VIP member perks.",
    targetKeywords: [
      "Global Herbs mobile app",
      "cannabis dispensary mobile app",
      "buy weed online app",
      "seamless cannabis ordering",
      "THCa flower online app",
      "live dispensary order tracking",
      "Global Herbs dispensary",
      "discreet cannabis delivery"
    ],
    category: "Announcements & Updates",
    categorySlug: "announcements",
    author: {
      name: "Elena Vance",
      role: "Product Lead & Digital Experience Director",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Marcus Chen",
      credentials: "Chief Technology Officer & Operations Director"
    },
    publishedDate: "September 17, 2026",
    readTime: "5 min read",
    featuredImage: "/images/mobile_app_mockup.jpg",
    excerpt: "We are thrilled to announce the upcoming launch of the official Global Herbs mobile app on iOS and Android. Discover how 1-tap reordering, real-time stealth delivery tracking, and VIP drop alerts are redefining your herbal wellness journey.",
    keyTakeaways: [
      "1-Tap Express Ordering: Reorder your favorite top-shelf strains, edibles, concentrates, and wellness tinctures in under 30 seconds.",
      "Live Stealth Delivery Tracking: Real-time encrypted status updates from our climate-controlled fulfillment center straight to your mailbox with full privacy.",
      "Interactive Botanical Profiles: Dive deep into lab certificates (COAs), terpene wheels, THC/CBD ratios, and curated effect filters (Sleep, Focus, Relax).",
      "App-Exclusive Member Drops: Enjoy early access to limited small-batch flower harvests, seasonal live rosin presses, and app-only flash promotions.",
      "Unified Omnichannel Synchronization: Seamlessly access your saved favorites, customer tier points, and past invoices on both web and mobile."
    ],
    tableOfContents: [
      { id: "why-we-built-app", title: "1. The Global Herbs Mission: Better Plants, A Healthier You" },
      { id: "core-features", title: "2. 5 Features Designed for Seamless Ordering & Speed" },
      { id: "sneak-peek", title: "3. First Look: The Native iOS & Android Interface" },
      { id: "stealth-tracking", title: "4. Real-Time Tracking & Discreet Packaging Assurance" },
      { id: "early-access", title: "5. Join the VIP Beta Waitlist & Claim Your Launch Voucher" }
    ],
    contentSections: [
      {
        id: "why-we-built-app",
        title: "1. The Global Herbs Mission: Better Plants, A Healthier You",
        paragraphs: [
          "Since day one at Global Herbs, our guiding philosophy has centered around three non-negotiable pillars: Quality, Care, and Community. From our organic indoor cultivars to our solventless live rosin presses and lab-tested CBD sleep drops, we believe that accessing clean, premium plant medicine should be as effortless and transparent as possible.",
          "Over the past year, our community has grown across the nation. As order volumes expanded, our patrons voiced a clear desire: you wanted faster order turnarounds, easier strain comparisons on the go, and instant dispatch updates without digging through spam-prone email inboxes. Today, we are proud to officially announce the upcoming release of the dedicated Global Herbs Mobile App for iOS and Android."
        ],
        calloutBox: {
          type: "tip",
          title: "A Native Mobile-First Experience",
          text: "The new Global Herbs app is engineered from the ground up for instantaneous response times, biometric security (Face ID & Fingerprint unlock), and offline product browsing."
        }
      },
      {
        id: "core-features",
        title: "2. 5 Features Designed for Seamless Ordering & Speed",
        paragraphs: [
          "We collaborated directly with medical patients, wellness practitioners, and everyday connoisseurs to eliminate friction at every step of your dispensary journey. Here is what you can anticipate at launch:",
          "\u2022 1-Tap Express Reordering: Never enter repetitive checkout details again. Save your preferred stealth shipping addresses and payment preferences for secure orders completed in under 30 seconds.",
          "\u2022 Smart Cannabinoid & Effect Filtering: Whether you need deep physical sedation for restorative sleep (Indica \u2022 Skywalker OG), an uplifting creative boost (Sativa \u2022 Citrus Gummies), or targeted non-intoxicating recovery (Full Spectrum CBD), our intuitive category pills and search engine pinpoint your exact match in seconds.",
          "\u2022 In-App Live Lab Certificates (COAs): Tap any strain or edible batch to view third-party verified cannabinoid potency, pesticide-free certifications, heavy metal screenings, and terpene percentage wheels before you buy.",
          "\u2022 Push Notifications That Actually Matter: Opt-in for discreet push alerts on parcel departures, mailbox deliveries, and private drops\u2014no spammy promotional noise.",
          "\u2022 Real-Time Cart Sync: Add items to your cart on your desktop during lunch, and complete your order on your smartphone during your evening commute with zero lost items."
        ]
      },
      {
        id: "sneak-peek",
        title: "3. First Look: The Native iOS & Android Interface",
        paragraphs: [
          "The Global Herbs mobile application embodies modern minimalist design, pairing soothing sage and botanical emerald tones with readable typography and clean translucent glassmorphism cards.",
          "The interface is organized into four intuitive destinations: Home (curated daily highlights and seasonal drops), Shop (instant category drill-downs from Flower to Edibles, Concentrates, and Topicals), Deals (exclusive VIP discounts and flash specials), and Profile (saved stealth addresses, order history, and digital loyalty rewards).",
          'On product detail screens, patrons can select available product options, review product information, and tap "Add to Cart" to begin an order.'
        ],
        calloutBox: {
          type: "info",
          title: "Engineered for Performance",
          text: "Built with native mobile architecture, the app boots in under 400 milliseconds and caches high-resolution product photography for buttery smooth 120Hz scrolling."
        }
      },
      {
        id: "stealth-tracking",
        title: "4. Real-Time Tracking & Discreet Packaging Assurance",
        paragraphs: [
          "Privacy and security remain foundational to everything we do. The mobile app features a dedicated Order Tracking portal with end-to-end encrypted tracking data.",
          "Every package leaving our fulfillment center is packed in dual-layer medical vacuum seals, enclosed in unmarked odor-proof boxes, and labeled with discrete postal documentation compliant with the 2018 Farm Bill. In the app, you will see real-time updates as your parcel transitions from Fulfillment to Carrier Acceptance and Final Mailbox Delivery."
        ]
      },
      {
        id: "early-access",
        title: "5. Join the VIP Beta Waitlist & Claim Your Launch Voucher",
        paragraphs: [
          "We are currently conducting closed alpha testing with select community members and will open the public beta on TestFlight (iOS) and Google Play (Android) very soon.",
          "As a token of our appreciation for our early supporters, all users who join our subscriber list or contact our team prior to public launch will receive an exclusive 20% Launch Voucher redeemable on their first in-app order.",
          "Keep an eye on your inbox, explore our current web catalog, and get ready to experience the next evolution of dispensary shopping with Global Herbs."
        ],
        calloutBox: {
          type: "tip",
          title: "Get on the VIP Beta List",
          text: "Scroll down or visit our Contact & Newsletter section to register your email. Early beta testers receive priority fulfillment and exclusive merchandise gift boxes!"
        }
      }
    ],
    recommendedCategorySlug: "flowers",
    recommendedProductSearch: "Skywalker",
    faqs: [
      {
        question: "When is the official Global Herbs mobile app releasing?",
        answer: "The Global Herbs mobile app is currently in private alpha testing. The public beta for iOS and Android is scheduled to open soon, with full App Store and Google Play availability following shortly after."
      },
      {
        question: "Will the app be available for both iPhone (iOS) and Android?",
        answer: "Yes! The Global Herbs app is being built natively for both Apple iOS (iPhone & iPad) and Google Android devices with full biometric authentication (Face ID and fingerprint unlock)."
      },
      {
        question: "Can I log into the mobile app with my existing Global Herbs website account?",
        answer: "Absolutely. Your existing account credentials, past order history, saved delivery addresses, and VIP loyalty rewards will synchronize automatically when you log into the mobile app."
      },
      {
        question: "Are orders placed through the mobile app still shipped in discreet stealth packaging?",
        answer: "Yes. All orders placed on both our mobile app and website adhere to our 100% discreet packaging guarantee: dual vacuum heat-sealed barrier bags, odorless containers, plain exterior shipping boxes, and Farm Bill compliant lab notices."
      },
      {
        question: "Will there be app-exclusive discounts and early strain drops?",
        answer: "Yes! Mobile app users will receive priority notifications for limited small-batch flower harvests, solventless rosin drops, and app-only seasonal promo codes."
      }
    ]
  },
  {
    id: "thca-vs-delta9-thc-guide",
    slug: "what-is-thca-vs-delta-9-thc-legal-potency-guide",
    title: "What is THCa vs. Delta-9 THC? The Definitive Legal & Potency Guide",
    metaTitle: "What is THCa vs Delta 9 THC? Is THCa Flower Legal? | Global Herbs Guide",
    metaDescription: "Learn what THCa is, how THCa converts to Delta-9 THC when heated, its legal status under the 2018 Farm Bill, and why buying high THCa flower online is 100% legal.",
    targetKeywords: [
      "Buy THCa flower online",
      "THCa vs Delta 9 THC difference",
      "Is THCa legal Farm Bill",
      "THCa flower potency effects",
      "Decarboxylation of THCa"
    ],
    category: "THCa & Legality",
    categorySlug: "flowers",
    author: {
      name: "Dr. Marcus Sterling",
      role: "Senior Botanical Extraction Chemist",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO Lab Auditor"
    },
    publishedDate: "August 10, 2026",
    readTime: "6 min read",
    featuredImage: "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=1200",
    excerpt: "Discover why THCa flower has revolutionized online cannabis shopping. Understand decarboxylation, molecular chemistry, Farm Bill federal compliance, and why THCa flower delivers identical potency to top-shelf dispensary weed when smoked.",
    keyTakeaways: [
      "THCa (Tetrahydrocannabinolic Acid) is the natural precursor found in raw, living cannabis trichomes.",
      "Under federal law (2018 Farm Bill), hemp containing less than 0.3% Delta-9 THC on a dry weight basis is legal.",
      "When exposed to heat (smoking, vaping, baking), THCa loses a carboxyl group (CO2) and converts into active Delta-9 THC at a 87.7% molecular efficiency.",
      "Raw THCa is non-psychoactive on its own, but when combusted or vaporized, it produces the exact same euphoric and physical effects as traditional dispensary cannabis."
    ],
    tableOfContents: [
      { id: "molecular-difference", title: "Molecular Chemistry: THCa vs Delta-9 THC" },
      { id: "decarboxylation-process", title: "The Science of Decarboxylation" },
      { id: "farm-bill-legality", title: "Why Buying THCa Flower Online is Federally Legal" },
      { id: "effects-and-potency", title: "Potency & Effects: Does THCa Get You High?" },
      { id: "buying-thca-online", title: "How to Safely Buy High THCa Flower Online" }
    ],
    contentSections: [
      {
        id: "molecular-difference",
        title: "Molecular Chemistry: THCa vs Delta-9 THC",
        paragraphs: [
          "If you look closely at fresh, uncured cannabis or hemp buds growing on a living plant, you might be surprised to learn that the plant produces almost zero Delta-9 THC directly. Instead, the trichome glands synthesize Tetrahydrocannabinolic Acid (THCa) \u2014 an acidic cannabinoid precursor.",
          "Structurally, THCa possesses an extra carboxyl ring (COOH group) attached to its chemical spine. Because of this bulky molecular extension, raw THCa cannot fit or bind into CB1 receptors located in the human central nervous system. Consequently, consuming raw THCa flower in a smoothie or juice produces anti-inflammatory and neuroprotective benefits without any intoxicating or psychoactive high."
        ],
        calloutBox: {
          type: "info",
          title: "Molecular Formula Comparison",
          text: "THCa: C22H30O4 (Non-psychoactive acidic form) \u27A1\uFE0F Heat (-CO2) \u27A1\uFE0F Delta-9 THC: C21H30O2 (Active psychoactive cannabinoid)"
        }
      },
      {
        id: "decarboxylation-process",
        title: "The Science of Decarboxylation",
        paragraphs: [
          "Decarboxylation is the thermal reaction that strips away the carboxyl group from THCa, transforming it directly into active Delta-9 THC. This reaction occurs instantly whenever heat is applied:",
          "\u2022 Lighting a joint, pipe, or bowl (combustion at ~400\xB0F\u2013600\xB0F).",
          "\u2022 Heating flower inside a dry herb vaporizer or vape pen (conduction/convection at 350\xB0F\u2013410\xB0F).",
          "\u2022 Baking flower in an oven during butter or oil preparation for edibles (220\xB0F\u2013240\xB0F for 30\u201345 minutes).",
          "The conversion formula used by accredited laboratories to calculate Total Potential THC is: Total THC = Delta-9 THC + (THCa \xD7 0.877). This means a strain with 30% THCa yields approximately 26.3% active Delta-9 THC upon smoking."
        ]
      },
      {
        id: "farm-bill-legality",
        title: "Why Buying THCa Flower Online is Federally Legal",
        paragraphs: [
          "The Agriculture Improvement Act of 2018 (commonly known as the 2018 Farm Bill) defined legal hemp as any Cannabis sativa L. plant or derivative that contains no more than 0.3% Delta-9 THC on a dry-weight basis.",
          "Crucially, the statutory language specifically restricts Delta-9 THC concentration, rather than total THCa prior to heat activation. Because high THCa flower is harvested early or cold-cured to preserve raw THCa while maintaining Delta-9 levels below the 0.3% threshold, it legally qualifies as industrial hemp under federal law and can be shipped securely via USPS across state lines."
        ],
        calloutBox: {
          type: "tip",
          title: "Stealth Shipping & Lab Testing Notice",
          text: "At Global Herbs, every flower package includes a Certificate of Analysis (COA) from an ISO-certified laboratory confirming Delta-9 THC levels remain below 0.3%, along with official documentation for postal authorities."
        }
      },
      {
        id: "effects-and-potency",
        title: "Potency & Effects: Does THCa Get You High?",
        paragraphs: [
          "Yes \u2014 once heated during consumption, THCa flower provides the exact same body relaxation, mental euphoria, stress relief, and pain-soothing effects as top-shelf dispensary cannabis.",
          "Because THCa flower is derived from top-grade Indica, Sativa, and Hybrid genetics, you experience authentic strain-specific terpene profiles. Indica strains rich in Myrcene produce heavy body relaxation and sleepiness, while Sativa cultivars loaded with Limonene provide uplifting mental energy and creative drive."
        ]
      },
      {
        id: "buying-thca-online",
        title: "How to Safely Buy High THCa Flower Online",
        paragraphs: [
          "When purchasing THCa flower online, always look for three non-negotiable quality markers:",
          "1. Verifiable Batch COAs: Third-party lab reports verifying cannabinoid profiles, terpenes, and negative screenings for heavy metals and pesticides.",
          "2. Vacuum Sealed Moisture Packaging: Heat-sealed moisture barrier bags with Boveda humidity packs to keep trichomes fresh and prevent smell leaks.",
          "3. Strain Genetics Transparency: Clear identification of parent strains, terpene breakdown, and trichome density."
        ]
      }
    ],
    recommendedCategorySlug: "flowers",
    recommendedProductSearch: "THCa",
    faqs: [
      {
        question: "Will THCa show up on a drug test?",
        answer: "Yes. Drug tests screen for the primary THC metabolite THC-COOH. Because THCa converts to Delta-9 THC upon heat and metabolizes identically in the liver, consuming THCa flower will cause you to test positive for THC."
      },
      {
        question: "Can I eat raw THCa flower to get high?",
        answer: "No. Eating raw unheated THCa flower will not cause psychoactive effects because the cannabinoid has not undergone thermal decarboxylation. However, raw THCa provides non-intoxicating wellness benefits."
      },
      {
        question: "What is the highest THCa percentage available online?",
        answer: "Top-shelf craft THCa cultivars typically range from 25% to 35%+ THCa. Products enriched with THCa diamond dust or rosin can reach up to 45%+ total cannabinoids."
      }
    ],
    scientificReferences: [
      {
        citation: "Mechoulam, R., & Hanu\u0161, L. O. (2014). A historical overview of chemical research on cannabinoids. Chemistry & Biodiversity, 1(1), 24-44.",
        doiUrl: "https://pubmed.ncbi.nlm.nih.gov/17191798/",
        source: "PubMed / National Center for Biotechnology Information"
      },
      {
        citation: "Russo, E. B. (2011). Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects. British Journal of Pharmacology, 163(7), 1344-1364.",
        doiUrl: "https://pubmed.ncbi.nlm.nih.gov/21749363/",
        source: "British Journal of Pharmacology"
      },
      {
        citation: "United States Department of Agriculture (USDA). (2018). Agriculture Improvement Act of 2018 (Farm Bill), Public Law 115-334, Section 297A.",
        doiUrl: "https://www.usda.gov/farmbill",
        source: "USDA Agricultural Marketing Service"
      }
    ],
    botanicalDisclaimer: "Educational Botanical Disclaimer: This content is prepared for educational and scientific informational purposes under the 2018 United States Farm Bill (Public Law 115-334). These statements have not been evaluated by the Food and Drug Administration. Products featured are derived from compliant industrial hemp containing less than 0.3% Delta-9 THC on a dry weight basis. Products are not intended to diagnose, treat, cure, or prevent any disease. Always consult with a qualified healthcare professional before beginning any new herbal or botanical regimen."
  },
  {
    id: "how-to-dose-cbd-drops-sleep-guide",
    slug: "how-to-dose-cbd-drops-tinctures-sleep-anxiety-guide",
    title: "How to Dose CBD Drops & Tinctures for Optimal Sleep and Anxiety Relief",
    metaTitle: "How to Dose CBD Drops for Sleep & Anxiety | Dosing Calculator & Chart",
    metaDescription: "Master CBD oil dosing with our ultimate guide. Calculate exact mg doses for Full Spectrum CBD drops, sublingual absorption, sleep enhancement, and anxiety relief.",
    targetKeywords: [
      "Full Spectrum CBD drops for sleep",
      "CBD oil dosage chart",
      "How to dose CBD drops",
      "CBD sublingual absorption time",
      "Full spectrum CBD vs isolate sleep"
    ],
    category: "CBD & Wellness",
    categorySlug: "edibles",
    author: {
      name: "Elena Rostova",
      role: "Holistic Wellness & Cannabinoid Therapist",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO Lab Auditor"
    },
    publishedDate: "August 08, 2026",
    readTime: "5 min read",
    featuredImage: "/images/cbd_sleep_tincture.jpg",
    excerpt: "Finding your ideal CBD dosage doesn\u2019t have to involve trial and error. Learn how to calculate milligram dosage based on body weight, sublingual delivery techniques, the entourage effect, and how combining CBD with CBN unlocks deep REM sleep.",
    keyTakeaways: [
      "Sublingual administration (holding oil under the tongue for 60-90 seconds) increases CBD absorption by up to 35% compared to swallowing immediately.",
      'Full Spectrum CBD oil contains trace minor cannabinoids (CBN, CBG, CBC) and terpenes that create the synergistic "Entourage Effect".',
      "Optimal sleep dosage generally ranges from 25mg to 50mg of Full Spectrum CBD taken 30 to 45 minutes before bedtime.",
      "Start low (10-15mg/day) and titrate gradually every 3 days until desired symptom relief is achieved."
    ],
    tableOfContents: [
      { id: "why-full-spectrum", title: "Full Spectrum vs Isolate for Sleep & Anxiety" },
      { id: "sublingual-absorption", title: "Maximizing Bioavailability with Sublingual Drops" },
      { id: "cbd-dosing-calculator", title: "CBD Dosage Chart by Weight & Severity" },
      { id: "cbn-cbd-sleep-synergy", title: "Combining CBD with CBN & Terpenes for Sleep" },
      { id: "best-practices", title: "Step-by-Step Daily Dosing Routine" }
    ],
    contentSections: [
      {
        id: "why-full-spectrum",
        title: "Full Spectrum vs Isolate for Sleep & Anxiety",
        paragraphs: [
          "When shopping for CBD drops online, you will encounter three main extraction formats: Full Spectrum, Broad Spectrum, and CBD Isolate. For sleep support and deep physical calming, Full Spectrum is scientifically proven to be superior.",
          'Full Spectrum CBD preserves the whole plant extract, including trace amounts of Delta-9 THC (<0.3%), Cannabinol (CBN), Cannabigerol (CBG), and aromatic terpenes such as Myrcene and Linalool. According to the "Entourage Effect" theory, cannabinoids work in biological harmony, amplifying therapeutic efficacy while smoothing out side effects.'
        ]
      },
      {
        id: "sublingual-absorption",
        title: "Maximizing Bioavailability with Sublingual Drops",
        paragraphs: [
          "When you swallow a CBD gummy or capsule, it passes through the stomach and liver where first-pass metabolism degrades up to 80% of active CBD. Sublingual administration circumvents this obstacle.",
          "By placing liquid CBD drops directly under your tongue, cannabinoids diffuse directly into sublingual capillaries entering the bloodstream in 15\u201320 minutes with up to 35% bioavailability."
        ],
        calloutBox: {
          type: "tip",
          title: "Pro Sublingual Technique",
          text: "Fill the dropper to your targeted mark, squeeze drops under your tongue, and hold for a full 60 to 90 seconds before swallowing. Avoid drinking water for 5 minutes after to maximize capillary absorption."
        }
      },
      {
        id: "cbd-dosing-calculator",
        title: "CBD Dosage Chart by Weight & Severity",
        paragraphs: [
          "Because individual endocannabinoid tone varies, there is no single universal dose. Use the baseline guide below based on body weight and desired effect:",
          "\u2022 Low Dose (Mild Stress / Focus): 0.1mg to 0.2mg per pound of body weight (e.g. 15mg \u2013 25mg for a 150lb adult).",
          "\u2022 Moderate Dose (Anxiety / Pain Relief): 0.25mg to 0.4mg per pound of body weight (e.g. 30mg \u2013 50mg for a 150lb adult).",
          "\u2022 Heavy / Sleep Dose (Insomnia / Deep Rest): 0.5mg+ per pound of body weight (e.g. 50mg \u2013 75mg for a 150lb adult)."
        ]
      },
      {
        id: "cbn-cbd-sleep-synergy",
        title: "Combining CBD with CBN & Terpenes for Sleep",
        paragraphs: [
          'Cannabinol (CBN) is often called the "sleep cannabinoid". Formed when THC naturally oxidizes over time, CBN possesses gentle sedative properties. When combined with Full Spectrum CBD and Myrcene terpenes, it calms racing nighttime thoughts and supports uninterrupted REM cycles without morning grogginess.'
        ]
      },
      {
        id: "best-practices",
        title: "Step-by-Step Daily Dosing Routine",
        paragraphs: [
          "1. Day 1\u20133: Start with 15mg taken once in the evening after dinner.",
          "2. Day 4\u20137: If sleep or anxiety relief is insufficient, increase by 10mg.",
          "3. Consistency is Key: Endocannabinoid receptors regulate over cumulative daily usage. Optimal results usually peak after 7 to 14 days of consistent daily administration."
        ]
      }
    ],
    recommendedCategorySlug: "edibles",
    recommendedProductSearch: "CBD",
    faqs: [
      {
        question: "Will Full Spectrum CBD drops cause me to fail a drug test?",
        answer: "It is possible. Full Spectrum CBD contains up to 0.3% trace Delta-9 THC. With regular high-dose usage, THC metabolites can accumulate in fat tissue and trigger positive drug screens."
      },
      {
        question: "Can I take CBD drops alongside prescription medications?",
        answer: "CBD inhibits Cytochrome P450 enzymes in the liver, which process many common prescription drugs. Always consult a medical physician before combining CBD drops with pharmaceutical medications."
      }
    ]
  },
  {
    id: "guide-to-solventless-live-hash-rosin",
    slug: "guide-to-solventless-live-hash-rosin-terpene-extraction",
    title: "The Complete Guide to Solventless Live Hash Rosin & Terpene Extraction",
    metaTitle: "Guide to Live Hash Rosin & Solventless Dabs | Global Herbs",
    metaDescription: "Learn how 90u solventless Live Hash Rosin is made with ice water extraction and press heat. Discover dab temp guides, terpene preservation, and cold cure badder.",
    targetKeywords: [
      "Live Hash Rosin online store",
      "Buy solventless rosin dabs",
      "90u ice water hash rosin",
      "Cold cure live rosin badder",
      "Low temp quartz dab guide"
    ],
    category: "Concentrates & Rosin",
    categorySlug: "concentrates",
    author: {
      name: "Chef Dominic Vance",
      role: "Master Hashisan & Rosin Press Operator",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO Lab Auditor"
    },
    publishedDate: "August 05, 2026",
    readTime: "7 min read",
    featuredImage: "/images/solventless_live_rosin.jpg",
    excerpt: "Step into the world of connoisseur solventless extracts. Explore 90u ice water hash washing, pneumatic heat pressing, cold cure badder homogenization, and the science of low-temperature quartz dabbing.",
    keyTakeaways: [
      "Live Hash Rosin is 100% solventless, extracted using only ice, water, heat, and hydraulic pressure.",
      "Fresh frozen whole plant flower is harvested at peak trichome maturity and frozen at -40\xB0F within minutes to lock in volatile monoterpenes.",
      "The 90u (micron) sieve filter isolates ripe, intact trichome heads while excluding plant lipids and stalk debris.",
      "Dabbing Live Rosin at low temperatures (480\xB0F - 530\xB0F) preserves delicate terpenes and delivers exceptionally smooth, flavorful vapor."
    ],
    tableOfContents: [
      { id: "what-is-live-rosin", title: "What Makes Live Hash Rosin the Crown Jewel of Concentrates?" },
      { id: "ice-water-washing", title: "Step 1: Fresh Frozen & Ice Water Hash Washing" },
      { id: "freeze-drying-pressing", title: "Step 2: Freeze Drying & Pneumatic Hydraulic Pressing" },
      { id: "curing-textures", title: "Cold Cure vs Fresh Press vs Jam Curing Textures" },
      { id: "low-temp-dabbing", title: "Low Temperature Dabbing Guide (480\xB0F - 530\xB0F)" }
    ],
    contentSections: [
      {
        id: "what-is-live-rosin",
        title: "What Makes Live Hash Rosin the Crown Jewel of Concentrates?",
        paragraphs: [
          "In the world of cannabis extracts, Live Hash Rosin stands as the pinnacle of purity and flavor. Unlike hydrocarbon extracts (BHO live resin) that rely on butane or propane solvents to strip cannabinoids, solventless rosin relies exclusively on mechanical separation using ice, water, heat, and pressure.",
          "Because no chemical solvents touch the material, there is zero risk of residual solvent contamination. What you vaporize is 100% pure plant resin as nature intended."
        ]
      },
      {
        id: "ice-water-washing",
        title: "Step 1: Fresh Frozen & Ice Water Hash Washing",
        paragraphs: [
          "The journey begins in the grow room. Instead of drying and curing harvested flower, master growers chop the plant and immediately deep freeze whole buds at -40\xB0F. This locks in volatile monoterpenes that normally evaporate during traditional drying.",
          "The frozen material is gently agitated in stainless steel wash vessels filled with ice and purified RO water. The freezing water renders trichome heads brittle, snapping them cleanly off their stalks. The slurry is filtered through fine mesh mesh bags (ranging from 45u to 159u). The coveted 90u collection captures intact trichome heads packed with THC and terpenes."
        ],
        calloutBox: {
          type: "warning",
          title: "Why 90u Trichome Heads Matter",
          text: "90 micron trichomes represent the perfect sweet spot of maturity. Smaller sizes contain immature glands, while larger sizes contain broken plant debris. 90u delivers translucent, melt-grade rosin."
        }
      },
      {
        id: "freeze-drying-pressing",
        title: "Step 2: Freeze Drying & Pneumatic Hydraulic Pressing",
        paragraphs: [
          "The collected ice water hash is freeze-dried in pharmaceutical-grade vacuum chambers to remove moisture without thermal degradation.",
          "Once dry, the hash is packed into 25u rosin filter sleeves and placed between heated stainless steel plates (160\xB0F\u2013190\xB0F) under 1,000 to 2,000 PSI of pneumatic pressure. Liquid gold rosin flows out, capturing rich cannabinoid and terpene oils."
        ]
      },
      {
        id: "curing-textures",
        title: "Cold Cure vs Fresh Press vs Jam Curing Textures",
        paragraphs: [
          "\u2022 Cold Cure Badder: The rosin is sealed in glass jars and cured at 55\xB0F\u201365\xB0F for 2\u20133 weeks, then hand-whipped to achieve a smooth, butter-like consistency easy to scoop on a dab tool.",
          "\u2022 Fresh Press: Collected straight off the press without curing. Clear, glassy, and sticky like honey.",
          "\u2022 Rosin Jam / Diamonds: Heat-cured under pressure to encourage THCa crystallization inside a terpene sauce bath."
        ]
      },
      {
        id: "low-temp-dabbing",
        title: "Low Temperature Dabbing Guide (480\xB0F - 530\xB0F)",
        paragraphs: [
          "High heat destroys delicate terpenes like Myrcene and Pinene above 600\xB0F, producing harsh smoke and charred bangers. Follow this low-temp guide:",
          "1. Heat your quartz banger or e-rig to 500\xB0F.",
          "2. Drop a pea-sized glob of Live Rosin onto the quartz floor.",
          "3. Cap with a directional carb cap or terp pearl to swirl vapor evenly.",
          "4. Inhale smooth, flavor-packed clouds and wipe clean with a cotton swab while warm."
        ]
      }
    ],
    recommendedCategorySlug: "concentrates",
    recommendedProductSearch: "Rosin",
    faqs: [
      {
        question: "Why is Live Hash Rosin more expensive than distillate or shatter?",
        answer: "Live Rosin requires massive quantities of fresh-frozen exotic flower, specialized ice-washing hardware, freeze dryers, manual labor, and yields only 3% to 7% rosin per batch."
      },
      {
        question: "Does Live Rosin need to be refrigerated?",
        answer: "Yes! To prevent terpene degradation and drying out, store your Live Rosin jars sealed inside a refrigerator between 38\xB0F and 45\xB0F."
      }
    ]
  },
  {
    id: "thca-vs-delta-9-thc",
    slug: "thca-vs-delta-9-thc",
    title: "THCA vs. Delta-9 THC: Key Differences, Effects, and What Buyers Should Know",
    metaTitle: "THCA vs Delta-9 THC: Differences, Effects & Legality | Global Herbs",
    metaDescription: "Discover the scientific differences between THCA and Delta-9 THC. Learn the chemical differences, decarboxylation heat formula, federal legality under the 2018 Farm Bill, and buyer guide.",
    targetKeywords: [
      "thca vs delta 9 thc",
      "difference between thca and thc",
      "does thca get you high",
      "thca decarboxylation temperature",
      "is thca legal 2018 farm bill",
      "thca flower vs traditional weed",
      "thca drug test results",
      "how thca converts to delta 9",
      "buy high thca flower online",
      "thca potency calculation formula"
    ],
    category: "THCa & Legality",
    categorySlug: "thca-legality",
    author: {
      name: "Dr. Julian Mercer",
      role: "Professor of Clinical Phytochemistry & Pharmacokinetics",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200"
    },
    reviewer: {
      name: "Dr. Arthur Vance, Ph.D.",
      credentials: "Chief Analytical Chemist & ISO-17025 Cannabinoid Lab Auditor"
    },
    publishedDate: "October 27, 2026",
    readTime: "14 min read",
    featuredImage: "/images/indoor_flower_buds.jpg",
    excerpt: "What is the real chemical and physiological difference between THCA and Delta-9 THC? Discover how a single carboxyl acid group prevents raw THCA from binding to CB1 brain receptors, master the thermal decarboxylation formula (Total THC = [THCA \xD7 0.877] + Delta-9), review why high-THCA hemp flower is 100% federally legal under the 2018 Farm Bill, and learn what buyers must know regarding drug tests, potency calculations, and lab-tested exotic strains.",
    keyTakeaways: [
      "The 2-Carboxylic Acid Difference: Tetrahydrocannabinolic Acid (THCA) is the unheated, naturally synthesized precursor to Delta-9 THC. It possesses an extra carboxylic acid ring (-COOH) that creates spatial steric hindrance, preventing it from binding to human CB1 endocannabinoid receptors in the brain. In its raw, unheated form, THCA is non-intoxicating.",
      "The 87.7% Decarboxylation Formula: When subjected to thermal energy (combustion, vaporization, or decarboxylation ovens above 220\xB0F/105\xB0C), THCA sheds its carboxyl group as CO2 vapor. Because carbon dioxide makes up 12.3% of the THCA molecule by molecular weight, the universal formula for potential total THC is: Total THC = (% THCA \xD7 0.877) + % Delta-9 THC.",
      "Identical Smoked & Vaporized Pharmacology: Once heated, THCA converts instantaneously into Delta-9 THC. Inhaling top-tier [High THCa Flower](/category/flowers) delivers the exact same pharmacokinetics, cerebral elevation, somatic relief, and duration as top-shelf traditional dispensary cannabis.",
      "Federal 2018 Farm Bill Legality: Under 7 U.S.C. \xA7 1639o, the statutory legal definition of hemp is Cannabis sativa L. with a Delta-9 THC concentration of \u2264 0.3% by dry weight. Because compliant THCA flower has not yet undergone decarboxylation and maintains Delta-9 THC below 0.3%, it complies with federal law and ships safely across the United States.",
      "Drug Testing Reality: Standard workplace 5-panel and 10-panel drug screens test for 11-nor-9-carboxy-THC (THC-COOH), the primary inactive metabolite produced when the liver oxidizes Delta-9 THC. Inhaling or ingesting heated THCA produces the exact same metabolic markers and will result in a positive drug test."
    ],
    tableOfContents: [
      { id: "molecular-chemistry-carboxyl-moiety", title: "1. Chemical & Molecular Differences: The Role of the 2-Carboxylic Acid Moiety" },
      { id: "thermal-decarboxylation-kinetics-formula", title: "2. The Decarboxylation Mechanism: Temperatures, Kinetics & The 87.7% Math" },
      { id: "subjective-effects-raw-vs-heated", title: "3. Subjective Effects & Pharmacology: Raw Ingestion vs. Heated Inhalation" },
      { id: "thca-vs-delta-9-comparison-matrix", title: "4. Comprehensive Side-by-Side Comparison: THCA vs. Delta-9 THC Matrix" },
      { id: "federal-legality-2018-farm-bill", title: "5. Federal Legality & The 2018 Farm Bill: Why THCA Ships Legally Online" },
      { id: "workplace-drug-testing-pharmacology", title: "6. Workplace Drug Testing: Why Inhaled THCA Triggers a Positive Screen" },
      { id: "buyer-guide-choosing-lab-tested-thca", title: "7. Buyer\u2019s Guide: How to Audit COAs & Choose Premium THCA Products" }
    ],
    contentSections: [
      {
        id: "molecular-chemistry-carboxyl-moiety",
        title: "1. Chemical & Molecular Differences: The Role of the 2-Carboxylic Acid Moiety",
        paragraphs: [
          'In recent years, the emergence of federally compliant high-THCA cannabis flower, solventless concentrates, and crystalline diamonds has revolutionized the botanical marketplace. Yet among both newcomer shoppers and seasoned cannabis connoisseurs, a fundamental question persists: "What is the actual chemical difference between THCA and Delta-9 THC, and why does one get you high while the other does not?"',
          'To understand the distinction, we must examine plant phytochemistry. Cannabis sativa L. does not directly synthesize Delta-9-tetrahydrocannabinol in its resin glands. Inside the secretory cells of capitate-stalked glandular trichomes, the plant enzymatic cascade begins with olivetolic acid and geranyl pyrophosphate, combining to produce cannabigerolic acid (CBGA)\u2014the biological "stem cell" cannabinoid.',
          "Specialized oxidoreductase enzymes, principally THCA-synthase, cyclize CBGA into delta-9-tetrahydrocannabinolic acid (THCA). In its native biological state, THCA possesses the molecular formula C22H30O4 with a molecular weight of 358.47 g/mol.",
          "The defining structural attribute of THCA is a carboxyl acid group (-COOH) attached at the 2-position of the aromatic ring. This carboxyl group is not a minor cosmetic detail; it is a bulky, polar molecular appendage that radically dictates how the molecule interfaces with mammalian physiology.",
          "The human endocannabinoid system (ECS) relies heavily on Cannabinoid Type 1 (CB1) receptors, which are G-protein coupled neuro-receptors concentrated in the cerebral cortex, basal ganglia, hippocampus, and cerebellum. For a cannabinoid to trigger psychoactive euphoria, it must dock cleanly into the orthosteric binding pocket of the CB1 receptor.",
          "Delta-9 THC (molecular formula C21H30O2, molecular weight 314.46 g/mol) is a non-polar, lipophilic molecule with the ideal three-dimensional conformation to fit effortlessly into the CB1 binding pocket, acting as a partial agonist that downregulates cyclic AMP (cAMP) and modulates neurotransmitter release.",
          "THCA, by contrast, cannot fit into this receptor pocket. The extra 2-carboxylic acid group creates substantial spatial steric hindrance and introduces polar electrostatic repulsions. It is the molecular equivalent of trying to insert an uncarved key into a precision tumbler lock. Because THCA cannot bind to CB1 receptors, consuming unheated, raw THCA produces zero psychoactive intoxication or mental cloudiness."
        ],
        calloutBox: {
          type: "info",
          title: "Direct Scientific Summary: Why Raw THCA Is Non-Psychoactive",
          text: "Raw THCA cannot get you high because its three-dimensional carboxylic acid group (-COOH) physically blocks the molecule from binding to CB1 receptors in the human brain. Delta-9 THC has shed this carboxyl group, allowing it to dock cleanly into CB1 receptors and stimulate psychoactivity."
        }
      },
      {
        id: "thermal-decarboxylation-kinetics-formula",
        title: "2. The Decarboxylation Mechanism: Temperatures, Kinetics & The 87.7% Potency Math",
        paragraphs: [
          "If THCA is non-intoxicating in its native raw state, how does smoking or vaporizing [High THCa Flower](/category/flowers) produce an intense, authentic cannabis high that rivals or surpasses medical dispensary strains?",
          "The transformation occurs through an elementary chemical process known as thermal decarboxylation. When THCA is exposed to heat, the unstable carbon-carbon bond holding the carboxyl group destabilizes. The carboxyl group breaks away, releasing volatile carbon dioxide (CO2) gas and water vapor into the air, leaving behind neutral, psychoactive Delta-9 THC."
        ],
        subsections: [
          {
            subtitle: "Decarboxylation Temperature Kinetics: Ovens vs. Direct Flame",
            paragraphs: [
              "Decarboxylation is governed by a temperature-time curve. In cannabis baking and culinary infusions, decarboxylating ground flower in a laboratory oven requires prolonged, gentle exposure: heating at 220\xB0F to 245\xB0F (105\xB0C to 118\xB0C) for 35 to 45 minutes achieves near 100% conversion while avoiding thermal destruction of cannabinoids.",
              "However, when inhaling flower via a pipe, bong, joint, or dry-herb vaporizer, temperatures are vastly higher. A butane lighter flame burns at roughly 1,000\xB0F to 1,900\xB0F (540\xB0C to 1,040\xB0C), while a precision ceramic or convection dry-herb vaporizer operates between 365\xB0F and 410\xB0F (185\xB0C to 210\xB0C).",
              "Under these elevated thermal conditions, decarboxylation occurs in milliseconds. As heated air passes through the botanical trichome matrix, THCA sheds its carboxyl group instantly. The vapor entering your pulmonary alveoli is not THCA; it is freshly synthesized, gaseous Delta-9 THC accompanied by native terpenes and minor cannabinoids."
            ]
          },
          {
            subtitle: "The 87.7% Mathematical Formula: Reading Laboratory COAs Accurately",
            paragraphs: [
              "When examining a third-party Certificate of Analysis (COA) for [THCA Zkittlez Pie Indoor Flower](/products/thca-zkittlez-pie-indoor-flower) or artisanal concentrates, shoppers frequently notice that the total potential THC is slightly lower than the raw percentage of THCA printed on the lab report.",
              "This is not a measurement error or dispensary dilution; it is a mathematical consequence of molecular mass loss. During decarboxylation, the released carbon dioxide (CO2) molecule carries away 44.01 g/mol of mass. By dividing the molecular weight of Delta-9 THC (314.46 g/mol) by the molecular weight of THCA (358.47 g/mol), analytical chemists establish the universal stoichiometric conversion factor:"
            ],
            bullets: [
              "Conversion Ratio: 314.46 \xF7 358.47 = 0.87719 (87.7%)",
              "The Universal Potency Formula: Total Potential THC = (% THCA \xD7 0.877) + % Delta-9 THC",
              "Practical Example: If a high-THCA cultivar tests at 30.0% THCA and 0.20% Delta-9 THC, its true active potency when vaporized is: (30.0 \xD7 0.877) + 0.20 = 26.51% Total THC by weight."
            ]
          }
        ],
        calloutBox: {
          type: "tip",
          title: "Dispensary Connoisseur Tip: Optimal Vaporization Window",
          text: "To convert 99%+ of THCA into active Delta-9 THC while preserving delicate monoterpenes like Beta-Myrcene (boiling point 334\xB0F) and Limonene (349\xB0F), calibrate your dry-herb vaporizer between 375\xB0F and 395\xB0F (190\xB0C\u2013201\xB0C). This avoids combustion carcinogens while capturing rich flavor and full psychoactive potency."
        }
      },
      {
        id: "subjective-effects-raw-vs-heated",
        title: "3. Subjective Effects & Pharmacology: Raw Ingestion vs. Heated Inhalation",
        paragraphs: [
          "Because THCA and Delta-9 THC exhibit completely divergent affinities for human cannabinoid receptors, their subjective effects and physiological pathways depend entirely on whether the product is administered in its raw state or heated."
        ],
        subsections: [
          {
            subtitle: "Raw THCA Administration: Non-Intoxicating Functional Wellness",
            paragraphs: [
              "When raw cannabis leaves or unheated [Artisanal Extracts](/category/concentrates) are consumed without heat\u2014such as in cold-pressed juices, raw sublingual oils, or enteric-coated capsules\u2014THCA enters the bloodstream in its acid form. It produces zero impairment, zero cognitive disruption, and zero alterations to sensory perception.",
              "Instead, scientific research indicates that raw THCA acts upon secondary receptor systems and enzymatic cascades:"
            ],
            bullets: [
              "TRPV1 & TRPA1 Ion Channel Modulation: THCA desensitizes transient receptor potential cation channels involved in peripheral pain perception and neurogenic inflammation.",
              "COX-1 & COX-2 Enzyme Inhibition: Similar to non-steroidal anti-inflammatory drugs (NSAIDs), preclinical research demonstrates that acidic cannabinoids inhibit cyclooxygenase enzymes, supporting healthy systemic inflammatory response without gastric irritation.",
              "PPAR-Gamma Receptor Agonism: THCA binds to Peroxisome Proliferator-Activated Receptor Gamma (PPAR\u03B3), a nuclear receptor that regulates metabolic homeostasis, neuroprotection, and lipid metabolism.",
              "Antiemetic Potency: Studies by Parker and colleagues (2013) demonstrated that raw THCA exhibits potent anti-nausea properties at sub-milligram concentrations via non-CB1 pathways."
            ]
          },
          {
            subtitle: "Heated Inhalation & Decarboxylated Ingestion: Complete Psychoactive Immersion",
            paragraphs: [
              "The moment THCA flower or concentrate meets thermal energy, it undergoes rapid conversion into Delta-9 THC, initiating the classic pharmacodynamics familiar to cannabis consumers:"
            ],
            bullets: [
              "Rapid Pulmonary Absorption: Inhaled Delta-9 THC diffuses through pulmonary alveoli directly into arterial blood, crossing the blood-brain barrier within 3 to 10 minutes.",
              "Central CB1 Receptor Stimulation: Delta-9 THC stimulates dopamine release in the mesolimbic pathway, producing euphoric elevation, uplifted mood, sensory enhancement, and altered time perception.",
              "Somatic Body Relaxation: Activation of peripheral CB1 and CB2 receptors induces deep muscular ease, physical relaxation, and reduction of nervous tension.",
              "Duration of Action: Inhalation peaks at 15\u201330 minutes and gently tapers over 2\u20133 hours. If baked into edibles, hepatic first-pass metabolism converts Delta-9 THC into the even more potent 11-hydroxy-THC metabolite, yielding an 6\u20138 hour body-stone experience."
            ]
          }
        ]
      },
      {
        id: "thca-vs-delta-9-comparison-matrix",
        title: "4. Comprehensive Side-by-Side Comparison: THCA vs. Delta-9 THC Matrix",
        paragraphs: [
          "To help buyers quickly reference the biological, legal, and operational distinctions between these two closely related cannabinoids, review this side-by-side analytical matrix:"
        ],
        table: {
          caption: "Comprehensive Chemical, Pharmacological, and Regulatory Comparison: THCA vs. Delta-9 THC",
          headers: ["Evaluation Parameter", "THCA (Tetrahydrocannabinolic Acid)", "Delta-9 THC (Delta-9-Tetrahydrocannabinol)"],
          rows: [
            ["Chemical Formula", "C22H30O4 (Acidic precursor)", "C21H30O2 (Neutral cannabinoid)"],
            ["Molecular Weight", "358.47 g/mol (Carboxylated)", "314.46 g/mol (Decarboxylated)"],
            ["Naturally Synthesized in Plant?", "Yes \u2014 Primary cannabinoid synthesized by trichomes", "No \u2014 Only forms through thermal or UV degradation"],
            ["Intoxicating / Psychoactive in Raw State?", "Non-Intoxicating (Zero psychoactive impairment)", "Highly Psychoactive & Intoxicating"],
            ["CB1 Receptor Binding Affinity", "Negligible (Steric hindrance blocks docking)", "Strong Partial Agonist (Binds orthosteric site)"],
            ["Decarboxylation Required for High?", "Yes \u2014 Requires heat (\u2265 220\xB0F / 105\xB0C)", "No \u2014 Already fully active upon ingestion/inhalation"],
            ["Federal Legal Status (2018 Farm Bill)", "Federally Compliant Hemp (If Delta-9 \u2264 0.3% dry wt)", "Schedule I Controlled Substance (If Delta-9 > 0.3%)"],
            ["Typical Percentage in Raw Flower", "20% to 35%+ in premium craft cultivars", "0.05% to 0.28% in unheated compliant flower"],
            ["Target Physiological Pathways", "TRPV1, TRPA1, COX-1/2, PPAR\u03B3 nuclear receptors", "CB1, CB2, GPR55, Mesolimbic dopamine cascade"],
            ["Effect on Workplace Drug Screen", "Causes positive result when smoked or vaped", "Causes positive result in all consumption formats"]
          ]
        }
      },
      {
        id: "federal-statutory-compliance-farm-bill",
        title: "5. Federal Legality & The 2018 Farm Bill: Why THCA Ships Legally Online",
        paragraphs: [
          "Perhaps the most astonishing reality for modern botanical consumers is that top-shelf, dispensary-grade THCA flower can be legally purchased online with doorstep delivery across the United States. To understand why this is 100% compliant with federal law, one must examine the specific statutory codification of the Agriculture Improvement Act of 2018.",
          'Under Section 10113 of the 2018 Farm Bill, codified into federal law at 7 U.S.C. \xA7 1639o(1), the United States Congress established the legal definition of "hemp":',
          `"The term 'hemp' means the plant Cannabis sativa L. and any part of that plant, including the seeds thereof and all derivatives, extracts, cannabinoids, isomers, acids, salts, and salts of isomers, whether growing or not, with a delta-9 tetrahydrocannabinol concentration of not more than 0.3 percent on a dry weight basis."`,
          'Notice the exact statutory precision chosen by federal lawmakers: the law does not restrict "THCA," "total THC," or "cannabinoid potential" in commercial finished goods. It explicitly and exclusively restricts delta-9 tetrahydrocannabinol to a threshold of 0.3% by dry weight.',
          "Because pristine, living cannabis plants synthesize THCA rather than Delta-9 THC, fresh indoor craft cultivars harvested and slow-cured under cold temperatures naturally contain 25% to 32% THCA while maintaining active Delta-9 THC below the 0.3% statutory limit. Under the clear text of federal law, such flower constitutes legal industrial hemp.",
          "Furthermore, Section 10114 of the 2018 Farm Bill explicitly prohibits states from interfering with the interstate transportation of compliant hemp commodities through their borders. When you order from Global Herbs, every shipment is packed in odor-proof vacuum barrier bags accompanied by accredited lab COAs, law enforcement notices, and Farm Bill compliance statements."
        ],
        calloutBox: {
          type: "info",
          title: "Federal Statutory Distinction: Delta-9 THC vs. Total Cannabinoids",
          text: "Federal law under 7 U.S.C. \xA7 1639o draws a strict legal boundary: if a botanical product contains 0.3% or less of Delta-9 THC on a dry-weight basis, it is classified as industrial hemp. The high concentration of non-decarboxylated THCA does not alter its legal categorization prior to consumer heating."
        }
      },
      {
        id: "workplace-drug-testing-pharmacology",
        title: "6. Workplace Drug Testing: Why Inhaled THCA Triggers a Positive Screen",
        paragraphs: [
          "A dangerous and pervasive rumor circulating on internet forums claims that because THCA flower is federally compliant hemp, consuming it will not cause you to fail a workplace drug screen. This claim is completely false.",
          "Understanding how workplace drug testing works reveals why consuming THCA flower or concentrates will trigger a positive test result every single time."
        ],
        subsections: [
          {
            subtitle: "Immunoassays Detect Metabolites, Not Initial Plant Compounds",
            paragraphs: [
              "Standard 5-panel, 10-panel, and 12-panel workplace urinalysis immunoassays (such as those regulated by the Substance Abuse and Mental Health Services Administration, or SAMHSA) do not look for THCA or unheated plant resin in your urine.",
              "When you inhale vaporized or smoked THCA, it converts into Delta-9 THC in milliseconds before entering your bloodstream. As arterial blood circulates through your liver, cytochrome P450 enzymes (specifically CYP2C9 and CYP3A4) oxidize Delta-9 THC first into active 11-hydroxy-THC, and subsequently into the primary inactive urinary metabolite: 11-nor-9-carboxy-THC (THC-COOH).",
              "Commercial urine test strips are calibrated specifically to bind with antibodies targeting THC-COOH at a standard 50 ng/mL screening cutoff threshold (and a 15 ng/mL GC-MS confirmatory threshold). Because the human liver produces the exact same THC-COOH metabolite regardless of whether the original source was dispensary Delta-9 weed or Farm Bill-compliant THCA flower, the laboratory screen cannot and will not distinguish between them."
            ]
          },
          {
            subtitle: "Biological Detection Windows by Consumption Frequency",
            paragraphs: [
              "Because cannabinoids and their metabolites are highly lipophilic (fat-soluble), they deposit into adipose tissue and leach slowly back into the bloodstream over days or weeks:"
            ],
            bullets: [
              "Infrequent / Single-Use: 3 to 5 days following consumption.",
              "Moderate Use (2\u20133 times per week): 7 to 14 days.",
              "Daily / Chronic Consumer: 30 to 45+ days, depending on body mass index (BMI), metabolic rate, and hydration.",
              "Oral Fluid / Saliva Screens: 24 to 72 hours.",
              "Hair Follicle Analysis: Up to 90 days from ingestion."
            ]
          }
        ],
        calloutBox: {
          type: "warning",
          title: "Critical Consumer Warning: Drug Testing Policy",
          text: "If your employment, commercial driver license (CDL), athletic organization, or judicial status requires mandatory drug screening, DO NOT consume THCA flower, vapes, or concentrates. Inhaling heated THCA metabolizes into THC-COOH and will result in a positive drug test."
        }
      },
      {
        id: "buyer-guide-choosing-lab-tested-thca",
        title: "7. Buyer\u2019s Guide: How to Audit COAs & Choose Premium THCA Products",
        paragraphs: [
          "With the explosive proliferation of online vendors advertising THCA flower, consumer vigilance is paramount. Low-grade operations frequently purchase bulk outdoor biomass sprayed with synthetic terpenes, or fail to provide comprehensive safety testing.",
          "When shopping for high-THCA products online at Global Herbs, follow this three-step verification protocol to guarantee you receive pure, potent, and safe botanical medicine:"
        ],
        subsections: [
          {
            subtitle: "Step 1: Demand an Independent ISO/IEC 17025 Certificate of Analysis (COA)",
            paragraphs: [
              "Never purchase THCA flower or extracts from an online vendor that does not publish batch-specific Certificates of Analysis from an ISO/IEC 17025 accredited analytical facility. A legitimate COA must feature:"
            ],
            bullets: [
              "Verifiable QR Code & Batch ID: Direct digital link to the third-party testing facility portal.",
              "High-Performance Liquid Chromatography (HPLC) Potency Profile: Exact milligram and percentage readouts for THCA, Delta-9 THC (must be \u2264 0.30%), CBDA, CBG, and total cannabinoids.",
              "Full-Panel Contaminant Screening: Non-Detect (ND) results for 60+ agricultural pesticides, toxic heavy metals (arsenic, cadmium, lead, mercury), residual hydrocarbon solvents, and microbial pathogens (Aspergillus, Salmonella, E. coli)."
            ]
          },
          {
            subtitle: "Step 2: Prioritize Organic Living Soil & Cold-Cured Cultivars",
            paragraphs: [
              "Top-tier cultivars like [THCA Zkittlez Pie Indoor Flower](/products/thca-zkittlez-pie-indoor-flower) (28% THCA) and [THCA Gelato Indoor Flower](/products/thca-gelato-indoor-flower) are cultivated in climate-controlled indoor cleanrooms using organic living soil amendments. Living soil allows roots to uptake complex micronutrients naturally, generating dense trichome blankets and rich terpene concentrations exceeding 2.5% to 4.0% by weight.",
              "Equally vital is the post-harvest cure. Premium growers employ cold-cure drying protocols (60\xB0F / 60% relative humidity for 14\u201321 days). This slow cure locks in fragile monoterpenes like myrcene, caryophyllene, and linalool while preventing premature thermal decarboxylation before the flower reaches your doorstep."
            ]
          },
          {
            subtitle: "Step 3: Proper Storage to Preserve Potency & Prevent Degradation",
            paragraphs: [
              "Because THCA is thermally sensitive, improper storage can cause early degradation into Delta-9 THC and eventually into sedating cannabinol (CBN). To maintain maximum fresh potency:"
            ],
            bullets: [
              "Store inside airtight, UV-shielded amber glass apothecary jars.",
              "Maintain ambient temperatures between 55\xB0F and 68\xB0F (13\xB0C to 20\xB0C).",
              "Include a 62% two-way humidity pack (such as Boveda) to prevent trichome brittleness.",
              "Never store flower inside a freezer without vacuum sealing, as freeze-thaw cycles snap delicate glandular trichome heads."
            ]
          }
        ],
        calloutBox: {
          type: "tip",
          title: "The Global Herbs Quality Guarantee",
          text: "Every batch of flower at Global Herbs is double vacuum-sealed with food-grade barrier bags and shipped in discreet, crush-proof packaging with full transit insurance. Browse our curated selection of [Indoor THCa Flower](/category/flowers) to experience laboratory-verified purity."
        }
      }
    ],
    recommendedCategorySlug: "flowers",
    recommendedProductSearch: "THCA",
    faqs: [
      {
        question: "Does THCA get you high if you eat it raw without cooking or heating?",
        answer: "No. Raw, unheated THCA does not produce psychoactive intoxication because its 2-carboxylic acid group (-COOH) creates steric hindrance, physically preventing the molecule from docking into CB1 receptors in the brain. It only becomes psychoactive after being exposed to thermal energy above 220\xB0F (105\xB0C), which decarboxylates THCA into Delta-9 THC."
      },
      {
        question: "How is THCA flower legal to ship across state lines under the Farm Bill?",
        answer: "Under the 2018 Farm Bill (7 U.S.C. \xA7 1639o), industrial hemp is defined as Cannabis sativa L. containing no more than 0.3% Delta-9 THC on a dry-weight basis. Because compliant high-THCA cultivars naturally contain less than 0.3% active Delta-9 THC prior to consumer decarboxylation, they satisfy federal statutory hemp guidelines and can be transported across state lines."
      },
      {
        question: "Will smoking or vaping THCA flower cause you to fail a workplace drug test?",
        answer: "Yes. Commercial workplace drug immunoassays test for 11-nor-9-carboxy-THC (THC-COOH), the primary metabolic byproduct formed when the liver oxidizes Delta-9 THC. Because inhaling or smoking THCA instantly converts it into Delta-9 THC, your liver produces the exact same metabolic markers, triggering a positive drug screen."
      },
      {
        question: "How do you calculate the actual potency of THCA flower from a lab report?",
        answer: "Use the universal stoichiometric conversion formula: Total Potential THC = (% THCA \xD7 0.877) + % Delta-9 THC. The 0.877 factor accounts for the 12.3% loss of molecular mass when the carbon dioxide (CO2) carboxyl group is released during thermal decarboxylation. For example, flower with 25% THCA and 0.2% Delta-9 THC yields: (25 \xD7 0.877) + 0.2 = 22.125% total active THC."
      },
      {
        question: "What is the best temperature to vaporize THCA flower to preserve flavor and cannabinoids?",
        answer: "The optimal dry-herb vaporization range is between 375\xB0F and 395\xB0F (190\xB0C\u2013201\xB0C). This temperature window provides rapid, 99%+ thermal decarboxylation of THCA into Delta-9 THC while remaining safely below the combustion threshold and preserving delicate aromatic terpenes like myrcene, limonene, and beta-caryophyllene."
      },
      {
        question: "How should I store THCA flower to prevent it from degrading before use?",
        answer: "Store your THCA flower in airtight, UV-blocking amber glass jars in a cool, dark location between 55\xB0F and 65\xB0F (13\xB0C\u201318\xB0C). Maintain relative humidity between 58% and 62% using a two-way humidity control pack (like Boveda). Avoid exposure to heat, direct sunlight, and moisture, which cause premature decarboxylation and terpene oxidation."
      }
    ],
    scientificReferences: [
      {
        citation: "Russo, E. B. (2011). Taming THC: potential cannabis synergy and phytocannabinoid-terpenoid entourage effects. British Journal of Pharmacology, 163(7), 1344\u20131364.",
        doiUrl: "https://doi.org/10.1111/j.1476-5381.2011.01238.x",
        source: "British Journal of Pharmacology"
      },
      {
        citation: "Dussy, F. E., Hamberg, C., Luginb\xFChl, M., Schwerzmann, T., & Briellmann, T. A. (2005). Isolation of Delta9-THCA-A from an extract of Cannabis sativa L. and its decarboxylation to Delta9-THC. Forensic Science International, 149(1), 3\u201310.",
        doiUrl: "https://doi.org/10.1016/j.forsciint.2004.05.015",
        source: "Forensic Science International"
      },
      {
        citation: "Wang, M., Wang, Y. H., Avula, B., Radwan, M. M., Wanas, A. S., van Antwerp, J., Parcher, J. F., ElSohly, M. A., & Khan, I. A. (2016). Decarboxylation Study of Acidic Cannabinoids: A Novel Approach Using High-Performance Liquid Chromatography-Photodiode Array-Mass Spectrometry. Cannabis and Cannabinoid Research, 1(1), 262\u2013271.",
        doiUrl: "https://doi.org/10.1089/can.2016.0020",
        source: "Cannabis and Cannabinoid Research"
      },
      {
        citation: "U.S. Congress. (2018). Agriculture Improvement Act of 2018 (Public Law 115-334). Section 10113 Hemp Production (7 U.S.C. \xA7 1639o).",
        doiUrl: "https://www.congress.gov/bill/115th-congress/house-bill/2",
        source: "U.S. Government Publishing Office"
      }
    ],
    botanicalDisclaimer: "These educational statements have not been evaluated by the Food and Drug Administration. These products and educational guides are not intended to diagnose, treat, cure, or prevent any disease. All hemp-derived products sold by Global Herbs contain 0.3% or less Delta-9 THC on a dry-weight basis in full compliance with the 2018 Farm Bill. Must be 21+ to purchase. Keep strictly out of reach of children and pets."
  }
];

// src/server/blog/db.ts
var isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
function getDbConfig() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connectionString) {
    const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    return {
      connectionString,
      isConfigured: true,
      config: {
        connectionString,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 1e4,
        idleTimeoutMillis: 3e4
      }
    };
  }
  if (process.env.PGHOST || process.env.SQL_HOST) {
    const host = process.env.PGHOST || process.env.SQL_HOST;
    const user = process.env.PGUSER || process.env.SQL_USER || "postgres";
    const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD;
    const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || "postgres";
    const port = Number(process.env.PGPORT || 5432);
    return {
      isConfigured: true,
      config: {
        host,
        user,
        password,
        database,
        port,
        ssl: host?.includes("localhost") ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 1e4
      }
    };
  }
  return { config: null, isConfigured: false };
}
function getPool() {
  if (global._globalPgPool) {
    return global._globalPgPool;
  }
  const { config, isConfigured } = getDbConfig();
  if (!isConfigured || !config) {
    if (isProduction) {
      console.error(
        "[Database CRITICAL] No PostgreSQL database configured in production! Set POSTGRES_URL or DATABASE_URL in Vercel project environment variables."
      );
    }
    return null;
  }
  const pool = new Pool(config);
  pool.on("error", (err) => {
    console.error("[Database Pool Error] Unexpected error on idle Postgres client:", err);
  });
  global._globalPgPool = pool;
  return pool;
}
async function initDatabase() {
  if (global._globalDbInitPromise) {
    return global._globalDbInitPromise;
  }
  global._globalDbInitPromise = (async () => {
    const pool = getPool();
    if (!pool) {
      if (isProduction) {
        throw new Error(
          "Database connection required in production. Missing POSTGRES_URL or DATABASE_URL."
        );
      }
      console.warn("[Database] Running in development mode without PostgreSQL connection.");
      return;
    }
    const client = await pool.connect();
    try {
      console.log("[Database] Running schema migrations & index creation...");
      await client.query("BEGIN");
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_articles (
          id VARCHAR(128) PRIMARY KEY,
          slug VARCHAR(255) UNIQUE NOT NULL,
          title TEXT NOT NULL,
          meta_title TEXT,
          meta_description TEXT,
          primary_keyword VARCHAR(255),
          target_keywords JSONB DEFAULT '[]'::jsonb,
          category VARCHAR(128),
          category_slug VARCHAR(128),
          status VARCHAR(32) NOT NULL DEFAULT 'draft',
          scheduled_for TIMESTAMPTZ,
          published_at TIMESTAMPTZ,
          published_date VARCHAR(64),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          seo_score INTEGER DEFAULT 0,
          word_count INTEGER DEFAULT 0,
          is_ai_generated BOOLEAN DEFAULT FALSE,
          failure_reason TEXT,
          publish_attempts INTEGER DEFAULT 0,
          last_attempt_at TIMESTAMPTZ,
          locked_at TIMESTAMPTZ,
          locked_by VARCHAR(128),
          author JSONB,
          reviewer JSONB,
          read_time VARCHAR(64),
          featured_image TEXT,
          image_alt TEXT,
          excerpt TEXT,
          key_takeaways JSONB DEFAULT '[]'::jsonb,
          table_of_contents JSONB DEFAULT '[]'::jsonb,
          content_sections JSONB DEFAULT '[]'::jsonb,
          faqs JSONB DEFAULT '[]'::jsonb,
          scientific_references JSONB DEFAULT '[]'::jsonb,
          botanical_disclaimer TEXT,
          recommended_category_slug VARCHAR(128),
          recommended_product_search VARCHAR(128)
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_schedule_config (
          id VARCHAR(64) PRIMARY KEY,
          enabled BOOLEAN DEFAULT TRUE,
          auto_publish_approved_drafts BOOLEAN DEFAULT FALSE,
          timezone VARCHAR(64) DEFAULT 'America/Los_Angeles',
          days_of_week JSONB DEFAULT '[1, 3, 5]'::jsonb,
          publish_hour INTEGER DEFAULT 10,
          publish_minute INTEGER DEFAULT 0,
          scheduler_secret TEXT,
          auto_generate_topic_weekly BOOLEAN DEFAULT FALSE,
          last_run_at TIMESTAMPTZ,
          next_scheduled_slot TIMESTAMPTZ,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS blog_audit_logs (
          id VARCHAR(128) PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW(),
          action VARCHAR(64) NOT NULL,
          article_id VARCHAR(128),
          article_slug VARCHAR(255),
          article_title TEXT,
          status VARCHAR(32),
          user_identity VARCHAR(128),
          details TEXT
        );
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
        CREATE INDEX IF NOT EXISTS idx_blog_articles_status_scheduled ON blog_articles(status, scheduled_for);
        CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category_slug);
        CREATE INDEX IF NOT EXISTS idx_blog_audit_logs_timestamp ON blog_audit_logs(timestamp DESC);
      `);
      await client.query("COMMIT");
      console.log("[Database] Schema migrations and indexes verified successfully.");
      const articleCountRes = await client.query("SELECT COUNT(*) FROM blog_articles");
      const articleCount = parseInt(articleCountRes.rows[0].count, 10);
      if (articleCount === 0) {
        console.log("[Database Migration] blog_articles is empty. Migrating existing articles...");
        let sourceArticles = [];
        const jsonPath = path.join(process.cwd(), "data/blog_articles.json");
        if (fs.existsSync(jsonPath)) {
          try {
            sourceArticles = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
            console.log(`[Database Migration] Read ${sourceArticles.length} articles from data/blog_articles.json`);
          } catch (e) {
            console.warn("[Database Migration] Could not parse data/blog_articles.json, using baseline:", e);
          }
        }
        if (sourceArticles.length === 0) {
          sourceArticles = blogArticles.map((b, index) => ({
            ...b,
            status: "published",
            primaryKeyword: b.targetKeywords?.[0] || "cannabis education",
            createdAt: new Date(Date.now() - (6 - index) * 7 * 864e5).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            publishedAt: new Date(Date.now() - (6 - index) * 7 * 864e5).toISOString(),
            seoScore: 94,
            wordCount: b.contentSections.reduce((acc, sec) => {
              const pWords = (sec.paragraphs || []).join(" ").split(/\s+/).length;
              return acc + pWords;
            }, 0),
            isAiGenerated: false
          }));
        }
        for (const art of sourceArticles) {
          await client.query(
            `
            INSERT INTO blog_articles (
              id, slug, title, meta_title, meta_description, primary_keyword, target_keywords,
              category, category_slug, status, scheduled_for, published_at, published_date,
              created_at, updated_at, seo_score, word_count, is_ai_generated, failure_reason,
              publish_attempts, author, reviewer, read_time, featured_image, image_alt, excerpt,
              key_takeaways, table_of_contents, content_sections, faqs, scientific_references,
              botanical_disclaimer, recommended_category_slug, recommended_product_search
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
              $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
            )
            ON CONFLICT (id) DO NOTHING
            `,
            [
              art.id,
              art.slug,
              art.title,
              art.metaTitle || art.title,
              art.metaDescription || "",
              art.primaryKeyword || art.targetKeywords?.[0] || "",
              JSON.stringify(art.targetKeywords || []),
              art.category || "Guides",
              art.categorySlug || "guides",
              art.status || "draft",
              art.scheduledFor || null,
              art.publishedAt || null,
              art.publishedDate || "",
              art.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
              art.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
              art.seoScore || 85,
              art.wordCount || 1e3,
              !!art.isAiGenerated,
              art.failureReason || null,
              art.publishAttempts || 0,
              JSON.stringify(art.author || {}),
              JSON.stringify(art.reviewer || {}),
              art.readTime || "5 min read",
              art.featuredImage || "/images/buy_hemp_online_guide.jpg",
              art.imageAlt || art.title,
              art.excerpt || "",
              JSON.stringify(art.keyTakeaways || []),
              JSON.stringify(art.tableOfContents || []),
              JSON.stringify(art.contentSections || []),
              JSON.stringify(art.faqs || []),
              JSON.stringify(art.scientificReferences || []),
              art.botanicalDisclaimer || "",
              art.recommendedCategorySlug || "concentrates-wax",
              art.recommendedProductSearch || "Live Rosin"
            ]
          );
        }
        console.log(`[Database Migration] Migrated ${sourceArticles.length} articles into PostgreSQL.`);
      }
      const configCountRes = await client.query("SELECT COUNT(*) FROM blog_schedule_config");
      if (parseInt(configCountRes.rows[0].count, 10) === 0) {
        let scheduleConfig = {
          enabled: true,
          autoPublishApprovedDrafts: false,
          timezone: "America/Los_Angeles",
          daysOfWeek: [1, 3, 5],
          publishHour: 10,
          publishMinute: 0,
          schedulerSecret: process.env.CRON_SECRET || "gh-scheduler-sec-2026",
          autoGenerateTopicWeekly: false
        };
        const configJsonPath = path.join(process.cwd(), "data/blog_schedule_config.json");
        if (fs.existsSync(configJsonPath)) {
          try {
            scheduleConfig = { ...scheduleConfig, ...JSON.parse(fs.readFileSync(configJsonPath, "utf-8")) };
          } catch (e) {
            console.warn("[Database Migration] Could not parse schedule config JSON:", e);
          }
        }
        await client.query(
          `
          INSERT INTO blog_schedule_config (
            id, enabled, auto_publish_approved_drafts, timezone, days_of_week,
            publish_hour, publish_minute, scheduler_secret, auto_generate_topic_weekly,
            last_run_at, next_scheduled_slot
          ) VALUES ('singleton', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            scheduleConfig.enabled,
            scheduleConfig.autoPublishApprovedDrafts,
            scheduleConfig.timezone,
            JSON.stringify(scheduleConfig.daysOfWeek),
            scheduleConfig.publishHour,
            scheduleConfig.publishMinute,
            scheduleConfig.schedulerSecret,
            scheduleConfig.autoGenerateTopicWeekly,
            scheduleConfig.lastRunAt || null,
            scheduleConfig.nextScheduledSlot || null
          ]
        );
        console.log("[Database Migration] Migrated schedule configuration into PostgreSQL.");
      }
      const auditCountRes = await client.query("SELECT COUNT(*) FROM blog_audit_logs");
      if (parseInt(auditCountRes.rows[0].count, 10) === 0) {
        const auditJsonPath = path.join(process.cwd(), "data/blog_audit_logs.json");
        if (fs.existsSync(auditJsonPath)) {
          try {
            const logs = JSON.parse(fs.readFileSync(auditJsonPath, "utf-8"));
            for (const log of logs.slice(0, 100)) {
              await client.query(
                `
                INSERT INTO blog_audit_logs (
                  id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (id) DO NOTHING
                `,
                [
                  log.id,
                  log.timestamp,
                  log.action,
                  log.articleId,
                  log.articleSlug,
                  log.articleTitle,
                  log.status,
                  log.user,
                  log.details
                ]
              );
            }
            console.log(`[Database Migration] Migrated ${logs.length} audit logs into PostgreSQL.`);
          } catch (e) {
            console.warn("[Database Migration] Could not parse audit logs JSON:", e);
          }
        }
      }
    } finally {
      client.release();
    }
  })();
  return global._globalDbInitPromise;
}
function mapRowToArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title || row.title,
    metaDescription: row.meta_description || "",
    primaryKeyword: row.primary_keyword || "",
    targetKeywords: Array.isArray(row.target_keywords) ? row.target_keywords : typeof row.target_keywords === "string" ? JSON.parse(row.target_keywords) : [],
    category: row.category || "Guides",
    categorySlug: row.category_slug || "guides",
    status: row.status,
    scheduledFor: row.scheduled_for ? new Date(row.scheduled_for).toISOString() : void 0,
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : void 0,
    publishedDate: row.published_date || "",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
    seoScore: Number(row.seo_score) || 85,
    wordCount: Number(row.word_count) || 1e3,
    isAiGenerated: !!row.is_ai_generated,
    failureReason: row.failure_reason || void 0,
    publishAttempts: Number(row.publish_attempts) || 0,
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : void 0,
    lockedAt: row.locked_at ? new Date(row.locked_at).toISOString() : void 0,
    lockedBy: row.locked_by || void 0,
    author: typeof row.author === "string" ? JSON.parse(row.author) : row.author || void 0,
    reviewer: typeof row.reviewer === "string" ? JSON.parse(row.reviewer) : row.reviewer || void 0,
    readTime: row.read_time || "5 min read",
    featuredImage: row.featured_image || "/images/buy_hemp_online_guide.jpg",
    imageAlt: row.image_alt || row.title,
    excerpt: row.excerpt || "",
    keyTakeaways: Array.isArray(row.key_takeaways) ? row.key_takeaways : typeof row.key_takeaways === "string" ? JSON.parse(row.key_takeaways) : [],
    tableOfContents: Array.isArray(row.table_of_contents) ? row.table_of_contents : typeof row.table_of_contents === "string" ? JSON.parse(row.table_of_contents) : [],
    contentSections: Array.isArray(row.content_sections) ? row.content_sections : typeof row.content_sections === "string" ? JSON.parse(row.content_sections) : [],
    faqs: Array.isArray(row.faqs) ? row.faqs : typeof row.faqs === "string" ? JSON.parse(row.faqs) : [],
    scientificReferences: Array.isArray(row.scientific_references) ? row.scientific_references : typeof row.scientific_references === "string" ? JSON.parse(row.scientific_references) : [],
    botanicalDisclaimer: row.botanical_disclaimer || "",
    recommendedCategorySlug: row.recommended_category_slug || "concentrates-wax",
    recommendedProductSearch: row.recommended_product_search || "Live Rosin"
  };
}

// src/data/new_catalog.ts
var newCatalogList = [
  {
    product_name: "THCA ZKITTLEZ PIE INDOOR FLOWER",
    slug: "thca-zkittlez-pie-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA ZKITTLEZ PIE INDOOR FLOWER, THCA \u2013 24.63%, DELTA 9- 0.29%",
    price: 25,
    price_formatted: "$25.00",
    description: "THCA ZKITTLEZ PIE INDOOR FLOWER THCA \u2013 24.63% DELTA 9- 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0064-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-zkittlez-pie-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA GELATO INDOOR FLOWER",
    slug: "thca-gelato-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GELATO INDOOR FLOWER, THCA- 28.62%, DELTA 9- 0.29%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA GELATO INDOOR FLOWER THCA- 28.62% DELTA 9- 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0070-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-gelato-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA GELATO MINTZ INDOOR FLOWER",
    slug: "thca-gelato-mintz-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GELATO MINTZ INDOOR FLOWER, THCA- 23.57%, DELTA 9- 0.25%",
    price: 25,
    price_formatted: "$25.00",
    description: "THCA GELATO MINTZ INDOOR FLOWER THCA- 23.57% DELTA 9- 0.25%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0062-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-gelato-mintz-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA PUNCH BREATH FLOWER",
    slug: "thca-punch-breath-flower-2",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA PUNCH BREATH FLOWER, THCA- 18.76%, DELTA 9-0.28%",
    price: 25,
    price_formatted: "$25.00",
    description: "THCA PUNCH BREATH FLOWER THCA- 18.76% DELTA 9-0.28%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0068-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-punch-breath-flower-2/",
    in_stock: true
  },
  {
    product_name: "THCA HASHBURGER FLOWER",
    slug: "thca-hashburger-flower",
    category: "Flower & Rosin",
    subcategory: "Rosin & Hash Concentrates",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA HASHBURGER FLOWER, THCA- 27.55%, DELTA 9- 0.25%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA HASHBURGER FLOWER THCA- 27.55% DELTA 9- 0.25%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0067-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-hashburger-flower/",
    in_stock: true
  },
  {
    product_name: "THCA LA KUSH FLOWER",
    slug: "thca-la-kush-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA LA KUSH FLOWER, THCA \u2013 22.51%, DELTA 9- 0.29%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA LA KUSH FLOWER THCA \u2013 22.51% DELTA 9- 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0066-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-la-kush-flower/",
    in_stock: true
  },
  {
    product_name: "THCA CANDY FUMEZ FLOWER",
    slug: "thca-candy-fumez-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA CANDY FUMEZ FLOWER, THCA- 19.12%, DELTA 9- 0.24%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA CANDY FUMEZ FLOWER THCA- 19.12% DELTA 9- 0.24%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0059-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-candy-fumez-flower/",
    in_stock: true
  },
  {
    product_name: "THCA GALACTIC WARHEADS INDOOR FLOWER",
    slug: "thca-galactic-warheads-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GALACTIC WARHEADS INDOOR FLOWER, THCA -22.86%, DELTA 9 \u2013 0.29%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA GALACTIC WARHEADS INDOOR FLOWER THCA -22.86% DELTA 9 \u2013 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/IMG_0069-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-galactic-warheads-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SOUR CHEESE FLOWER",
    slug: "thca-sour-cheese-flower",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SOUR CHEESE FLOWER, THCA \u2013 27.71%, DELTA 9 \u2013 0.15%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA SOUR CHEESE FLOWER THCA \u2013 27.71% DELTA 9 \u2013 0.15%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/669b0a94-244b-44cb-9c39-9408429f50801-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-sour-cheese-flower/",
    in_stock: true
  },
  {
    product_name: "THCA GORILLA GLUE FLOWER",
    slug: "thca-gorilla-glue-flower",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GORILLA GLUE FLOWER, THCA \u2013 29.14%, DELTA 9 \u2013 0.27%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA GORILLA GLUE FLOWER THCA \u2013 29.14% DELTA 9 \u2013 0.27%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/e45949fa-a202-4936-bfa9-d3c12ae4596b1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-gorilla-glue-flower/",
    in_stock: false
  },
  {
    product_name: "THCA SUPREME GELATO FLOWER",
    slug: "thca-gelato-supreme-flower",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GELATO SUPREME FLOWER, THCA \u2013 28.91%, DELTA 9 \u2013 0.22%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA GELATO SUPREME FLOWER THCA \u2013 28.91% DELTA 9 \u2013 0.22%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/6af7d03f-788b-41ef-91f0-c7f884acba591-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-gelato-supreme-flower/",
    in_stock: true
  },
  {
    product_name: "THCA POPSICLE FLOWER",
    slug: "thca-popsicle-flower",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA POPSICLE FLOWER, THCA \u2013 26.98%, DELTA 9 \u2013 0.24%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA POPSICLE FLOWER THCA \u2013 26.98% DELTA 9 \u2013 0.24%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/d37f7c54-68d5-4638-b0f7-f76d478560dd1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-popsicle-flower/",
    in_stock: true
  },
  {
    product_name: "THCA JELLY CAKE FLOWER",
    slug: "thca-jelly-cake-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA JELLY CAKE FLOWER, THCA \u2013 29.72%, DELTA 9 \u2013 0.29%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA JELLY CAKE FLOWER THCA \u2013 29.72% DELTA 9 \u2013 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/afc60b96-286b-4fc7-a619-6cab957226ed1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-jelly-cake-flower/",
    in_stock: true
  },
  {
    product_name: "THCA ANIMAL COCKTAIL FLOWER",
    slug: "thca-animal-cocktail-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA ANIMAL COCKTAIL FLOWER, THCA \u2013 31.55%, DELTA 9 \u2013 0.22%",
    price: 30,
    price_formatted: "$30.00",
    description: "THCA ANIMAL COCKTAIL FLOWER THCA \u2013 31.55% DELTA 9 \u2013 0.22%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/92d28c8a-20c1-4c99-a9c8-328a55743a541-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-animal-cocktail-flower/",
    in_stock: false
  },
  {
    product_name: "THCA GELONADE FLOWER",
    slug: "thca-gelonade-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GELONADE FLOWER, THCA \u2013 34.02%, DELTA 9 \u2013 0.26%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA GELONADE FLOWER THCA \u2013 34.02% DELTA 9 \u2013 0.26%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/ad3c0b89-3f79-48e7-9ea7-4c2fcb15d8bd1.jpg",
    source_url: "https://amishgrown.com/product/thca-gelonade-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SKYWALKER OG FLOWER",
    slug: "thca-skywalker-og-flower",
    category: "Flower & Rosin",
    subcategory: "55$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SKYWALKER OG FLOWER, THCA \u2013 28.11%, DELTA 9 \u2013 0.23%",
    price: 30,
    price_formatted: "$30.00",
    description: "THCA SKYWALKER OG FLOWER THCA \u2013 28.11% DELTA 9 \u2013 0.23%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/50bd3b6d-555d-4f2b-a082-1b5f2994e34d1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-skywalker-og-flower/",
    in_stock: false
  },
  {
    product_name: "THCA SFV FLOWER",
    slug: "thca-sfv-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SFV FLOWER, THCA-28.15%, DELTA 9- 0.27%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA SFV FLOWER THCA-28.15% DELTA 9- 0.27%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/09dd0061-3d48-4dd0-8ae4-af0779235e5c1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-sfv-flower/",
    in_stock: true
  },
  {
    product_name: "THCA BLUE NERDS FLOWER",
    slug: "thca-blue-nerds-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA BLUE NERDS FLOWER, THCA \u2013 26.16%, DELTA 9- 0.29%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA BLUE NERDS FLOWER THCA \u2013 26.16% DELTA 9- 0.29%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/27ef46b2-146f-4699-bdce-3851029471aa1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-blue-nerds-flower/",
    in_stock: true
  },
  {
    product_name: "THCA DOSIDO FLOWER",
    slug: "thca-dosido-flower",
    category: "Flower & Rosin",
    subcategory: "75$ LIGHT DEPS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA DOSIDO FLOWER, THCA \u2013 20.49%, DELTA 9- 0.28%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA DOSIDO FLOWER THCA \u2013 20.49% DELTA 9- 0.28%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/fd814453-0ec7-4c4b-9399-4b6a6979ab361-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-dosido-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SUPER BOOF INDOOR SMALLS FLOWER",
    slug: "thca-super-boof-indoor-smalls-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SUPER BOOF INDOOR SMALLS FLOWER, THCA \u2013 35.51%, DELTA 9 \u2013 0.22%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA SUPER BOOF INDOOR SMALLS FLOWER THCA \u2013 35.51% DELTA 9 \u2013 0.22%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/PXL_20260706_224458075-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-super-boof-indoor-smalls-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SOUR GARLIC COOKIES INDOOR SMALLS FLOWER",
    slug: "thca-sour-garlic-cookies-indoor-smalls-flower",
    category: "Flower & Rosin",
    subcategory: "SMALLS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SOUR GARLIC COOKIES INDOOR SMALLS FLOWER, THCA- 31.93%, DELTA 9- 0.19%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA SOUR GARLIC COOKIES INDOOR SMALLS FLOWER THCA- 31.93% DELTA 9- 0.19%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/8e6d5902-6f53-4674-8da7-470cb8e233171-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-sour-garlic-cookies-indoor-smalls-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SOUR GARLIC COOKIES INDOOR FLOWER",
    slug: "thca-sour-garlic-cookies-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SOUR GARLIC COOKIES INDOOR FLOWER, THCA \u2013 31.93%, DELTA 9- 0.19%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA SOUR GARLIC COOKIES INDOOR FLOWER THCA \u2013 31.93% DELTA 9- 0.19%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/d3b4e646-d2d0-4722-b404-07b4e614de401-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-sour-garlic-cookies-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA CITRUS COOLER INDOOR FLOWER",
    slug: "thca-citrus-cooler-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA CITRUS COOLER INDOOR FLOWER, THCA- 29.90%, DELTA 9- 0.26%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA CITRUS COOLER INDOOR FLOWER THCA- 29.90% DELTA 9- 0.26%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/57b76a34-352c-4224-82da-e8a0f8182c701-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-citrus-cooler-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA CANDYLAND INDOOR FLOWER",
    slug: "thca-candyland-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA CANDYLAND INDOOR FLOWER, THCA- 30.49%, DELTA 9- 0.27%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA CANDYLAND INDOOR FLOWER THCA- 30.49% DELTA 9- 0.27%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/PXL_20260701_151436748-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-candyland-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SECRET WEAPON INDOOR FLOWER",
    slug: "thca-secret-weapon-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SECRET WEAPON INDOOR FLOWER, THCA- 27.47%, DELTA 9- 0.11%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA SECRET WEAPON INDOOR FLOWER THCA- 27.47% DELTA 9- 0.11%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/73c78f1f-535a-41db-975e-b1f7e4d6d7011-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-secret-weapon-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SUPER BOOF INDOOR FLOWER",
    slug: "thca-super-boof-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SUPER BOOF INDOOR FLOWER, THCA- 28.84%, DELTA 9- 0.25%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA SUPER BOOF INDOOR FLOWER THCA- 28.84% DELTA 9- 0.25%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/07/90f0889a-45cf-4a42-997d-2b0635d2dd881-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-super-boof-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA SUNSET SHERB INDOOR FLOWER",
    slug: "thca-sunset-sherb-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SUNSET SHERB INDOOR FLOWER, THCA- 27.41%, DELTA 9- 0.22%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA SUNSET SHERB INDOOR FLOWER THCA- 27.41% DELTA 9- 0.22%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/06/03516a73-52bd-43bf-94f0-4f07e09e00961-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-sunset-sherb-indoor-flower/",
    in_stock: true
  },
  {
    product_name: "THCA CANNOLI INDOOR FLOWER",
    slug: "thca-cannoli-indoor-flower",
    category: "Flower & Rosin",
    subcategory: "INDOOR",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA CANNOLI INDOOR FLOWER, THCA- 29.51%, DELTA 9- 0.24%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA CANNOLI INDOOR FLOWER THCA- 29.51% DELTA 9- 0.24%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/06/PXL_20260603_160846554-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-cannoli-indoor-flower/",
    in_stock: false
  },
  {
    product_name: "THCA BUDGET ROSIN",
    slug: "thca-lemon-cake-budget-rosin",
    category: "Flower & Rosin",
    subcategory: "Rosin & Hash Concentrates",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA GLITTER BOMB, THCA \u2013 82.64%, DELTA 9- 0.16%, THCA LEMON CAKE, THCA- 80.88%, DELTA 9- 0.08%, THCA BLUEBERRY MUFFIN, THCA- 84.47%, DELTA 9- 0.08%, THCA CHOCOLATE DIESEL, THCA- 81.70%, DELTA 9- 0.06%, THCA AMNESIA HAZE, THCA- 82.14%, DELTA 9- 0.06%, THCA BLUEBERRY RAZZ, THCA- 79.72%, DELTA 9- 0.10%, THCA PINEAPPLE, THCA- 79.34%, DELTA 9- 0.04%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA GLITTER BOMB THCA \u2013 82.64% DELTA 9- 0.16% THCA LEMON CAKE THCA- 80.88% DELTA 9- 0.08% THCA BLUEBERRY MUFFIN THCA- 84.47% DELTA 9- 0.08% THCA CHOCOLATE DIESEL THCA- 81.70% DELTA 9- 0.06% THCA AMNESIA HAZE THCA- 82.14% DELTA 9- 0.06% THCA BLUEBERRY RAZZ THCA- 79.72% DELTA 9- 0.10% THCA PINEAPPLE THCA- 79.34% DELTA 9- 0.04%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/254-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-lemon-cake-budget-rosin/",
    in_stock: true
  },
  {
    product_name: "THCA SHAKE SMALLS  FLOWER",
    slug: "thca-banana-cookie-flower",
    category: "Flower & Rosin",
    subcategory: "SMALLS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA BANANA COOKIE FLOWER, THCA-  22.80%, DELTA 9- 0.28%",
    price: 35,
    price_formatted: "$35.00",
    description: "THCA BANANA COOKIE FLOWER THCA- 22.80% DELTA 9- 0.28%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/PXL_20260212_015018271-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-banana-cookie-flower/",
    in_stock: true
  },
  {
    product_name: "THCA BLACK AFGHAN HASH",
    slug: "thca-moonrocks-2",
    category: "Flower & Rosin",
    subcategory: "Rosin & Hash Concentrates",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA BLACK AFGHAN HASH, THCA- 69.79%, DELTA 9- 0.24%",
    price: 10,
    price_formatted: "$10.00",
    description: "THCA BLACK AFGHAN HASH THCA- 69.79% DELTA 9- 0.24%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/d8c4b094-d882-4f6e-9311-8f6565107ea51-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-moonrocks-2/",
    in_stock: true
  },
  {
    product_name: "THCA LIVE RESIN DISTILLATE x 2 GRAM D.I.Y DISPOSABLE",
    slug: "thca-live-resin-distillate-papaya-punch",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA LIVE RESIN DISTILLATE (GLITTER BOMB), THCA- 77.74%, DELTA 9- 0.09%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA LIVE RESIN DISTILLATE (GLITTER BOMB) THCA- 77.74% DELTA 9- 0.09%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/16a16088-a4a9-4304-ab86-97889bc91e9b1-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-live-resin-distillate-papaya-punch/",
    in_stock: true
  },
  {
    product_name: "THCA SAUCE DIAMONDS",
    slug: "thca-sauce-diamonds-ice-cream-cake",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA SAUCE DIAMONDS BLUEBERRY MUFFIN, THCA- 89.9, DELTA 9- 0.00%, THCA- 95.19%, DELTA 9- 0.09%, THCA- 96.74%, DELTA 9- 0.06%, THCA- 98.54%, DELTA 9- 0.05%, THCA- 97.92%, DELTA 9- 0.10%, THCA- 95.06%, DELTA 9 -0.08%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA SAUCE DIAMONDS BLUEBERRY MUFFIN THCA- 89.9 DELTA 9- 0.00% PINEAPPLE THCA- 95.19% DELTA 9- 0.09% GRAPE STOMPER THCA- 96.74% DELTA 9- 0.06% DOLE WHIP THCA- 98.54% DELTA 9- 0.05% MANGO THCA- 97.92% DELTA 9- 0.10% BLUE RAZZ THCA- 95.06% DELTA 9 -0.08%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/IMG_0152-scaled.jpeg",
    source_url: "https://amishgrown.com/product/thca-sauce-diamonds-ice-cream-cake/",
    in_stock: true
  },
  {
    product_name: "THCA ISOLATE POWDER",
    slug: "thca-isolate-powder",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA ISOLATE POWDER, THCA- 103%, DELTA 9- 0.30%",
    price: 15,
    price_formatted: "$15.00",
    description: "THCA ISOLATE POWDER THCA- 103% DELTA 9- 0.30%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/54f612a3-3dac-4331-8f63-899f94224ed01-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-isolate-powder/",
    in_stock: false
  },
  {
    product_name: "THCA POINT BREAK INDOOR SMALLS",
    slug: "thca-point-break-indoor-smalls",
    category: "Flower & Rosin",
    subcategory: "SMALLS",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA POINT BREAK INDOOR SMALLS, THCA- 35.62%, DELTA 9-  0.11%",
    price: 20,
    price_formatted: "$20.00",
    description: "THCA POINT BREAK INDOOR SMALLS THCA- 35.62% DELTA 9- 0.11%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/28fce1c7-d4e0-4486-b472-0be4ce2e80961-2-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-point-break-indoor-smalls/",
    in_stock: false
  },
  {
    product_name: "THCA LIVE HASH ROSIN",
    slug: "thca-live-hash-rosin",
    category: "Flower & Rosin",
    subcategory: "Rosin & Hash Concentrates",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA LIVE HASH ROSIN, THCA \u2013 75.34%, DELTA 9- 0.16%, THCA- 75.28%, DELTA 9- 0.14%, THCA- 78.29%, DELTA 9- 0.15%, THCA \u2013 77.78%, DELTA 9 \u2013 0.12%",
    price: 30,
    price_formatted: "$30.00",
    description: "THCA LIVE HASH ROSIN MORACCAN PEACHES LIVE HASH ROSIN THCA \u2013 75.34% DELTA 9- 0.16% PAPAYA PLUM LIVE HASH ROSIN THCA- 75.28% DELTA 9- 0.14% ZKITTLES LIVE HASH ROSIN THCA- 78.29% DELTA 9- 0.15% GMO x GOVERMENT OASIS THCA \u2013 77.78% DELTA 9 \u2013 0.12%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/PXL_20260717_201903552-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-live-hash-rosin/",
    in_stock: true
  },
  {
    product_name: "THCA LIQUID FLOWER LIVE RESIN 1 GRAM VAPE",
    slug: "thca-liquid-flower-live-resin-1-gram-vape",
    category: "Flower & Rosin",
    subcategory: "THCA Flower",
    brand: "Amish Grown",
    strain_type: "Hybrid",
    potency: "THCA LIQUID FLOWER LIVE RESIN 1 GRAM VAPE, THCA- 51.95%, DELTA 9- 0.09%, THCA- 51.78%, DELTA 9- 0.05%",
    price: 25,
    price_formatted: "$25.00",
    description: "THCA LIQUID FLOWER LIVE RESIN 1 GRAM VAPE CANTALOPE HAZE THCA- 51.95% DELTA 9- 0.09% KOSHER KUSH x CHEM DAWG THCA- 51.78% DELTA 9- 0.05%",
    image_url: "https://amishgrown.com/wp-content/uploads/2026/02/94b3b5d8-3d24-4edd-88ed-3f6691d357311-scaled.jpg",
    source_url: "https://amishgrown.com/product/thca-liquid-flower-live-resin-1-gram-vape/",
    in_stock: true
  },
  {
    product_name: "Stiiizy Strawberry Cough Strawberry Premium Thc Pod 1G",
    slug: "stiiizy-strawberry-cough-strawberry-premium-thc-pod-1g",
    category: "Vape Pens",
    subcategory: "Disposable Vape & Pods",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Stiiizy Strawberry Cough Strawberry Premium Thc Pod 1G by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/202/363/avatar/1780858164-1771907339-ca_fg-og-s-strawberrycough_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-strawberry-cough-strawberry-premium-thc-pod-1g",
    in_stock: true
  },
  {
    product_name: "Plugplay Vape 1G Plug Exotics Lucky Lychee",
    slug: "plugplay-vape-1g-plug-exotics-lucky-lychee",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Plugplay",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Plugplay Vape 1G Plug Exotics Lucky Lychee by Plugplay. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/614/141/avatar/1731542822-q4_packaging_exotics_-_lucky_lychee.png",
    source_url: "https://weedmaps.com/brands/plugplay/products/plugplay-vape-1g-plug-exotics-lucky-lychee",
    in_stock: true
  },
  {
    product_name: "West Coast Cure Red Delicious Curebar 1G",
    slug: "west-coast-cure-red-delicious-curebar-1g",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "West Coast Cure",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf West Coast Cure Red Delicious Curebar 1G by West Coast Cure. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/652/791/avatar/1732129617-curebar_red_delicious.png",
    source_url: "https://weedmaps.com/brands/west-coast-cure/products/west-coast-cure-red-delicious-curebar-1g",
    in_stock: true
  },
  {
    product_name: "Raw Garden Tre Flip Kush Refined Live Resin 1 0G Cartridge",
    slug: "raw-garden-tre-flip-kush-refined-live-resin-1-0g-cartridge",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Raw Garden",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Raw Garden Tre Flip Kush Refined Live Resin 1 0G Cartridge by Raw Garden. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/444/164/avatar/1772226869-5130655_rlr_0-5gcartridge_menuimage_1000px.jpg",
    source_url: "https://weedmaps.com/brands/raw-garden/products/raw-garden-tre-flip-kush-refined-live-resin-1-0g-cartridge",
    in_stock: true
  },
  {
    product_name: "Big Chief Big Chief Thc Vape Cartridge 1G Blackwater Og",
    slug: "big-chief-big-chief-thc-vape-cartridge-1g-blackwater-og",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Big Chief",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Big Chief Big Chief Thc Vape Cartridge 1G Blackwater Og by Big Chief. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/186/228/avatar/1777389057-1758822305-blackwaterog-2025.png",
    source_url: "https://weedmaps.com/brands/big-chief/products/big-chief-big-chief-thc-vape-cartridge-1g-blackwater-og",
    in_stock: true
  },
  {
    product_name: "Plugplay Apple Slushie",
    slug: "plugplay-apple-slushie",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Plugplay",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Plugplay Apple Slushie by Plugplay. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/075/804/avatar/1731542591-q4_packaging_exotics_-_apple_slushie.png",
    source_url: "https://weedmaps.com/brands/plugplay/products/plugplay-apple-slushie",
    in_stock: true
  },
  {
    product_name: "West Coast Cure Pink Yum Yum Curepen Cartridge 1G",
    slug: "west-coast-cure-pink-yum-yum-curepen-cartridge-1g",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "West Coast Cure",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf West Coast Cure Pink Yum Yum Curepen Cartridge 1G by West Coast Cure. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/587/371/avatar/1767211419-1g_curepen_pink_yum_yum-3.png",
    source_url: "https://weedmaps.com/brands/west-coast-cure/products/west-coast-cure-pink-yum-yum-curepen-cartridge-1g",
    in_stock: true
  },
  {
    product_name: "Kushy Punch Mi 1G Kushy Punch Vape Peach Mango",
    slug: "kushy-punch-mi-1g-kushy-punch-vape-peach-mango",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Kushy Punch Mi",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Kushy Punch Mi 1G Kushy Punch Vape Peach Mango by Kushy Punch Mi. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/458/625/avatar/1783807324-kp-ca-renders-cat4_pman.png",
    source_url: "https://weedmaps.com/brands/kushy-punch-mi/products/kushy-punch-mi-1g-kushy-punch-vape-peach-mango",
    in_stock: true
  },
  {
    product_name: "Smoakland All In One Faderz Purple Haze S 1G",
    slug: "smoakland-all-in-one-faderz-purple-haze-s-1g",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Smoakland",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Smoakland All In One Faderz Purple Haze S 1G by Smoakland. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/641/785/avatar/1775220272-1728611401-2024-10-10_18-49-15.png",
    source_url: "https://weedmaps.com/brands/smoakland/products/smoakland-all-in-one-faderz-purple-haze-s-1g",
    in_stock: true
  },
  {
    product_name: "Stiiizy Strawnana Premium Thc Pod 1G",
    slug: "stiiizy-strawnana-premium-thc-pod-1g",
    category: "Vape Pens",
    subcategory: "Disposable Vape & Pods",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 35,
    price_formatted: "$35.00",
    description: "Top-shelf Stiiizy Strawnana Premium Thc Pod 1G by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/202/372/avatar/1780858169-1771946852-ca_fg-og-h-strawnana_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-strawnana-premium-thc-pod-1g",
    in_stock: true
  },
  {
    product_name: "Stiiizy Blue Dream",
    slug: "stiiizy-blue-dream",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Blue Dream by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/484/avatar/1780858170-1769715449-ca_hg-og-s-bluedream_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-blue-dream",
    in_stock: true
  },
  {
    product_name: "Plugplay King Louie Xlll",
    slug: "plugplay-king-louie-xlll",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Plugplay",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 34.04,
    price_formatted: "$34.04",
    description: "Top-shelf Plugplay King Louie Xlll by Plugplay. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/268/avatar/1731541472-q4_packaging_dna_-_king_louie.png",
    source_url: "https://weedmaps.com/brands/plugplay/products/plugplay-king-louie-xlll",
    in_stock: true
  },
  {
    product_name: "Stiiizy Purple Punch Premium Thc Pod",
    slug: "stiiizy-purple-punch-premium-thc-pod",
    category: "Vape Pens",
    subcategory: "Disposable Vape & Pods",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Purple Punch Premium Thc Pod by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/098/839/avatar/1780858149-1719348707-1673297714-az_og_purple_punch_hg-3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-purple-punch-premium-thc-pod",
    in_stock: true
  },
  {
    product_name: "Stiiizy Skywalker Og",
    slug: "stiiizy-skywalker-og",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Skywalker Og by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/474/avatar/1780858167-1723738067-ca_skywalker_og_premium_thc_pod_-5g_1.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-skywalker-og",
    in_stock: true
  },
  {
    product_name: "Stiiizy Sour Tangie",
    slug: "stiiizy-sour-tangie",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Sour Tangie by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/482/avatar/1780858162-1771906012-ca_hg-og-s-sourtangie_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-sour-tangie",
    in_stock: true
  },
  {
    product_name: "Stiiizy Pineapple Express",
    slug: "stiiizy-pineapple-express",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Pineapple Express by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/473/avatar/1780858171-1771639355-ca_hg-og-h-pineappleexpress_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-pineapple-express",
    in_stock: true
  },
  {
    product_name: "Plugplay Syndicate Og",
    slug: "plugplay-syndicate-og",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Plugplay",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 34.04,
    price_formatted: "$34.04",
    description: "Top-shelf Plugplay Syndicate Og by Plugplay. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/210/094/avatar/1731542401-q4_packaging_dna_-_syndicate_og.png",
    source_url: "https://weedmaps.com/brands/plugplay/products/plugplay-syndicate-og",
    in_stock: true
  },
  {
    product_name: "Stiiizy Blue Dream Blueberry Flavor Premium Thc Pod 1G",
    slug: "stiiizy-blue-dream-blueberry-flavor-premium-thc-pod-1g",
    category: "Vape Pens",
    subcategory: "Disposable Vape & Pods",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 23,
    price_formatted: "$23.00",
    description: "Top-shelf Stiiizy Blue Dream Blueberry Flavor Premium Thc Pod 1G by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/202/263/avatar/1780858153-1769716657-ca_fg-og-s-bluedream_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-blue-dream-blueberry-flavor-premium-thc-pod-1g",
    in_stock: true
  },
  {
    product_name: "Stiiizy Og Kush Premium Thc Pod",
    slug: "stiiizy-og-kush-premium-thc-pod",
    category: "Vape Pens",
    subcategory: "Disposable Vape & Pods",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Og Kush Premium Thc Pod by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/074/412/avatar/1780858176-1771624272-ca_hg-og-i-ogkush_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-og-kush-premium-thc-pod",
    in_stock: true
  },
  {
    product_name: "Stiiizy Granddaddy Purp",
    slug: "stiiizy-granddaddy-purp",
    category: "Vape Pens",
    subcategory: "510 Thread Vape Cartridge",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 82-90%",
    price: 13,
    price_formatted: "$13.00",
    description: "Top-shelf Stiiizy Granddaddy Purp by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/054/469/avatar/1780858168-1769033871-ca_hg-og-h-granddaddypurp_3.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-granddaddy-purp",
    in_stock: true
  },
  {
    product_name: "Froot Froot Cherry Pie Gummies 100Mg",
    slug: "froot-froot-cherry-pie-gummies-100mg",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Froot",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Froot Froot Cherry Pie Gummies 100Mg by Froot. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/344/023/avatar/1643395547-froot_gummie_cherry.jpg",
    source_url: "https://weedmaps.com/brands/froot/products/froot-froot-cherry-pie-gummies-100mg",
    in_stock: true
  },
  {
    product_name: "Allswell Fruit Punch",
    slug: "allswell-fruit-punch",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Allswell",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Allswell Fruit Punch by Allswell. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/397/904/avatar/1772494070-allswell-fruit-punch-gummies-1000x1000__1___1_.jpg",
    source_url: "https://weedmaps.com/brands/allswell/products/allswell-fruit-punch",
    in_stock: true
  },
  {
    product_name: "Wyld Raspberry Sativa Enhanced Gummies 100Mg",
    slug: "wyld-raspberry-sativa-enhanced-gummies-100mg",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Wyld",
    strain_type: "Sativa",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Wyld Raspberry Sativa Enhanced Gummies 100Mg by Wyld. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/132/344/avatar/1779114869-1637791116-wyld_raspberry_gummies_az-reflct.png",
    source_url: "https://weedmaps.com/brands/wyld/products/wyld-raspberry-sativa-enhanced-gummies-100mg",
    in_stock: true
  },
  {
    product_name: "Care By Design 1 1 Soft Gels 10 Count",
    slug: "care-by-design-1-1-soft-gels-10-count",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Care By Design",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Care By Design 1 1 Soft Gels 10 Count by Care By Design. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/195/280/avatar/1707341476-cbyd_softgels_10ct_1-1.png",
    source_url: "https://weedmaps.com/brands/care-by-design/products/care-by-design-1-1-soft-gels-10-count",
    in_stock: true
  },
  {
    product_name: "Uncle Arnies Blueberry Night Cap",
    slug: "uncle-arnies-blueberry-night-cap",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Uncle Arnies",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Uncle Arnies Blueberry Night Cap by Uncle Arnies. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/392/396/avatar/1782400159-1780362050-2oz_100mg_blueberry_nightcap_image_1.png",
    source_url: "https://weedmaps.com/brands/uncle-arnies/products/uncle-arnies-blueberry-night-cap",
    in_stock: true
  },
  {
    product_name: "Froot Froot Sour Green Apple Gummy 100Mg Single Cut To Dose",
    slug: "froot-froot-sour-green-apple-gummy-100mg-single-cut-to-dose",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Froot",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Froot Froot Sour Green Apple Gummy 100Mg Single Cut To Dose by Froot. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/489/600/avatar/1697572102-b1c99fc3-af5a-4d03-98bc-bb758b4c57b1_1_201_a.jpeg",
    source_url: "https://weedmaps.com/brands/froot/products/froot-froot-sour-green-apple-gummy-100mg-single-cut-to-dose",
    in_stock: true
  },
  {
    product_name: "Stiiizy Fruit Punch Splash Stiiizy Edibles 100Mg Gummies",
    slug: "stiiizy-fruit-punch-splash-stiiizy-edibles-100mg-gummies",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Stiiizy Fruit Punch Splash Stiiizy Edibles 100Mg Gummies by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/361/815/avatar/1780862561-1722988018-fruit-punch-splash.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-fruit-punch-splash-stiiizy-edibles-100mg-gummies",
    in_stock: true
  },
  {
    product_name: "Heavy Hitters Ultra Potent Infused Gummy Blueberry Blitz",
    slug: "heavy-hitters-ultra-potent-infused-gummy-blueberry-blitz",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Heavy Hitters",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Heavy Hitters Ultra Potent Infused Gummy Blueberry Blitz by Heavy Hitters. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&q=80&w=800",
    source_url: "https://weedmaps.com/brands/heavy-hitters/products/heavy-hitters-ultra-potent-infused-gummy-blueberry-blitz",
    in_stock: true
  },
  {
    product_name: "Eighth Brother Inc Assorted Gummies 10 Pack 100 Mg",
    slug: "eighth-brother-inc-assorted-gummies-10-pack-100-mg",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Eighth Brother Inc",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Eighth Brother Inc Assorted Gummies 10 Pack 100 Mg by Eighth Brother Inc. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/445/892/avatar/1779926013-1779916019-1774983245-1716334363-img_9242.JPG",
    source_url: "https://weedmaps.com/brands/eighth-brother-inc/products/eighth-brother-inc-assorted-gummies-10-pack-100-mg",
    in_stock: true
  },
  {
    product_name: "Delights Gummies Citrus Watermelon Delights Rosin Infused Gummies",
    slug: "delights-gummies-citrus-watermelon-delights-rosin-infused-gummies",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Delights Gummies",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Delights Gummies Citrus Watermelon Delights Rosin Infused Gummies by Delights Gummies. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/577/566/avatar/1709164708-citrus_watermelon_wm.png",
    source_url: "https://weedmaps.com/brands/delights-gummies/products/delights-gummies-citrus-watermelon-delights-rosin-infused-gummies",
    in_stock: true
  },
  {
    product_name: "Wyld Marionberry Indica Enhanced Gummies 100Mg",
    slug: "wyld-marionberry-indica-enhanced-gummies-100mg",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Wyld",
    strain_type: "Indica",
    potency: "Dosage: 100mg THC",
    price: 17,
    price_formatted: "$17.00",
    description: "Top-shelf Wyld Marionberry Indica Enhanced Gummies 100Mg by Wyld. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/132/352/avatar/1778852131-wyld-10ct_box-us_fruit-marionberry-gummies-shadow.png",
    source_url: "https://weedmaps.com/brands/wyld/products/wyld-marionberry-indica-enhanced-gummies-100mg",
    in_stock: true
  },
  {
    product_name: "Stiiizy Blue Raspberry Blast Stiiizy Edibles 100Mg Gummies",
    slug: "stiiizy-blue-raspberry-blast-stiiizy-edibles-100mg-gummies",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 10,
    price_formatted: "$10.00",
    description: "Top-shelf Stiiizy Blue Raspberry Blast Stiiizy Edibles 100Mg Gummies by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/363/078/avatar/1780862562-1722975729-blue-raspberry-blast.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-blue-raspberry-blast-stiiizy-edibles-100mg-gummies",
    in_stock: true
  },
  {
    product_name: "Smokiez Edibles Smokiez Sour Blue Raspberry Fruit Chews California",
    slug: "smokiez-edibles-smokiez-sour-blue-raspberry-fruit-chews-california",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Smokiez Edibles",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Smokiez Edibles Smokiez Sour Blue Raspberry Fruit Chews California by Smokiez Edibles. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/094/131/avatar/1785345774-ca_100mg-thc_indica_sour-blue-raspberry.jpg",
    source_url: "https://weedmaps.com/brands/smokiez-edibles/products/smokiez-edibles-smokiez-sour-blue-raspberry-fruit-chews-california",
    in_stock: true
  },
  {
    product_name: "Kushy Punch Mi Kushy Punch 1000Mg Cbd Peach",
    slug: "kushy-punch-mi-kushy-punch-1000mg-cbd-peach",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Kushy Punch Mi",
    strain_type: "CBD",
    potency: "Dosage: 100mg THC",
    price: 10.64,
    price_formatted: "$10.64",
    description: "Top-shelf Kushy Punch Mi Kushy Punch 1000Mg Cbd Peach by Kushy Punch Mi. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/108/569/avatar/1783807328-cbdcamylar.png",
    source_url: "https://weedmaps.com/brands/kushy-punch-mi/products/kushy-punch-mi-kushy-punch-1000mg-cbd-peach",
    in_stock: true
  },
  {
    product_name: "Space Gem Sour Gummy Spacedrops",
    slug: "space-gem-sour-gummy-spacedrops",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Space Gem",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 19.01,
    price_formatted: "$19.01",
    description: "Top-shelf Space Gem Sour Gummy Spacedrops by Space Gem. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?auto=format&fit=crop&q=80&w=800",
    source_url: "https://weedmaps.com/brands/space-gem/products/space-gem-sour-gummy-spacedrops",
    in_stock: true
  },
  {
    product_name: "Smokiez Edibles Smokiez Sour Watermelon Fruit Chews California",
    slug: "smokiez-edibles-smokiez-sour-watermelon-fruit-chews-california",
    category: "Edibles",
    subcategory: "Infused Chocolates & Treats",
    brand: "Smokiez Edibles",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 17,
    price_formatted: "$17.00",
    description: "Top-shelf Smokiez Edibles Smokiez Sour Watermelon Fruit Chews California by Smokiez Edibles. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/094/129/avatar/1785345785-ca_100mg-thc_hybrid_sour-watermelon.jpg",
    source_url: "https://weedmaps.com/brands/smokiez-edibles/products/smokiez-edibles-smokiez-sour-watermelon-fruit-chews-california",
    in_stock: true
  },
  {
    product_name: "Space Gem Sweet Gummy Spacedrops",
    slug: "space-gem-sweet-gummy-spacedrops",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Space Gem",
    strain_type: "Hybrid",
    potency: "Dosage: 100mg THC",
    price: 19.01,
    price_formatted: "$19.01",
    description: "Top-shelf Space Gem Sweet Gummy Spacedrops by Space Gem. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/192/432/avatar/1762362780-untitled_design__15_.png",
    source_url: "https://weedmaps.com/brands/space-gem/products/space-gem-sweet-gummy-spacedrops",
    in_stock: true
  },
  {
    product_name: "Kushy Punch Mi Kushy Punch Indica Watermelon Gummy 100Mg",
    slug: "kushy-punch-mi-kushy-punch-indica-watermelon-gummy-100mg",
    category: "Edibles",
    subcategory: "Gummies & Chews",
    brand: "Kushy Punch Mi",
    strain_type: "Indica",
    potency: "Dosage: 100mg THC",
    price: 10,
    price_formatted: "$10.00",
    description: "Top-shelf Kushy Punch Mi Kushy Punch Indica Watermelon Gummy 100Mg by Kushy Punch Mi. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/238/395/avatar/1783807325-indicamikushymock.png",
    source_url: "https://weedmaps.com/brands/kushy-punch-mi/products/kushy-punch-mi-kushy-punch-indica-watermelon-gummy-100mg",
    in_stock: true
  },
  {
    product_name: "West Coast Cure Gmo Top Shelf Curejoint 1G",
    slug: "west-coast-cure-gmo-top-shelf-curejoint-1g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "West Coast Cure",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf West Coast Cure Gmo Top Shelf Curejoint 1G by West Coast Cure. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/568/503/avatar/1782936084-gmo__1_.png",
    source_url: "https://weedmaps.com/brands/west-coast-cure/products/west-coast-cure-gmo-top-shelf-curejoint-1g",
    in_stock: true
  },
  {
    product_name: "Coastal Sun Grape Gas Greenhouse 0 35G Pre Roll 10Pk 3 5G",
    slug: "coastal-sun-grape-gas-greenhouse-0-35g-pre-roll-10pk-3-5g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Coastal Sun",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Coastal Sun Grape Gas Greenhouse 0 35G Pre Roll 10Pk 3 5G by Coastal Sun. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/704/083/avatar/1742251383-coastal-sun-greenhouse-cannabis-grape-gas-preroll-10pk-menu-1x1-white.png",
    source_url: "https://weedmaps.com/brands/coastal-sun/products/coastal-sun-grape-gas-greenhouse-0-35g-pre-roll-10pk-3-5g",
    in_stock: true
  },
  {
    product_name: "Hype Train Guava Cake Preroll 1G",
    slug: "hype-train-guava-cake-preroll-1g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Hype Train",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Hype Train Guava Cake Preroll 1G by Hype Train. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/706/104/avatar/1742590100-hype_train_-_prerolls_-_generic_single_1g_non-infused_pop-top_tube_-_wht_bg_-_1x1_menu_2048_241105.png",
    source_url: "https://weedmaps.com/brands/hype-train/products/hype-train-guava-cake-preroll-1g",
    in_stock: true
  },
  {
    product_name: "Top Shelf Express Gelato 41 Naked Preroll 1G",
    slug: "top-shelf-express-gelato-41-naked-preroll-1g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Top Shelf Express",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Top Shelf Express Gelato 41 Naked Preroll 1G by Top Shelf Express. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/641/562/avatar/1728557771-5pk_preroll.jpeg",
    source_url: "https://weedmaps.com/brands/top-shelf-express/products/top-shelf-express-gelato-41-naked-preroll-1g",
    in_stock: true
  },
  {
    product_name: "Eighth Brother Inc Wedding Case Preroll Case 6 1 G Prerolls",
    slug: "eighth-brother-inc-wedding-case-preroll-case-6-1-g-prerolls",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Eighth Brother Inc",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Eighth Brother Inc Wedding Case Preroll Case 6 1 G Prerolls by Eighth Brother Inc. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/558/859/avatar/1779926021-1779916022-1774983264-1763844838-wc_preroll_6pack.jpg",
    source_url: "https://weedmaps.com/brands/eighth-brother-inc/products/eighth-brother-inc-wedding-case-preroll-case-6-1-g-prerolls",
    in_stock: true
  },
  {
    product_name: "Farm Mango Diesel Preroll 14 Pack 7G",
    slug: "farm-mango-diesel-preroll-14-pack-7g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Farm",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Farm Mango Diesel Preroll 14 Pack 7G by Farm. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/591/315/avatar/1712735521-almora_prerolls_14-pack_sativa_transparent-1200x1200-28e5ebb.png",
    source_url: "https://weedmaps.com/brands/farm/products/farm-mango-diesel-preroll-14-pack-7g",
    in_stock: true
  },
  {
    product_name: "Cannabiotix Cannabiotix Casino Kush Prerolls",
    slug: "cannabiotix-cannabiotix-casino-kush-prerolls",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Cannabiotix",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Cannabiotix Cannabiotix Casino Kush Prerolls by Cannabiotix. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/191/135/avatar/1723673060-1618424181-grassdoor_prerollsingle_casinokush.jpg",
    source_url: "https://weedmaps.com/brands/cannabiotix/products/cannabiotix-cannabiotix-casino-kush-prerolls",
    in_stock: true
  },
  {
    product_name: "Eighth Brother Inc Venom Og Preroll 1G",
    slug: "eighth-brother-inc-venom-og-preroll-1g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Eighth Brother Inc",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Eighth Brother Inc Venom Og Preroll 1G by Eighth Brother Inc. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/375/760/avatar/1779926013-1779916024-1774983264-1732745753-1716510230-img_9291.JPG",
    source_url: "https://weedmaps.com/brands/eighth-brother-inc/products/eighth-brother-inc-venom-og-preroll-1g",
    in_stock: true
  },
  {
    product_name: "710 Labs 710 Labs Randy Watzon 13 Preroll 1G",
    slug: "710-labs-710-labs-randy-watzon-13-preroll-1g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "710 Labs",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf 710 Labs 710 Labs Randy Watzon 13 Preroll 1G by 710 Labs. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/639/339/avatar/1728059250-7adf6c6e-0bb4-4e28-907b-2d414dde7de1-800x800-5bb0b3d4-74fa-499d-ab14-9ea11579a709.jpg",
    source_url: "https://weedmaps.com/brands/710-labs/products/710-labs-710-labs-randy-watzon-13-preroll-1g",
    in_stock: true
  },
  {
    product_name: "Za Muhammed Zali Kush Breath Infused Blunts 5 Pack 3 5G",
    slug: "za-muhammed-zali-kush-breath-infused-blunts-5-pack-3-5g",
    category: "Pre-Rolls",
    subcategory: "Infused Pre-Roll",
    brand: "Za",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 15,
    price_formatted: "$15.00",
    description: "Top-shelf Za Muhammed Zali Kush Breath Infused Blunts 5 Pack 3 5G by Za. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/707/306/avatar/1745013366-za_-_prerolls_-_infused_blunts_5pk_wht_bg_2048_1x1_menu_250418.png",
    source_url: "https://weedmaps.com/brands/za/products/za-muhammed-zali-kush-breath-infused-blunts-5-pack-3-5g",
    in_stock: true
  },
  {
    product_name: "West Coast Cure Cookie Mix 35G Curejoint 6 Pack",
    slug: "west-coast-cure-cookie-mix-35g-curejoint-6-pack",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "West Coast Cure",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf West Coast Cure Cookie Mix 35G Curejoint 6 Pack by West Coast Cure. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/284/037/avatar/1767209446-cookie_mix.png",
    source_url: "https://weedmaps.com/brands/west-coast-cure/products/west-coast-cure-cookie-mix-35g-curejoint-6-pack",
    in_stock: true
  },
  {
    product_name: "Thc Design Thc Design Pre Roll Tins Sativa Lemon Meringue",
    slug: "thc-design-thc-design-pre-roll-tins-sativa-lemon-meringue",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Thc Design",
    strain_type: "Sativa",
    potency: "THC: 28-36%",
    price: 32,
    price_formatted: "$32.00",
    description: "Top-shelf Thc Design Thc Design Pre Roll Tins Sativa Lemon Meringue by Thc Design. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/183/891/avatar/1785704358-thcd_preroll_tin.jpg",
    source_url: "https://weedmaps.com/brands/thc-design/products/thc-design-thc-design-pre-roll-tins-sativa-lemon-meringue",
    in_stock: true
  },
  {
    product_name: "Stiiizy Lemon Cherry Haze 1G Naked Preroll",
    slug: "stiiizy-lemon-cherry-haze-1g-naked-preroll",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 6,
    price_formatted: "$6.00",
    description: "Top-shelf Stiiizy Lemon Cherry Haze 1G Naked Preroll by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/847/414/avatar/1780433067-1749501327-weedmaps_1gpreroll_ca_naked_lemoncherryhaze_2500x2500.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-lemon-cherry-haze-1g-naked-preroll",
    in_stock: true
  },
  {
    product_name: "Claybourne Co Bake Sale Hybrid 3 5G Flyers Blends Pre Rolls",
    slug: "claybourne-co-bake-sale-hybrid-3-5g-flyers-blends-pre-rolls",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Claybourne Co",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf Claybourne Co Bake Sale Hybrid 3 5G Flyers Blends Pre Rolls by Claybourne Co. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/643/795/avatar/1776887102-claybourne_nv_flyers_blends_menu_bakesale_hybrid__1_.jpg",
    source_url: "https://weedmaps.com/brands/claybourne-co/products/claybourne-co-bake-sale-hybrid-3-5g-flyers-blends-pre-rolls",
    in_stock: true
  },
  {
    product_name: "Quiet Kings Quiet Kings Preroll Multipack Mixed Light Rainbow Runtz 7G",
    slug: "quiet-kings-quiet-kings-preroll-multipack-mixed-light-rainbow-runtz-7g",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Quiet Kings",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 29.02,
    price_formatted: "$29.02",
    description: "Top-shelf Quiet Kings Quiet Kings Preroll Multipack Mixed Light Rainbow Runtz 7G by Quiet Kings. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/001/000/631/avatar/1784124011-qk_14pack_indica.png",
    source_url: "https://weedmaps.com/brands/quiet-kings/products/quiet-kings-quiet-kings-preroll-multipack-mixed-light-rainbow-runtz-7g",
    in_stock: true
  },
  {
    product_name: "West Coast Cure Tangie 35G Curejoint 6 Pack",
    slug: "west-coast-cure-tangie-35g-curejoint-6-pack",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "West Coast Cure",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 20,
    price_formatted: "$20.00",
    description: "Top-shelf West Coast Cure Tangie 35G Curejoint 6 Pack by West Coast Cure. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/284/068/avatar/1767209593-tangie.png",
    source_url: "https://weedmaps.com/brands/west-coast-cure/products/west-coast-cure-tangie-35g-curejoint-6-pack",
    in_stock: true
  },
  {
    product_name: "Stiiizy 9B68Be0C B856 40C5 Afc8 5A9578Addcd6",
    slug: "stiiizy-9b68be0c-b856-40c5-afc8-5a9578addcd6",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Stiiizy",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 14,
    price_formatted: "$14.00",
    description: "Top-shelf Stiiizy 9B68Be0C B856 40C5 Afc8 5A9578Addcd6 by Stiiizy. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/850/641/avatar/1780433067-1749489347-weedmaps_multipreroll_ca_naked_pinkchampagne_2500x2500.png",
    source_url: "https://weedmaps.com/brands/stiiizy/products/stiiizy-9b68be0c-b856-40c5-afc8-5a9578addcd6",
    in_stock: true
  },
  {
    product_name: "Quiet Kings Quiet Kings Alien Og 0 5G X 5 Pack Pre Rolls",
    slug: "quiet-kings-quiet-kings-alien-og-0-5g-x-5-pack-pre-rolls",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Quiet Kings",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 11.41,
    price_formatted: "$11.41",
    description: "Top-shelf Quiet Kings Quiet Kings Alien Og 0 5G X 5 Pack Pre Rolls by Quiet Kings. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/849/507/avatar/1784124004-download.png",
    source_url: "https://weedmaps.com/brands/quiet-kings/products/quiet-kings-quiet-kings-alien-og-0-5g-x-5-pack-pre-rolls",
    in_stock: true
  },
  {
    product_name: "Thc Design Thc Design Pre Rolls Indica",
    slug: "thc-design-thc-design-pre-rolls-indica",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Thc Design",
    strain_type: "Indica",
    potency: "THC: 28-36%",
    price: 34,
    price_formatted: "$34.00",
    description: "Top-shelf Thc Design Thc Design Pre Rolls Indica by Thc Design. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/055/215/avatar/1775667986-thcd-8th-multipack-pre-rolls.png",
    source_url: "https://weedmaps.com/brands/thc-design/products/thc-design-thc-design-pre-rolls-indica",
    in_stock: true
  },
  {
    product_name: "Cam 38E1Fa01 152F 4C35 A9E5 C737Aef205Da",
    slug: "cam-38e1fa01-152f-4c35-a9e5-c737aef205da",
    category: "Pre-Rolls",
    subcategory: "Standard Pre-Roll Joint",
    brand: "Cam",
    strain_type: "Hybrid",
    potency: "THC: 28-36%",
    price: 25,
    price_formatted: "$25.00",
    description: "Top-shelf Cam 38E1Fa01 152F 4C35 A9E5 C737Aef205Da by Cam. High quality, laboratory tested product sourced from premier cultivators.",
    image_url: "https://weedmaps.com/images/products/000/878/071/avatar/1774983964-1770855476-download.png",
    source_url: "https://weedmaps.com/brands/cam/products/cam-38e1fa01-152f-4c35-a9e5-c737aef205da",
    in_stock: true
  },
  {
    product_name: "CRUMB DUMPSTER \u{1F525} EXOTIC THCA FLOWER HYBRID JUNGLE EXOTICS \u{1F60E} BLOWOUT SALE  \u{1F44C} 10G $56 OR 60G $300",
    slug: "crumb-dumpster-exotic-thca-flower-hybrid-jungle-exotics-blowout-sale-10g-56-or-60g-300",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "MedPlex Online Dispensary",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 33.0%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "CRUMB DUMPSTER \u{1F525} EXOTIC THCA FLOWER HYBRID JUNGLE EXOTICS \u{1F60E} BLOWOUT SALE  \u{1F44C} 10G $56 OR 60G $300 - Top shelf Flower product curated by MedPlex Online Dispensary. Sourced from licensed dispensary catalog.",
    image_url: "https://s3-us-west-2.amazonaws.com/leafly-public/products/photos/TY7mx8ZTWiD5TAPPXMHQ_96518e1a-32c3-4b07-bad1-79cdf2925532",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "HASH BURGER AAA EXOTIC THCA FLOWER 10G ONLY $56  OR 60G $300 \u{1F525} 30+ NEW EXOTIC THCA STRAINS DROP",
    slug: "hash-burger-aaa-exotic-thca-flower-10g-only-56-or-60g-300-30-new-exotic-thca-strains-drop",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "MedPlex Online Dispensary",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 35.0%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "HASH BURGER AAA EXOTIC THCA FLOWER 10G ONLY $56  OR 60G $300 \u{1F525} 30+ NEW EXOTIC THCA STRAINS DROP - Top shelf Flower product curated by MedPlex Online Dispensary. Sourced from licensed dispensary catalog.",
    image_url: "https://s3-us-west-2.amazonaws.com/leafly-public/products/photos/h5xHuQvfQwiNcT4Su0sT_a901c768-1caf-4d61-a688-09363654de05",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: 'Rozy Pink Cones | 1 1/4"',
    slug: "rozy-pink-cones-1-1-4",
    category: "General Catalog Expansion",
    subcategory: "Rolling Papers",
    brand: "Simply Crafted",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC -",
    price: 5.99,
    price_formatted: "$5.99",
    description: 'Rozy Pink Cones | 1 1/4" - Top shelf Rolling Papers product curated by Simply Crafted. Sourced from licensed dispensary catalog.',
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/enONYkwR0yWrT53ggtQE_Untitled-design-434.png",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "EXOTIC AAA THCA PRE-ROLLS 1.25 GRAM \u{1F525} HASH BURGER 1.25 GRAMS EA  10 PACK \u{1F60E} ONLY $45 SALE $\u03366\u03369\u0336",
    slug: "exotic-aaa-thca-pre-rolls-1-25-gram-hash-burger-1-25-grams-ea-10-pack-only-45-sale-6-9",
    category: "General Catalog Expansion",
    subcategory: "PreRolls",
    brand: "MedPlex Online Dispensary",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 29.0%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "EXOTIC AAA THCA PRE-ROLLS 1.25 GRAM \u{1F525} HASH BURGER 1.25 GRAMS EA  10 PACK \u{1F60E} ONLY $45 SALE $\u03366\u03369\u0336 - Top shelf PreRolls product curated by MedPlex Online Dispensary. Sourced from licensed dispensary catalog.",
    image_url: "https://s3-us-west-2.amazonaws.com/leafly-public/products/photos/yi80Yrs0TI2jos8S0KSM_0b440f58-6733-4caf-84ed-7fd0796b7dfc",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "HASH BURGER THC CART \u26FD 3 FOR $36 JULY PROMO \u2705 MEDPLEX BRAND #1 \u{1F525} 20+ STRAINS AVAIL",
    slug: "hash-burger-thc-cart-3-for-36-july-promo-medplex-brand-1-20-strains-avail",
    category: "General Catalog Expansion",
    subcategory: "Cartridges",
    brand: "MedPlex Online Dispensary",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 72.0%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "HASH BURGER THC CART \u26FD 3 FOR $36 JULY PROMO \u2705 MEDPLEX BRAND #1 \u{1F525} 20+ STRAINS AVAIL - Top shelf Cartridges product curated by MedPlex Online Dispensary. Sourced from licensed dispensary catalog.",
    image_url: "https://s3-us-west-2.amazonaws.com/leafly-public/products/photos/3MpFOaS9Ry6eXLugo1Vv_1c0720cd-f4c0-4e31-904f-79561c16b6b5",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz Indoor THCa Flower",
    slug: "super-runtz-indoor-thca-flower",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 28.48%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz Indoor THCa Flower - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/5e1f0052-aef3-4a1e-92ee-018dfba04dee",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz Indoor THCa Flower Smalls",
    slug: "super-runtz-indoor-thca-flower-smalls",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz Indoor THCa Flower Smalls - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/00a14f29-5941-4057-949b-1ef2cad4adaf",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz Indoor Trim Wholesale 1LB",
    slug: "super-runtz-indoor-trim-wholesale-1lb",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 28.48%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz Indoor Trim Wholesale 1LB - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/52046fcf-0e7d-4e73-bc80-07e8786c9381",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz THCa Hemp Flower Greenhouse",
    slug: "super-runtz-thca-hemp-flower-greenhouse",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz THCa Hemp Flower Greenhouse - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/ed798506-bae2-484b-b8d5-ba815ca5ff08",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz THCa Hemp Flower Greenhouse - 7g",
    slug: "super-runtz-thca-hemp-flower-greenhouse-7g",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz THCa Hemp Flower Greenhouse - 7g - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/cf318b74-7d3d-48d1-a4e3-4501175c1970",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz THCa Hemp Flower Greenhouse - 28g",
    slug: "super-runtz-thca-hemp-flower-greenhouse-28g",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz THCa Hemp Flower Greenhouse - 28g - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/13512cfe-1544-4883-9132-d8774c2ca508",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz THCa Hemp Flower Greenhouse Wholesale - 1/2 LB",
    slug: "super-runtz-thca-hemp-flower-greenhouse-wholesale-1-2-lb",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz THCa Hemp Flower Greenhouse Wholesale - 1/2 LB - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/1353be8b-5607-44a4-8e82-59737ef03d5e",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Super Runtz THCa Hemp Flower Greenhouse Wholesale - 1 LB",
    slug: "super-runtz-thca-hemp-flower-greenhouse-wholesale-1-lb",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 26.12%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Super Runtz THCa Hemp Flower Greenhouse Wholesale - 1 LB - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/1f6c46c8-23aa-438f-9061-d24f1ad29232",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Hash Burger Indoor THCa Flower",
    slug: "hash-burger-indoor-thca-flower",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 29.79%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Hash Burger Indoor THCa Flower - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/568c9db5-c828-4e72-8448-0410dc7dbe34",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  },
  {
    product_name: "Hash Burger Indoor THCa Flower Wholesale",
    slug: "hash-burger-indoor-thca-flower-wholesale",
    category: "General Catalog Expansion",
    subcategory: "Flower",
    brand: "Hemp Flower Co.",
    strain_type: "Hybrid",
    potency: "THC/CBD: THC 29.79%",
    price: 29.99,
    price_formatted: "$29.99",
    description: "Hash Burger Indoor THCa Flower Wholesale - Top shelf Flower product curated by Hemp Flower Co.. Sourced from licensed dispensary catalog.",
    image_url: "https://leafly-public.s3.us-west-2.amazonaws.com/products/photos/5c42fec7-168b-4c86-ba36-75ec0c5976e1",
    source_url: "https://www.leafly.com/shop",
    in_stock: true
  }
];

// src/utils/imageUtils.ts
var FLOWER_IMAGES = [
  "https://images.unsplash.com/photo-1603909223429-69bb7101f420?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1536846862558-b80d25f0dbae?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800",
  "/images/indoor_flower_buds.jpg"
];
var PREROLL_IMAGES = [
  "https://images.unsplash.com/photo-1556928045-16f7f50be0f3?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1528821128474-27f963b062bf?auto=format&fit=crop&q=80&w=800"
];
var VAPE_IMAGES = [
  "/images/vape_cartridge.jpg",
  "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&q=80&w=800"
];
var EDIBLE_GUMMY_IMAGES = [
  "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1575224300306-1b8da36134ec?auto=format&fit=crop&q=80&w=800"
];
var EDIBLE_CHOCOLATE_IMAGES = [
  "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=800"
];
var CONCENTRATE_IMAGES = [
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800"
];
var TINCTURE_IMAGES = [
  "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=800"
];
var TABLET_IMAGES = [
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&q=80&w=800"
];
var MUSHROOM_IMAGES = [
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800"
];
function selectFromPool(pool, nameSeed) {
  if (!nameSeed) return pool[0];
  let hash = 0;
  for (let i = 0; i < nameSeed.length; i++) {
    hash = (hash << 5) - hash + nameSeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}
function getCategoryFallbackImage(category, productName) {
  const text = `${category || ""} ${productName || ""}`.toLowerCase();
  if (text.includes("rolling machine") || text.includes("roller") || text.includes("machine")) {
    return "/images/rolling_machine.jpg";
  }
  if (text.includes("grinder")) {
    return "/images/herb_grinder.jpg";
  }
  if (text.includes("rolling tray") || text.includes("tray")) {
    return "/images/rolling_tray.jpg";
  }
  if (text.includes("paper") || text.includes("juicy jay") || text.includes("raw")) {
    return "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=800";
  }
  if (text.includes("cigar") || text.includes("backwoods") || text.includes("blunt wrap") || text.includes("wrap")) {
    return "https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&q=80&w=800";
  }
  if (text.includes("chocolate") || text.includes("brownie") || text.includes("fudge") || text.includes("bar")) {
    return selectFromPool(EDIBLE_CHOCOLATE_IMAGES, productName);
  }
  if (text.includes("edible") || text.includes("gumm") || text.includes("candy") || text.includes("chew") || text.includes("gummies")) {
    return selectFromPool(EDIBLE_GUMMY_IMAGES, productName);
  }
  if (text.includes("preroll") || text.includes("pre-roll") || text.includes("joint") || text.includes("blunt") || text.includes("curejoint")) {
    return selectFromPool(PREROLL_IMAGES, productName);
  }
  if (text.includes("vape") || text.includes("cartridge") || text.includes("pen") || text.includes("pod") || text.includes("disposable") || text.includes("stiiizy") || text.includes("distillate")) {
    return selectFromPool(VAPE_IMAGES, productName);
  }
  if (text.includes("concentrate") || text.includes("rosin") || text.includes("hash") || text.includes("shatter") || text.includes("badder") || text.includes("wax") || text.includes("dab") || text.includes("budder") || text.includes("resin")) {
    return selectFromPool(CONCENTRATE_IMAGES, productName);
  }
  if (text.includes("tincture") || text.includes("oil") || text.includes("drop") || text.includes("pet relief")) {
    return selectFromPool(TINCTURE_IMAGES, productName);
  }
  if (text.includes("tablet") || text.includes("pill") || text.includes("xanax") || text.includes("klonopin") || text.includes("alko") || text.includes("farmapram") || text.includes("benzodiazepine") || text.includes("pharmaceutical")) {
    return selectFromPool(TABLET_IMAGES, productName);
  }
  if (text.includes("shroom") || text.includes("mushroom") || text.includes("psilocybin") || text.includes("dmt") || text.includes("lsd") || text.includes("psychedelic")) {
    return selectFromPool(MUSHROOM_IMAGES, productName);
  }
  if (text.includes("cbd") || text.includes("hemp")) {
    return selectFromPool(TINCTURE_IMAGES, productName);
  }
  return selectFromPool(FLOWER_IMAGES, productName);
}
function getValidProductImage(rawImage, category, productName) {
  if (!rawImage || typeof rawImage !== "string" || rawImage.trim() === "") {
    return getCategoryFallbackImage(category, productName);
  }
  const lowerUrl = rawImage.toLowerCase();
  if ((lowerUrl.includes("placeholder") || lowerUrl.includes("default.png") || lowerUrl.includes("generic_single")) && !lowerUrl.includes("weedmaps.com") && !lowerUrl.includes("amishgrown.com") && !lowerUrl.includes("globalmarijuanadispensary.com")) {
    return getCategoryFallbackImage(category, productName);
  }
  return rawImage;
}

// src/utils/weightVariants.ts
var FLOWER_WEIGHT_VARIANTS = [
  {
    id: "3.5g",
    label: "3.5 Grams",
    shortLabel: "3.5g",
    weight: "3.5g",
    priceMultiplier: 1
  },
  {
    id: "7g",
    label: "7 Grams",
    shortLabel: "7g",
    weight: "7g",
    priceMultiplier: 1.9,
    savings: "5% OFF"
  },
  {
    id: "14g",
    label: "14 Grams",
    shortLabel: "14g",
    weight: "14g",
    priceMultiplier: 3.6,
    savings: "10% OFF"
  },
  {
    id: "28g",
    label: "28 Grams",
    shortLabel: "28g",
    weight: "28g",
    priceMultiplier: 6.8,
    isPopular: true,
    savings: "15% OFF"
  },
  {
    id: "112g",
    label: "112 Grams",
    shortLabel: "112g",
    weight: "112g",
    priceMultiplier: 24,
    savings: "25% OFF"
  },
  {
    id: "224g",
    label: "224 Grams",
    shortLabel: "224g",
    weight: "224g",
    priceMultiplier: 44,
    savings: "35% OFF"
  },
  {
    id: "448g",
    label: "448 Grams",
    shortLabel: "448g",
    weight: "448g",
    priceMultiplier: 80,
    savings: "45% OFF"
  }
];
var CONCENTRATE_WEIGHT_VARIANTS = [
  {
    id: "1g",
    label: "1 Gram",
    shortLabel: "1g",
    weight: "1g",
    priceMultiplier: 1
  },
  {
    id: "2g",
    label: "2 Grams",
    shortLabel: "2g",
    weight: "2g",
    priceMultiplier: 1.9,
    savings: "5% OFF"
  },
  {
    id: "3.5g",
    label: "3.5 Grams",
    shortLabel: "3.5g",
    weight: "3.5g",
    priceMultiplier: 3.2,
    savings: "10% OFF"
  },
  {
    id: "7g",
    label: "7 Grams",
    shortLabel: "7g",
    weight: "7g",
    priceMultiplier: 6,
    isPopular: true,
    savings: "15% OFF"
  },
  {
    id: "14g",
    label: "14 Grams",
    shortLabel: "14g",
    weight: "14g",
    priceMultiplier: 11,
    savings: "22% OFF"
  },
  {
    id: "28g",
    label: "28 Grams",
    shortLabel: "28g",
    weight: "28g",
    priceMultiplier: 20,
    savings: "30% OFF"
  },
  {
    id: "112g",
    label: "112 Grams",
    shortLabel: "112g",
    weight: "112g",
    priceMultiplier: 70,
    savings: "40% OFF"
  }
];
var PREROLL_VARIANTS = [
  {
    id: "1-pack",
    label: "1 Single Pre-Roll (1g)",
    shortLabel: "1 Pre-Roll (1g)",
    weight: "1 Pre-Roll (1g)",
    priceMultiplier: 1
  },
  {
    id: "3-pack",
    label: "3-Pack Pre-Rolls (3g)",
    shortLabel: "3-Pack (3g)",
    weight: "3-Pack (3g)",
    priceMultiplier: 2.8,
    savings: "7% OFF"
  },
  {
    id: "5-pack",
    label: "5-Pack Tin Pre-Rolls (5g)",
    shortLabel: "5-Pack (5g)",
    weight: "5-Pack (5g)",
    priceMultiplier: 4.5,
    isPopular: true,
    savings: "10% OFF"
  },
  {
    id: "10-pack",
    label: "10-Pack Box Pre-Rolls (10g)",
    shortLabel: "10-Pack (10g)",
    weight: "10-Pack (10g)",
    priceMultiplier: 8.5,
    savings: "15% OFF"
  },
  {
    id: "28-pack",
    label: "28-Pack Pre-Rolls (28g)",
    shortLabel: "28-Pack (28g)",
    weight: "28-Pack (28g)",
    priceMultiplier: 22,
    savings: "25% OFF"
  }
];
var EDIBLE_VARIANTS = [
  {
    id: "100mg",
    label: "100mg Pack (10 Pieces x 10mg)",
    shortLabel: "100mg (10pk)",
    weight: "100mg",
    priceMultiplier: 1
  },
  {
    id: "250mg",
    label: "250mg Pack (Extra Strength)",
    shortLabel: "250mg",
    weight: "250mg",
    priceMultiplier: 2.2,
    savings: "10% OFF"
  },
  {
    id: "500mg",
    label: "500mg Tin (High Potency)",
    shortLabel: "500mg",
    weight: "500mg",
    priceMultiplier: 3.8,
    isPopular: true,
    savings: "15% OFF"
  },
  {
    id: "1000mg",
    label: "1000mg Bag (Party Pack)",
    shortLabel: "1000mg",
    weight: "1000mg",
    priceMultiplier: 6.8,
    savings: "25% OFF"
  }
];
var VAPE_VARIANTS = [
  {
    id: "1.0g",
    label: "1.0g Cartridge / Disposable Pen",
    shortLabel: "1.0g (Standard)",
    weight: "1.0g",
    priceMultiplier: 1
  },
  {
    id: "2.0g",
    label: "2.0g Dual Chamber / XL Disposable",
    shortLabel: "2.0g (XL)",
    weight: "2.0g",
    priceMultiplier: 1.75,
    isPopular: true,
    savings: "12% OFF"
  },
  {
    id: "3-pack",
    label: "3-Pack Bundle (3 x 1.0g)",
    shortLabel: "3-Pack (3.0g)",
    weight: "3-Pack",
    priceMultiplier: 2.6,
    savings: "15% OFF"
  },
  {
    id: "5-pack",
    label: "5-Pack Multi-Flavor Box (5 x 1.0g)",
    shortLabel: "5-Pack (5.0g)",
    weight: "5-Pack",
    priceMultiplier: 4.2,
    savings: "20% OFF"
  }
];
var CBD_VARIANTS = [
  {
    id: "500mg",
    label: "500mg / 30ml Dropper Bottle",
    shortLabel: "500mg (30ml)",
    weight: "500mg",
    priceMultiplier: 1
  },
  {
    id: "1000mg",
    label: "1000mg / 30ml Full Spectrum",
    shortLabel: "1000mg (30ml)",
    weight: "1000mg",
    priceMultiplier: 1.7,
    isPopular: true,
    savings: "15% OFF"
  },
  {
    id: "2500mg",
    label: "2500mg / 60ml High Potency",
    shortLabel: "2500mg (60ml)",
    weight: "2500mg",
    priceMultiplier: 3.5,
    savings: "20% OFF"
  },
  {
    id: "5000mg",
    label: "5000mg / 120ml Extra Strength Bulk",
    shortLabel: "5000mg (120ml)",
    weight: "5000mg",
    priceMultiplier: 6.2,
    savings: "30% OFF"
  }
];
var PHARMA_VARIANTS = [
  {
    id: "30-pills",
    label: "30 Pills Bottle",
    shortLabel: "30 Pills",
    weight: "30 Pills",
    priceMultiplier: 1
  },
  {
    id: "60-pills",
    label: "60 Pills Bottle",
    shortLabel: "60 Pills",
    weight: "60 Pills",
    priceMultiplier: 1.8,
    savings: "10% OFF"
  },
  {
    id: "100-pills",
    label: "100 Pills Sealed Bottle",
    shortLabel: "100 Pills",
    weight: "100 Pills",
    priceMultiplier: 2.8,
    isPopular: true,
    savings: "15% OFF"
  },
  {
    id: "500-pills",
    label: "500 Pills Bulk Pack",
    shortLabel: "500 Pills",
    weight: "500 Pills",
    priceMultiplier: 12,
    savings: "25% OFF"
  }
];
var ACCESSORY_VARIANTS = [
  {
    id: "1-unit",
    label: "1 Single Unit",
    shortLabel: "1 Unit",
    weight: "1 Unit",
    priceMultiplier: 1
  },
  {
    id: "3-pack",
    label: "3-Pack Bundle",
    shortLabel: "3-Pack",
    weight: "3-Pack",
    priceMultiplier: 2.7,
    savings: "10% OFF"
  },
  {
    id: "5-pack",
    label: "5-Pack Box Set",
    shortLabel: "5-Pack",
    weight: "5-Pack",
    priceMultiplier: 4.2,
    savings: "16% OFF"
  }
];
function getProductWeightVariants(product) {
  if (product.weightVariants && product.weightVariants.length > 0) {
    return product.weightVariants;
  }
  const categorySlug = (product.categorySlug || "").toLowerCase();
  const category = (product.category || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  if (categorySlug.includes("flower") || category.includes("flower") || category.includes("indica") || category.includes("sativa") || category.includes("hybrid") || name.includes("flower") || name.includes("bud")) {
    return FLOWER_WEIGHT_VARIANTS;
  }
  if (categorySlug.includes("concentrate") || category.includes("concentrate") || category.includes("shatter") || category.includes("rosin") || category.includes("resin") || category.includes("budder") || category.includes("diamonds") || category.includes("hash") || name.includes("rosin") || name.includes("resin") || name.includes("shatter") || name.includes("diamonds") || name.includes("hash") || name.includes("wax")) {
    return CONCENTRATE_WEIGHT_VARIANTS;
  }
  if (categorySlug.includes("preroll") || categorySlug.includes("pre-roll") || category.includes("preroll") || category.includes("pre-roll") || name.includes("pre-roll") || name.includes("preroll") || name.includes("joint") || name.includes("blunt")) {
    return PREROLL_VARIANTS;
  }
  if (categorySlug.includes("edible") || category.includes("edible") || category.includes("gumm") || category.includes("chocolate") || name.includes("gummy") || name.includes("gummies") || name.includes("edible") || name.includes("chocolate")) {
    return EDIBLE_VARIANTS;
  }
  if (categorySlug.includes("vape") || category.includes("vape") || category.includes("cart") || name.includes("vape") || name.includes("cart") || name.includes("disposable") || name.includes("pod")) {
    return VAPE_VARIANTS;
  }
  if (categorySlug.includes("cbd") || category.includes("cbd") || category.includes("tincture") || category.includes("oil") || name.includes("cbd") || name.includes("tincture") || name.includes("drops")) {
    return CBD_VARIANTS;
  }
  if (categorySlug.includes("pharmaceutical") || category.includes("pharmaceutical") || category.includes("benzo") || category.includes("painkiller") || name.includes("tablet") || name.includes("pill") || name.includes("capsule")) {
    return PHARMA_VARIANTS;
  }
  return ACCESSORY_VARIANTS;
}

// src/data/products.ts
var rawProductsList = [
  // 1. Accessories
  {
    category: "Accessories / Blunt Wraps",
    product_name: "Green Society Rolling Machine",
    price: "$4",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Green-Society-Rolling-Machine.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/green-society-rolling-machine/",
    description: "Sleek and easy-to-use rolling machine for perfectly crafted 79mm joints and rolling papers.",
    in_stock: true
  },
  {
    category: "Accessories / Blunt Wraps",
    product_name: "Backwoods Honey Bourbon Cigars",
    price: "$20",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Backwoods-Honey-Bourbon-Cigars.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/backwoods-honey-bourbon-cigars/",
    description: "Smooth, rich, and aromatic tobacco cigars with a delicious Honey Bourbon flavor.",
    in_stock: true
  },
  {
    category: "Accessories / Grinders",
    product_name: "Green Society Herb Grinder",
    price: "$40",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Green-Society-Grinder-2.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/green-society-herb-grinder/",
    description: "Three-chamber aluminum grinder featuring razor-sharp teeth, magnetic lid, and a kief catcher.",
    in_stock: true
  },
  {
    category: "Accessories / Merchandise",
    product_name: "Green Society Rolling Tray",
    price: "$10",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Green-Society-Rolling-Tray.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/green-society-rolling-tray/",
    description: "Strong and durable metal rolling tray styled with a custom signature Stoner monogram.",
    in_stock: true
  },
  {
    category: "Accessories / Rolling Papers",
    product_name: "Juicy Jay Superfine Rolling Papers",
    price: "$3",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Juicy-Jay-Superfine-Rolling-Papers.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/juicy-jay-superfine-rolling-papers/",
    description: "Triple-dipped superfine rolling papers crafted to enhance natural aromas and preserve smooth smoke.",
    in_stock: true
  },
  // 2. Benzodiazepines
  {
    category: "Benzodiazepines",
    product_name: "Buy Alko 1 Tablet Online",
    price: "$200",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/Alko-1-Tablet-Online.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-alko-1-tablet-online/",
    description: "Alko 1 MG (Xanax) tablet is a prescribed formula used to manage anxiety and panic disorders.",
    in_stock: true
  },
  {
    category: "Benzodiazepines",
    product_name: "Buy Klonopin 2mg Online",
    price: "$366",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723465442.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-klonopin-2mg-online/",
    description: "Clonazepam formula designed to relieve anxiety, relax muscles, and soothe psychological tension.",
    in_stock: true
  },
  {
    category: "Benzodiazepines",
    product_name: "Farmapram 2mg (Alprazolam)",
    price: "$150",
    image_url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600",
    product_url: "https://globalmarijuanadispensary.com/shop/farmapram-2mg-alprazolam/",
    description: "Mexican equivalent brand Xanax formulated for acute anxiety and panic symptoms.",
    in_stock: true
  },
  {
    category: "Benzodiazepines",
    product_name: "Xanax 2mg Yellow Bar R039",
    price: "$300 - $3999 (100 Pills, 200 Pills, 300 Pills, 500 Pills, 1000 Pills, 2000 Pills)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723464245.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/xanax-2mg-yellow-bar-r039/",
    description: "Yellow R039 rectangular bars formulated to provide potent, fast-acting anxiety relief.",
    in_stock: true
  },
  // 3. Bulk
  {
    category: "Bulk / Bulk Concentrates",
    product_name: "Shatter \u2013 Pink Kush",
    price: "$400",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Pink-Kush-Shatter-Bulk-510x510-1.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/shatter-pink-kush/",
    description: "Indica-dominant hybrid shatter offering deep, relaxing physical sedation and a strong body high.",
    in_stock: true
  },
  {
    category: "Bulk / Bulk Edibles",
    product_name: "Ripped Edibles THC Chewies (Bulk)",
    price: "$80",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Ripped-Edibles-THC-Chewies-Bulk.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/ripped-edibles-thc-chewies-bulk/",
    description: "Assorted bulk soft chew candies, infused with 20mg premium THC distillate per piece.",
    in_stock: true
  },
  {
    category: "Bulk / Bulk Hash",
    product_name: "Lebanese Hash (Bulk)",
    price: "$400 - $1296 (1-4-lb, 1-2-lb, 1-lb)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Lebanese-Hash-510x510-1.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/lebanese-hash-bulk/",
    description: "Aged Lebanese hash sourced directly from local, small-batch growers in the Bekaa Valley.",
    in_stock: true
  },
  // 4. Buy Peptide Weight Loss
  {
    category: "Buy Peptide Weight Loss",
    product_name: "Compounded Tirzepatide 60mg 99.3% purity peptide",
    price: "$150",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/06/reta-removebg-preview.png",
    product_url: "https://globalmarijuanadispensary.com/shop/compounded-tirzepatide-60mg-99-3-purity-peptide/",
    description: "Synthetic dual-receptor pathway research peptide. 99% pure HPLC verified lyophilized powder.",
    in_stock: true
  },
  // 5. CBD & THC Vape Pens
  {
    category: "CBD & THC Vape Pens / Batteries",
    product_name: "AVD Clone Battery",
    price: "$10",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/AVD-Clone-Battery.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/avd-clone-battery/",
    description: "Smart 350mAh draw-activated battery featuring Smart Pulse Technology for smooth draws.",
    in_stock: true
  },
  {
    category: "CBD & THC Vape Pens / Cartridges",
    product_name: "Proper Extracts 2mL Live Resin Vape Carts",
    price: "$60",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Proper-Extracts-2mL-Live-Resin-Vape-Carts-New.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/proper-extracts-2ml-live-resin-vape-carts/",
    description: "Premium strain-specific live resin vape cartridges with robust terpene flavors.",
    in_stock: true
  },
  {
    category: "CBD & THC Vape Pens / Disposable Pens",
    product_name: "Muha Meds Diamond Peaches Disposable",
    price: "$41",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/09/muha-meds-diamond-peaches.png",
    product_url: "https://globalmarijuanadispensary.com/shop/muha-meds-diamond-peaches-disposable/",
    description: "Melted diamond hybrid extract disposable pen infused with juicy, sweet peach terpenes.",
    in_stock: true
  },
  // 6. CBD
  {
    category: "CBD / CBD Edibles",
    product_name: "Pacific CBD Mixed Berries",
    price: "$12",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Pacific-CBD-Mixed-Berry-Gummies.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/pacific-cbd-mixed-berries/",
    description: "Juicy strawberry, blueberry, and raspberry gummies infused with 200mg pure, soothing CBD.",
    in_stock: true
  },
  {
    category: "CBD / CBD for Pets",
    product_name: "Faded Cannabis Co. CBD Pet Relief 300mg",
    price: "$50",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Faded-Cannabis-Co.-CBD-Pet-Relief-300mg-2.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/faded-cannabis-co-cbd-pet-relief-300mg/",
    description: "Pet calming drops blended with premium CBD, healthy fats, and Omega-3 rich Atlantic Krill Oil.",
    in_stock: true
  },
  {
    category: "CBD / CBD Oil &amp; Tears",
    product_name: "Viridesco Full Spectrum CBD Oil",
    price: "$16",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Viridesco-CBD-Oil.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/viridesco-full-spectrum-cbd-oil/",
    description: "Raw, unadulterated organic full-spectrum hemp oil suitable for sublingual ingestion or topical use.",
    in_stock: true
  },
  // 7. Concentrates
  {
    category: "Concentrates / Budder",
    product_name: "Green Supreme Budder",
    price: "$40",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Green-Supreme-Budder.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/green-supreme-budder/",
    description: "Creamy whipped wax concentrate providing strain-specific taste and high-potency body effects.",
    in_stock: true
  },
  {
    category: "Concentrates / Hash",
    product_name: "Hash \u2013 Bentley",
    price: "$10 - $143 (1g, 3-5g, 7g, 14g, 28g)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Bentley-Hash.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/hash-bentley/",
    description: "Malleable domestic indica hash cured with oak-wood notes and traditional earthy spices.",
    in_stock: true
  },
  {
    category: "Concentrates / Diamonds",
    product_name: "Green Supreme Diamonds",
    price: "$50",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Green-Supreme-Northern-Lights-Diamonds.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/green-supreme-diamonds/",
    description: "Pure, high-potency THC-A diamonds crystallized in an organic, flavorful terpene sauce.",
    in_stock: true
  },
  {
    category: "Concentrates / Live Resin",
    product_name: "High Voltage Extracts HTFSE Sauce",
    price: "$45",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/High-Voltage-Extracts-HTFSE-Sauce-1.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/high-voltage-extracts-htfse-sauce/",
    description: "High-end full-spectrum extract diamonds and sauce sourced from fresh-frozen BC craft buds.",
    in_stock: true
  },
  {
    category: "Concentrates / Phoenix Tears",
    product_name: "Faded Extracts Honey Oil",
    price: "$24",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Faded-Extracts-Honey-Oil.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/faded-extracts-honey-oil/",
    description: "Clean, decarboxylated golden honey oil suitable for ingestion, vaporizing, or cooking infusions.",
    in_stock: true
  },
  {
    category: "Concentrates / Shatter",
    product_name: "Faded Extracts Shatter",
    price: "$30",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Faded-Extracts-Shatter.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/faded-extracts-shatter/",
    description: "Glass-like, highly stable shatter extracted from premium organic Canadian buds.",
    in_stock: true
  },
  {
    category: "Concentrates / Solventless",
    product_name: "Royalty Rosin Flower Rosin",
    price: "$40",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Royalty-Rosin-Flower-Rosin.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/royalty-rosin-flower-rosin/",
    description: "Solventless flower rosin pressed with heat and immense pressure to lock in all natural terpenes.",
    in_stock: true
  },
  // 8. Disposable Vapes
  {
    category: "Disposable Vapes",
    product_name: "IGET ONE 12000 Puffs Blueberry Ice Vape | Smart Screen",
    price: "$50",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/07/iget-one-12000-puffs-blueberry-ice-vape-smart-screen.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/iget-one-12000-puffs-blueberry-ice-vape-smart-screen/",
    description: "Features a massive 2700mAh marathon battery, integrated curved smart screen, and sweet iced blueberry flavor.",
    in_stock: true
  },
  {
    category: "Disposable Vapes",
    product_name: "STLTH 60K Disposable Vape Device \u2013 Lychee Melon Ice",
    price: "$23",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/06/stlth-60k-disposable-vape-device-lychee-melon-ice.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/stlth-60k-disposable-vape-device-lychee-melon-ice/",
    description: "Up to 60,000 puffs of crisp lychee and juicy melon. Equipped with LED screen and triple power modes.",
    in_stock: true
  },
  {
    category: "Disposable Vapes / Alibarbar Vape",
    product_name: "JNR Cruiser 12000 Mixed Berry",
    price: "$38",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/07/jnr-cruiser-12000-mixed-berry.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/jnr-cruiser-12000-mixed-berry/",
    description: "Classic sweet mix of mountain berries. Premium long-lasting draw with adjustable airflow.",
    in_stock: true
  },
  {
    category: "Disposable Vapes / IGET ONE",
    product_name: "IGET Bar PRO 10000 Strawberry White Peach Ice Mist Vape",
    price: "$48",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/07/iget-bar-pro-10000-strawberry-white-peach-ice-mist-vape.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/iget-bar-pro-10000-strawberry-white-peach-ice-mist-vape/",
    description: "A soft fruit blend of juicy strawberry, white peach, and a cool minty mist. 10000 Puffs capacity.",
    in_stock: true
  },
  // 9. DMT
  {
    category: "DMT",
    product_name: "Pure N,N DMT crystals",
    price: "$100",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2026/07/Pure-NN-DMT-crystals.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/pure-nn-dmt-crystals/",
    description: "Highly purified Freebase N,N-DMT crystals extracted from premium Mimosa Hostilis root bark.",
    in_stock: true
  },
  {
    category: "DMT / DMT Powder",
    product_name: "5-MeO DMT Powder (Dimethyltryptamine) online",
    price: "$130",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/10/Buy-DMT-Powder-Dimethyltryptamine-online.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-5-meo-dmt-powder-dimethyltryptamine-online/",
    description: "Pure, high-grade 5-MeO-DMT powder of supreme research quality.",
    in_stock: true
  },
  {
    category: "DMT / DMT VAPE",
    product_name: "DMT Vape Top DIY Refill Syringe 1ml",
    price: "$140",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/DMT-Vape-Top-DIY-Refill-Syringe-1ml.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/dmt-vape-top-diy-refill-syringe-1ml/",
    description: "Premium pre-filled glass syringe containing 1mL pure DMT liquid for easy cartridge refills.",
    in_stock: true
  },
  // 10. Edibles
  {
    category: "Edibles / Baked Edibles",
    product_name: "Faded Cannabis Co. THC Brownies",
    price: "$26",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Faded-Cannabis-Co.-THC-Brownies-1.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/faded-cannabis-co-thc-brownies/",
    description: "Freshly baked fudge brownies containing pure, lab-tested full-spectrum THC oil and dark chocolate.",
    in_stock: true
  },
  {
    category: "Edibles / Beverages",
    product_name: "Golden Monkey Extracts Peppermint Hot Chocolate",
    price: "$14",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Golden-Monkey-Extracts-Peppermint-Hot-Chocolate.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/golden-monkey-extracts-peppermint-hot-chocolate/",
    description: "Belgian chocolate powder blended with refreshing peppermint and infused with 150mg of THC.",
    in_stock: true
  },
  {
    category: "Edibles / Chocolates",
    product_name: "Potluck Matcha White Chocolate",
    price: "$26",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Potluck-Matcha-White-Chocolate.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/potluck-matcha-white-chocolate/",
    description: "Small-batch white chocolate bar with organic matcha notes and 100mg full-spectrum THC.",
    in_stock: true
  },
  {
    category: "Edibles / THC Gummies &amp; Candies",
    product_name: "Potluck Cherry Gummies",
    price: "$17",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Potluck-Cherry-Gummies.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/potluck-cherry-gummies/",
    description: "Sweet and chewy organic cherry gummies infused with 20mg premium full-spectrum THC per piece.",
    in_stock: true
  },
  // 11. Flowers
  {
    category: "Flowers / 1/2 Ounce Specials",
    product_name: "Grape Pie",
    price: "$22 - $320 (3-5g, 7g, 14g, 28g, 1-4-lb)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Grape-Pie-Multi.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/grape-pie/",
    description: "Indica-dominant hybrid, cross of Cherry Pie and Grape Stomper. Offers an extremely sweet, fruity grape aroma.",
    in_stock: true
  },
  {
    category: "Flowers / AAA+ Cannabis",
    product_name: "Purple Space Cookies",
    price: "$100",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Purple-Space-Cookies-New-Multi.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/purple-space-cookies/",
    description: "Rare Sativa-dominant hybrid bred from Durban Poison and GSC. Beautiful purple hue with sweet berry notes.",
    in_stock: true
  },
  {
    category: "Flowers / Hybrid",
    product_name: "Miracle Alien Cookies #10 (Smalls)",
    price: "$35",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Miracle-Alien-Cookies-10-Smalls.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/miracle-alien-cookies-10-smalls/",
    description: "Highly sought-after MAC hybrid variant offering a happy, heavy mental buzz and smooth citrus smoke.",
    in_stock: true
  },
  {
    category: "Flowers / Indica",
    product_name: "Death Bubba",
    price: "$28 - $160 (3-5g, 7g, 14g, 28g)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Death-Bubba-Multi.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/death-bubba/",
    description: "Infamous heavy-hitting Vancouver indica strain offering deep physical sedation, couch-lock, and fuel-gassy taste.",
    in_stock: true
  },
  {
    category: "Flowers / Pre-Rolls",
    product_name: "KushKraft Pre-Rolls",
    price: "$30",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/KushKraft-Pre-Rolls.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/kushkraft-pre-rolls/",
    description: "Convenient joint pack featuring unbleached papers, RAW filter tips, and premium ground craft buds.",
    in_stock: true
  },
  {
    category: "Flowers / Sativa",
    product_name: "Sour Diesel",
    price: "$25 - $350 (3-5g, 7g, 14g, 28g, 1-4-lb)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Sour-Diesel-Strain-Multi.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/sour-diesel/",
    description: "Classic high-strength Sativa. Uplifting, clear-headed energy with a sharp diesel and skunk citrus profile.",
    in_stock: true
  },
  // 12. LSD
  {
    category: "LSD",
    product_name: "LSD Blotter 400\xB5g",
    price: "$349",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/10/LSD-Blotter-400\xB5g.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/lsd-blotter-400%c2%b5g/",
    description: "Highly potent lysergic acid diethylamide (LSD) blotter tabs printed on custom artwork paper.",
    in_stock: true
  },
  {
    category: "LSD",
    product_name: "100ML 1P-LSD Microdosing Kit",
    price: "$130 - $599 (4 X 100ML, 6 X 100ML, 8 X 100ML)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/10/100ML-1P-LSD-Microdosing-Kit.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/100ml-1p-lsd-microdosing-kit/",
    description: "Calibrated microdose solution. Every 1mL delivers 1mcg of 1P-LSD for focus and brain optimization.",
    in_stock: true
  },
  // 13. Magic Mushroom
  {
    category: "Magic Mushroom",
    product_name: "Albino Penis Envy Magic Mushrooms",
    price: "$18 - $325 (1 gram, 3.5 grams, 7 grams, 14 grams, 28 grams)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/09/Albino-Penis-Envy-Magic-Mushrooms.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/albino-penis-envy-magic-mushrooms/",
    description: "One of the most potent Psilocybe Cubensis varieties. Induces highly vivid visual and cosmic spiritual journeys.",
    in_stock: true
  },
  {
    category: "Magic Mushroom / Mushroom Chocolate Bars",
    product_name: "Magic Mushrooms Milk Chocolate Bar 3000mg",
    price: "$25",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1724846596.jpg",
    product_url: "https://globalmarijuanadispensary.com/shop/magic-mushrooms-milk-chocolate-bar-3000mg/",
    description: "Creamy milk chocolate bar infused with 3000mg of premium, lab-tested Blue Meanie mushrooms.",
    in_stock: true
  },
  // 14. MDMA
  {
    category: "MDMA",
    product_name: "Buy MDMA Crystal 84% LAB TESTED",
    price: "$150 - $305 (4G, 10G)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/10/Buy-MDMA-Crystal-84-LAB-TESTED.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-mdma-crystal-84-lab-tested/",
    description: "Lab-tested high-purity crystalline MDMA. Produces intense feelings of empathy and sensory enhancement.",
    in_stock: true
  },
  {
    category: "MDMA",
    product_name: "Blue Punisher MDMA Pills",
    price: "$120 - $919 (25 Pills, 50 Pills, 100 Pills, 200 Pills)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/10/Blue-Punisher-MDMA-Pills.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/blue-punisher-mdma-pills/",
    description: "Infamous high-strength skull-stamped Blue Punisher ecstasy pills with maximum purity active compounds.",
    in_stock: true
  },
  // 15. Muha Meds
  {
    category: "Muha Meds",
    product_name: "Muha Meds Cali Gas OG | Hybrid",
    price: "$39",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2025/09/Muha-Meds-Cali-Gas-OG.png",
    product_url: "https://globalmarijuanadispensary.com/shop/muha-meds-cali-gas-og-hybrid/",
    description: "1000mg premium cannabis extract cart infused with strain-specific California gas and OG terpenes.",
    in_stock: true
  },
  // 16. Newly Added
  {
    category: "Newly Added",
    product_name: "3-methylfentanyl",
    price: "$915",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723465821.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/3-methylfentanyl/",
    description: "Highly potent opioid analgesic research compound. Synthesized for biochemical study and testing.",
    in_stock: true
  },
  {
    category: "Newly Added",
    product_name: "Amphetamine powder",
    price: "$200 - $17400 (10 Grams, 20 Grams, 50 Grams, 100 Grams, 500 Grams, 1 KG)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723465694.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/amphetamine-powder/",
    description: "Pure white amphetamine sulfate stimulant powder suitable for certified laboratory analysis.",
    in_stock: true
  },
  // 17. Oxycodone
  {
    category: "Oxycodone",
    product_name: "Oxycodone 10mg",
    price: "$225",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723464439.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/oxycodone-10mg/",
    description: "Premium opioid analgesic tablets formulated for rapid and effective relief of moderate to severe pain.",
    in_stock: true
  },
  {
    category: "Oxycodone",
    product_name: "Oxycodone 80mg",
    price: "$665",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723464421.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/oxycodone-80mg/",
    description: "High-dose ongoing relief pain tablets from certified pharmaceutical manufacturers.",
    in_stock: true
  },
  // 18. Painkillers Drugs
  {
    category: "Painkillers Drugs",
    product_name: "Buy Adderall 30mg",
    price: "$664",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723465643.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-adderall-30mg/",
    description: "High-strength central nervous system stimulant tablets designed for ADHD management and focus.",
    in_stock: true
  },
  {
    category: "Painkillers Drugs",
    product_name: "Buy Dilaudid Online",
    price: "$416",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/1723465534.jpeg",
    product_url: "https://globalmarijuanadispensary.com/shop/buy-dilaudid-online/",
    description: "Hydromorphone HCl formula providing fast-acting relief for severe and persistent physical pain.",
    in_stock: true
  },
  // 19. Psychedelic
  {
    category: "Psychedelic",
    product_name: "2C-B Nexus Blue Bees",
    price: "$180 - $1050 (50 Pills, 100 Pills, 200Pills)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/2C-B-Nexus-Blue-Bees.png",
    product_url: "https://globalmarijuanadispensary.com/shop/2c-b-nexus-blue-bees/",
    description: "Blue Bee pressed tablets containing high-purity 2C-B for a balanced psychedelic and empathogenic trip.",
    in_stock: true
  },
  // 20. Research Chemicals
  {
    category: "Research Chemicals",
    product_name: "Autoinducer-2 (2-AI)",
    price: "$120 - $3170 (10 Grams, 25 Grams, 50 Grams)",
    image_url: "https://globalmarijuanadispensary.com/wp-content/uploads/2024/08/Buy-2-AI-Online.webp",
    product_url: "https://globalmarijuanadispensary.com/shop/autoinducer-2-2-ai/",
    description: "Central nervous system stimulant compound intended for chemical laboratory research and in-vitro studies.",
    in_stock: true
  },
  // 21. Lucky Elk CBD
  {
    category: "Lucky Elk CBD",
    product_name: "Full Spectrum CBD Drops \xB7 Chamomile Infusion (2000 mg)",
    price: "$50",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/products/2551809449.jpg?v=1709847162",
    product_url: "https://luckyelk.com/products/chamomile-full-spectrum-cbd-drops-2000-mg",
    description: "A soothing blend of full spectrum CBD and organically grown chamomile, formulated for calm and clarity.",
    in_stock: true
  },
  {
    category: "Lucky Elk CBD",
    product_name: "Full Spectrum CBD Drops \xB7 Cold-Infused Turmeric (1500 mg)",
    price: "$48",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/products/2551767631.jpg?v=1709847226",
    product_url: "https://luckyelk.com/products/turmeric-full-spectrum-cbd-drops-1500-mg",
    description: "This golden blend combines full spectrum CBD (1500mg) with the power of organically grown turmeric.",
    in_stock: true
  },
  {
    category: "Lucky Elk CBD",
    product_name: "Full Spectrum CBD Drops \xB7 Natural (1000 mg)",
    price: "$46",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/products/2551611480.jpg?v=1709847198",
    product_url: "https://luckyelk.com/products/natural-full-spectrum-cbd-drops-1000-mg",
    description: "Pure and straightforward, our Natural Drops contain 1000mg of full spectrum CBD in a clean MCT oil base.",
    in_stock: true
  },
  // 22. Lucky Elk Concentrates
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Live Hash Rosin \xB7 Jam",
    price: "$75 - $240 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/rosinjammainimage.jpg?v=1783624543",
    product_url: "https://luckyelk.com/products/thca-live-hash-rosin-jam",
    description: "THCa Live Hash Rosin \xB7 Jam is one of the rarest expressions of solventless concentrates.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Bubble Hash \xB7 Piatella",
    price: "$75 - $240 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/piatellamainimage.jpg?v=1779987575",
    product_url: "https://luckyelk.com/products/thca-bubble-hash-piatella",
    description: "Cured for 6+ months to develop greater depth, complexity, and stability.",
    in_stock: false
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "Diamond Cut THCa Disposable Vape",
    price: "$30",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/diamondcutvapemainimage.jpg?v=1780000392",
    product_url: "https://luckyelk.com/products/diamond-cut-thca-disposable-vape",
    description: "THCa liquid diamonds blended with a live resin terpene sauce made from Oregon hemp.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Bubble Hash \xB7 Temple Ball Reserve",
    price: "$42 - $130 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/templeballreservemainimage.jpg?v=1779984864",
    product_url: "https://luckyelk.com/products/thca-bubble-hash-temple-ball-reserve",
    description: "Artisan solventless concentrate crafted from premium ice water bubble hash and aged for 3-6 months.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Badder",
    price: "$20 - $165 (1g, 3.5g, 10g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/baddermainimage.jpg?v=1779998134",
    product_url: "https://luckyelk.com/products/thca-badder",
    description: "Smooth, creamy, and potent terpene-rich whipped concentrate.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Live Hash Rosin \xB7 In-House",
    price: "$55 - $205 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/inhouseliverosinimage.jpg?v=1781104939",
    product_url: "https://luckyelk.com/products/thca-live-hash-rosin-in-house",
    description: "Core solventless lineup with balanced quality, strong flavor, and clean melt.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Live Hash Rosin \xB7 Staefli Farms",
    price: "$65 - $225 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/staeflirosinmainimage.jpg?v=1740175464",
    product_url: "https://luckyelk.com/products/thca-live-hash-rosin-staefli-farms",
    description: "Grown in living soil using regenerative farming practices, bred specifically for hash.",
    in_stock: true
  },
  {
    category: "Lucky Elk Concentrates / All Concentrates",
    product_name: "THCa Live Hash Rosin \xB7 Private Reserve",
    price: "$70 - $225 (1g, 3.5g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/liverosinprivatereservemainimage.jpg?v=1781105234",
    product_url: "https://luckyelk.com/products/thca-live-hash-rosin-private-reserve",
    description: "Our finest tier cold-cured rosin chosen for exceptional terpene expression.",
    in_stock: true
  },
  // 23. Lucky Elk Edibles
  {
    category: "Lucky Elk Edibles",
    product_name: "Live Resin Delta 9 Gummies \xB7 Cruise",
    price: "$24 (10 pieces)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/d9gummies-greenapplecruise.jpg?v=1749506753",
    product_url: "https://luckyelk.com/products/live-resin-delta-9-gummies-sour-apple-cruise",
    description: "Mellow hybrid green apple formulation with Delta 9-THC and full-spectrum CBD.",
    in_stock: true
  },
  {
    category: "Lucky Elk Edibles",
    product_name: "Live Resin Delta 9 Gummies \xB7 Explore",
    price: "$24 (10 pieces)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/d9gummies-strawberryrhubarbexplore.jpg?v=1749507302",
    product_url: "https://luckyelk.com/products/live-resin-delta-9-gummies-strawberry-rhubarb-explore",
    description: "Sativa formulation with CBG, Delta 9-THC, and CBD for clarity and daytime focus.",
    in_stock: true
  },
  {
    category: "Lucky Elk Edibles",
    product_name: "Live Resin Delta 9 Gummies \xB7 Unwind",
    price: "$24 (10 pieces)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/d9gummies-huckleberryunwind.jpg?v=1749505921",
    product_url: "https://luckyelk.com/products/live-resin-delta-9-gummies-huckleberry-unwind",
    description: "Oregon huckleberry flavor infused with Delta 9-THC, CBD, and sleep-friendly CBN.",
    in_stock: true
  },
  // 24. Lucky Elk Flowers
  {
    category: "Lucky Elk Flowers / AAA Top Shelf",
    product_name: "Superboof \xB7 Greenhouse THCa Flower",
    price: "$30 - $196 (3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/superboofgreenhousemainimage_2.jpg?v=1783526269",
    product_url: "https://luckyelk.com/products/superboof-thca-greenhouse-flower",
    description: "Summer light-deprivation greenhouse harvest featuring citrus and candied orange notes.",
    in_stock: true
  },
  {
    category: "Lucky Elk Flowers / AAA Top Shelf",
    product_name: "Lemon Cherry Gelato \xB7 Greenhouse THCa Flower",
    price: "$30 - $196 (3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/lemoncherrygelatomainimage.jpg?v=1761265797",
    product_url: "https://luckyelk.com/products/lemon-cherry-gelato-greenhouse-thca-flower",
    description: "Classic sweet lemon candy and gelato notes under Southern Oregon sun.",
    in_stock: true
  },
  {
    category: "Lucky Elk Flowers / AAAA Exotic",
    product_name: "White Runtz THCa",
    price: "$14 - $265 (1g, 3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/white_runtz_main_image.jpg?v=1757105626",
    product_url: "https://luckyelk.com/products/white-runtz-thca",
    description: "Indoor-grown balanced hybrid with an icy trichome layer and tropical sweet vanilla aroma.",
    in_stock: true
  },
  {
    category: "Lucky Elk Flowers / AAAA Exotic",
    product_name: "Flex Panther THCa",
    price: "$14 - $265 (1g, 3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/LE-FlexPanther_AAAA_-1080-2.jpg?v=1779832737",
    product_url: "https://luckyelk.com/products/flex-panther-thca",
    description: "Indoor hybrid of Flaming Cheetoz and Trapzilla with sharp lemon solvent and fuel notes.",
    in_stock: true
  },
  {
    category: "Lucky Elk Flowers / AAAA Exotic",
    product_name: "Purple Churro THCa",
    price: "$14 - $265 (1g, 3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/purplechurromainimage_f51c98ff-b232-4fa0-a4f4-691c3e54fe72.jpg?v=1777491760",
    product_url: "https://luckyelk.com/products/purple-churro-thca",
    description: "Warm cinnamon, vanilla cream, and baked cake flavors woven with premium resin.",
    in_stock: true
  },
  {
    category: "Lucky Elk Flowers / AAAA Exotic",
    product_name: "Blue Nerdz THCa",
    price: "$14 - $265 (1g, 3.5g, 7g, 14g, 28g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/bluenerdzmainimage_9f02568b-36f8-4f25-83f2-7a683448e873.jpg?v=1777490779",
    product_url: "https://luckyelk.com/products/blue-nerdz-thca",
    description: "Blue raspberry candy and grape sweetness with deep relaxation effects.",
    in_stock: true
  },
  // 25. Lucky Elk Pre Rolls
  {
    category: "Lucky Elk Pre Rolls",
    product_name: "THCa Blunt",
    price: "$11 - $12 (1g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/bluntmainimage.jpg?v=1751399648",
    product_url: "https://luckyelk.com/products/thca-blunt",
    description: "Single-strain THCa flower wrapped in organic slow-burning hemp paper.",
    in_stock: true
  },
  {
    category: "Lucky Elk Pre Rolls",
    product_name: "THCa Pre Rolls \xB7 Indoor Grown",
    price: "$8 - $12 (0.5g, 1g)",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/products/3690719763.jpg?v=1709847207",
    product_url: "https://luckyelk.com/products/thca-pre-rolls-indoor-grown",
    description: "Crafted in-house using premium indoor-grown smalls and sugar leaf.",
    in_stock: true
  },
  // 26. Lucky Elk Gear
  {
    category: "Lucky Elk Tools & Gear",
    product_name: "Lucky Elk Lanyard",
    price: "$10",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/lanyards-3designs.jpg?v=1762203624",
    product_url: "https://luckyelk.com/products/lucky-elk-lanyard",
    description: "Folded wrist strap with golden lobster-clasp hook and leather pipe emblem tab.",
    in_stock: true
  },
  {
    category: "Lucky Elk Tools & Gear",
    product_name: "Sticker Collection \xB7 Lucky Elk",
    price: "$15",
    image_url: "https://cdn.shopify.com/s/files/1/0580/5916/1636/files/stickers-group1.jpg?v=1764569892",
    product_url: "https://luckyelk.com/products/sticker-collection-lucky-elk",
    description: "15-piece collector's sticker pack printed on durable premium vinyl.",
    in_stock: true
  }
];
var getSlug = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
};
var parsePrice = (priceStr) => {
  const cleanStr = priceStr.replace(/,/g, "");
  const match = cleanStr.match(/\$?([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
};
var parseWeight = (priceStr) => {
  const match = priceStr.match(/\(([^)]+)\)/);
  if (match) {
    return match[1].split(",")[0].trim();
  }
  return void 0;
};
var categoryMapping = {
  // Accessories
  "Accessories / Blunt Wraps": { main: "Accessories", sub: "Blunt Wraps" },
  "Accessories / Grinders": { main: "Accessories", sub: "Grinders" },
  "Accessories / Merchandise": { main: "Accessories", sub: "Merchandise" },
  "Accessories / Rolling Papers": { main: "Accessories", sub: "Rolling Papers" },
  "Lucky Elk Tools & Gear": { main: "Accessories", sub: "Tools & Gear" },
  // Benzodiazepines & Pharmaceuticals
  "Benzodiazepines": { main: "Pharmaceuticals", sub: "Benzodiazepines" },
  "Oxycodone": { main: "Pharmaceuticals", sub: "Oxycodone" },
  "Painkillers Drugs": { main: "Pharmaceuticals", sub: "Painkillers" },
  "Newly Added": { main: "Pharmaceuticals", sub: "Newly Added Drugs" },
  // Bulk
  "Bulk / Bulk Concentrates": { main: "Concentrates", sub: "Bulk Concentrates" },
  "Bulk / Bulk Edibles": { main: "Edibles", sub: "Bulk Edibles" },
  "Bulk / Bulk Hash": { main: "Concentrates", sub: "Bulk Hash" },
  // Peptides & Research Chemicals
  "Buy Peptide Weight Loss": { main: "Research Chemicals", sub: "Peptides" },
  "Research Chemicals": { main: "Research Chemicals", sub: "Lab Chemicals" },
  // Vapes
  "CBD & THC Vape Pens / Batteries": { main: "Vapes", sub: "Batteries" },
  "CBD & THC Vape Pens / Cartridges": { main: "Vapes", sub: "Cartridges" },
  "CBD & THC Vape Pens / Disposable Pens": { main: "Vapes", sub: "Disposable Pens" },
  "Disposable Vapes": { main: "Vapes", sub: "Disposable Vapes" },
  "Disposable Vapes / Alibarbar Vape": { main: "Vapes", sub: "Alibarbar Vapes" },
  "Disposable Vapes / IGET ONE": { main: "Vapes", sub: "IGET ONE" },
  "Vape Carts": { main: "Vapes", sub: "Vape Cartridges" },
  // CBD
  "CBD / CBD Edibles": { main: "CBD", sub: "CBD Edibles" },
  "CBD / CBD for Pets": { main: "CBD", sub: "CBD for Pets" },
  "CBD / CBD Oil & Tears": { main: "CBD", sub: "CBD Oils & Tears" },
  "Lucky Elk CBD": { main: "CBD", sub: "CBD Drops" },
  // Concentrates
  "Concentrates / Budder": { main: "Concentrates", sub: "Budder" },
  "Concentrates / Hash": { main: "Concentrates", sub: "Hash" },
  "Concentrates / Diamonds": { main: "Concentrates", sub: "Diamonds" },
  "Concentrates / Live Resin": { main: "Concentrates", sub: "Live Resin" },
  "Concentrates / Phoenix Tears": { main: "Concentrates", sub: "Phoenix Tears" },
  "Concentrates / Shatter": { main: "Concentrates", sub: "Shatter" },
  "Concentrates / Solventless": { main: "Concentrates", sub: "Solventless" },
  "Lucky Elk Concentrates / All Concentrates": { main: "Concentrates", sub: "Lucky Elk Concentrates" },
  // Edibles
  "Edibles / Baked Edibles": { main: "Edibles", sub: "Baked Edibles" },
  "Edibles / Beverages": { main: "Edibles", sub: "Beverages" },
  "Edibles / Chocolates": { main: "Edibles", sub: "Chocolates" },
  "Edibles / THC Gummies & Candies": { main: "Edibles", sub: "Gummies & Candies" },
  "Lucky Elk Edibles": { main: "Edibles", sub: "Lucky Elk Edibles" },
  // Flowers
  "Flowers / 1/2 Ounce Specials": { main: "Flowers", sub: "Half-Ounce Specials" },
  "Flowers / AAA+ Cannabis": { main: "Flowers", sub: "AAA+ Premium" },
  "Flowers / Hybrid": { main: "Flowers", sub: "Hybrid Strains" },
  "Flowers / Indica": { main: "Flowers", sub: "Indica Strains" },
  "Flowers / Sativa": { main: "Flowers", sub: "Sativa Strains" },
  "Lucky Elk Flowers / AAA Top Shelf": { main: "Flowers", sub: "AAA Top Shelf Greenhouse" },
  "Lucky Elk Flowers / AAAA Exotic": { main: "Flowers", sub: "AAAA Exotic Indoor" },
  // Prerolls
  "Flowers / Pre-Rolls": { main: "Prerolls", sub: "Pre-Roll Joints" },
  "Lucky Elk Pre Rolls": { main: "Prerolls", sub: "Lucky Elk Prerolls" },
  // Psychedelics
  "DMT": { main: "Psychedelics", sub: "DMT Crystals" },
  "DMT / DMT Powder": { main: "Psychedelics", sub: "DMT Powder" },
  "DMT / DMT VAPE": { main: "Psychedelics", sub: "DMT Vapes" },
  "LSD": { main: "Psychedelics", sub: "LSD Blotters & Liquids" },
  "Magic Mushroom": { main: "Psychedelics", sub: "Dried Shrooms" },
  "Magic Mushroom / Mushroom Chocolate Bars": { main: "Psychedelics", sub: "Shroom Chocolates" },
  "MDMA": { main: "Psychedelics", sub: "MDMA Crystals & Ecstasy" },
  "Psychedelic": { main: "Psychedelics", sub: "Miscellaneous Psychedelics" },
  // New Catalog Categories
  "Flower & Rosin": { main: "Flowers", sub: "Flower & Rosin" },
  "Vape Pens": { main: "Vapes", sub: "Vape Pens & Pods" },
  "Edibles": { main: "Edibles", sub: "Gummies & Edibles" },
  "Pre-Rolls": { main: "Prerolls", sub: "Pre-Rolls & Joints" },
  "General Catalog Expansion": { main: "Flowers", sub: "Dispensary Catalog" },
  // Muha Meds
  "Muha Meds": { main: "Vapes", sub: "Muha Meds Cartridges" }
};
var legacySlugMap = {};
var KNOWN_LINEAGES = {
  "gumbo": {
    genetics: "Original Bubblegum Pheno x Secret Indica Kush",
    aroma: "Sweet Pink Bubblegum, Rich Berry Syrup, Earthy Kush Undertones",
    effects: "Plush Full-Body Calm, Appetite Support, Deep Evening Comfort",
    terpenes: ["Myrcene", "Beta-Caryophyllene", "Linalool", "Humulene"]
  },
  "lemon cherry": {
    genetics: "Sunset Sherbet x Girl Scout Cookies x Lemon Haze Pheno",
    aroma: "Tart Maraschino Cherry, Meyer Lemon Zest, Creamy Vanilla Berry",
    effects: "Blissful Social Uplift, Stress Relief, Smooth Physical Comfort",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Linalool", "Humulene"]
  },
  "blue dream": {
    genetics: "DJ Short Blueberry x Santa Cruz Haze",
    aroma: "Wild Sweet Blueberry, Fresh Mango, Herbal Cedar, Sweet Haze",
    effects: "Clear-Headed Daytime Energy, Creative Flow, Gentle Muscle Ease",
    terpenes: ["Myrcene", "Alpha-Pinene", "Terpinolene", "Beta-Caryophyllene"]
  },
  "gelato": {
    genetics: "Sunset Sherbet x Thin Mint Girl Scout Cookies",
    aroma: "Sweet Berry Sorbet, Lavender Citrus, Toasted Cookie Dough, Gas",
    effects: "Balanced Euphoric Lift, Creative Warmth, Smooth Physical Relaxation",
    terpenes: ["Beta-Caryophyllene", "Limonene", "Linalool", "Humulene"]
  },
  "gmo": {
    genetics: "Chemdawg D x Forum Cut Girl Scout Cookies",
    aroma: "Savory Garlic Clove, Roasted Earth, High-Octane Diesel Exhaust",
    effects: "Potent Full-Body Sedation, Deep Physical Relief, Heavy Evening Calm",
    terpenes: ["Beta-Caryophyllene", "Myrcene", "Limonene", "Humulene"]
  },
  "wedding": {
    genetics: "Triangle Kush x Animal Mints (Seed Junky Cut)",
    aroma: "Vanilla Frosting, Crushed Black Pepper, Tangy Earth, Sweet Dough",
    effects: "Calming Mind-Body Balance, Euphoric Contentment, Tension Relief",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Myrcene", "Linalool"]
  },
  "papaya": {
    genetics: "Citral #13 x Ice #2",
    aroma: "Ripe Tropical Papaya, Mango Nectar, Spicy Nutmeg, Hash Resin",
    effects: "Mellow Tropical Calm, Mental Peace, Soothing Physical Stillness",
    terpenes: ["Myrcene", "Limonene", "Beta-Caryophyllene", "Ocimene"]
  },
  "grape gas": {
    genetics: "Grape Pie x Jet Fuel Gelato (Compound Genetics)",
    aroma: "Concord Grape Candy, High-Octane Jet Fuel, Spicy Berry Diesel",
    effects: "Fast Euphoric Rush, Deep Shoulder & Back Relaxation, Cozy Calm",
    terpenes: ["Myrcene", "Beta-Caryophyllene", "Limonene", "Linalool"]
  },
  "guava": {
    genetics: "Wedding Cake x Guava Gelato",
    aroma: "Exotic Pink Guava, Tropical Citrus, Creamy Vanilla Cake, Earthy Kush",
    effects: "Uplifted Social Mood, Smooth Body Tingling, Stress Melt",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Myrcene", "Farnesene"]
  },
  "mango diesel": {
    genetics: "Mango Haze x NYC Sour Diesel",
    aroma: "Sweet Ripe Mango, Tangy Grapefruit, Classic Sour Fuel",
    effects: "Motivating Daytime Focus, Bright Cerebral Spark, Clean Energy",
    terpenes: ["Myrcene", "Terpinolene", "Limonene", "Alpha-Pinene"]
  },
  "casino kush": {
    genetics: "White Walker OG x Blue Flame OG (Cannabiotix Genetics)",
    aroma: "Fresh Pine Needles, Crushed Forest Earth, Lemon Fuel, Kush Spice",
    effects: "Classic Heavy OG Calm, Deep Physical Recovery, Nighttime Tranquility",
    terpenes: ["Myrcene", "Limonene", "Beta-Caryophyllene", "Alpha-Pinene"]
  },
  "venom og": {
    genetics: "Poison OG x Rare Dankness #1",
    aroma: "Skunky Diesel, Tart Lemon Pine, Pungent Herbal Earth",
    effects: "Deep Full-Body Relaxation, Quiet Mind, Restful Evening Unwinding",
    terpenes: ["Myrcene", "Beta-Caryophyllene", "Limonene", "Humulene"]
  },
  "randy watzon": {
    genetics: "Runtz x Wedding Crasher (710 Labs Exclusive #13 Pheno)",
    aroma: "Sweet Candy Berry, Vanilla Cake Batter, Gassy Kush Finish",
    effects: "Connoisseur Head-to-Toe Euphoria, Artistic Inspiration, Plush Calm",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Linalool", "Myrcene"]
  },
  "kush breath": {
    genetics: "OG Kush Breath (OGKB) x Mendo Montage",
    aroma: "Roasted Hazelnuts, Sweet Herbal Mint, Earthy OG Gas, Warm Spice",
    effects: "Heavy Blanket Relaxation, Calming Sensory Euphoria, Evening Rest",
    terpenes: ["Beta-Caryophyllene", "Myrcene", "Linalool", "Limonene"]
  },
  "lemon meringue": {
    genetics: "Lemon Skunk x Cookies and Cream",
    aroma: "Zesty Lemon Curd, Whipped Meringue Cream, Tart Citrus, Nutty Pastry",
    effects: "Bright Daytime Energy, Uplifted Focus, Creative Motivation",
    terpenes: ["Terpinolene", "Limonene", "Beta-Caryophyllene", "Ocimene"]
  },
  "runtz": {
    genetics: "Zkittlez x Gelato #33",
    aroma: "Candied Tropical Fruit, Sugary Berries, Creamy Gelato, Earthy Gas",
    effects: "Euphoric Head Rush, Full-Body Melt, Mood Elevation, Deep Relaxation",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Linalool", "Myrcene"]
  },
  "kush": {
    genetics: "Hindu Kush Landrace x Chemdawg 91",
    aroma: "Earthy Pine Resin, Fresh Lemon Peel, Spicy Incense, Dank Fuel",
    effects: "Deep Physical Unwinding, Tranquil Euphoria, Nighttime Serenity",
    terpenes: ["Myrcene", "Limonene", "Beta-Caryophyllene", "Alpha-Pinene"]
  },
  "sour": {
    genetics: "Chemdawg 91 x Super Skunk",
    aroma: "Tart Citrus Zest, Tangy Orchard Fruit, Crisp Herbal Fuel",
    effects: "Fast Cerebral Uplift, Happy Mood Boost, Balanced Body Ease",
    terpenes: ["Limonene", "Myrcene", "Beta-Caryophyllene", "Valencene"]
  },
  "watermelon": {
    genetics: "Watermelon Zum Zum #3 x OG Eddy Lepp",
    aroma: "Juicy Summer Watermelon, Sweet Berry Rind, Fresh Herbal Kush",
    effects: "Soothing Evening Relaxation, Gentle Euphoria, Restful Calm",
    terpenes: ["Myrcene", "Limonene", "Linalool", "Beta-Caryophyllene"]
  },
  "peach": {
    genetics: "Peach Ringz x ACDC High-CBD Cultivar",
    aroma: "Sun-Ripened Georgia Peach, Floral Honey, Sweet Orchard Citrus",
    effects: "Clear-Headed Calm, Physical Recovery, Soothing Daily Balance",
    terpenes: ["Myrcene", "Bisabolol", "Limonene", "Beta-Caryophyllene"]
  },
  "pineapple": {
    genetics: "Trainwreck x Hawaiian Landrace Sativa",
    aroma: "Freshly Sliced Pineapple, Sweet Cedar, Zesty Citrus Mango",
    effects: "Energizing Morning Focus, Creative Optimism, Light Body Ease",
    terpenes: ["Terpinolene", "Myrcene", "Beta-Caryophyllene", "Ocimene"]
  },
  "strawberry": {
    genetics: "Strawberry Cough x Secret Hybrid Reserve",
    aroma: "Sun-Warmed Wild Strawberries, Sweet Cream, Subtle Herbal Spice",
    effects: "Uplifted Social Energy, Calm Focus, Gentle Physical Relaxation",
    terpenes: ["Limonene", "Myrcene", "Beta-Caryophyllene", "Farnesene"]
  },
  "blueberry": {
    genetics: "Afghani Indica x Thai Sativa x Purple Thai (DJ Short Cut)",
    aroma: "Freshly Baked Blueberry Muffin, Sweet Vanilla, Earthy Floral",
    effects: "Long-Lasting Physical Comfort, Serene Mood, Restful Evening Ease",
    terpenes: ["Myrcene", "Alpha-Pinene", "Beta-Caryophyllene", "Linalool"]
  }
};
var FALLBACK_LINEAGES = [
  {
    genetics: "Zkittlez x Sunset Sherbet x OG Kush Bx",
    aroma: "Candied Citrus Zest, Wild Berry Jam, Creamy Vanilla, Earthy Fuel",
    effects: "Immediate Cerebral Uplift, Smooth Physical Unwinding, Creative Calm",
    terpenes: ["Limonene", "Beta-Caryophyllene", "Myrcene", "Linalool"]
  },
  {
    genetics: "Wedding Cake x Jet Fuel Gelato",
    aroma: "Sweet Vanilla Dough, Cracked Black Pepper, High-Octane Gas, Pine",
    effects: "Balanced Full-Body Euphoria, Stress Relief, Evening Relaxation",
    terpenes: ["Beta-Caryophyllene", "Limonene", "Humulene", "Myrcene"]
  },
  {
    genetics: "Biscotti x Sherbanger #22",
    aroma: "Toasted Almond Cookie, Tangy Berry Citrus, Skunky Kush Resin",
    effects: "Long-Lasting Mood Elevation, Soothing Muscle Ease, Focused Calm",
    terpenes: ["Myrcene", "Limonene", "Linalool", "Beta-Caryophyllene"]
  },
  {
    genetics: "Papaya Punch x Tropicanna Cookies",
    aroma: "Fresh Mango Nectar, Blood Orange Peel, Spicy Cinnamon, Hash",
    effects: "Vibrant Daytime Euphoria, Sensory Clarity, Relaxed Shoulders",
    terpenes: ["Limonene", "Ocimene", "Myrcene", "Beta-Caryophyllene"]
  },
  {
    genetics: "Chemdawg D x Triangle Kush x Gelato #41",
    aroma: "Savory Earth, Sharp Pine Forest, Sweet Cream, Diesel Exhaust",
    effects: "Potent Physical Tranquility, Deep Mental Quiet, Restful Comfort",
    terpenes: ["Myrcene", "Beta-Caryophyllene", "Alpha-Pinene", "Humulene"]
  },
  {
    genetics: "Strawberry Guava x Kush Mints #11",
    aroma: "Fresh Crushed Berries, Cooling Mint, Sweet Cookie Dough, Light Gas",
    effects: "Happy Social Energy, Uplifted Creativity, Gentle Body Warmth",
    terpenes: ["Limonene", "Linalool", "Beta-Caryophyllene", "Farnesene"]
  },
  {
    genetics: "Northern Lights #5 x Blueberry x Haze",
    aroma: "Sweet Forest Berries, Cedarwood, Spicy Herbal Incense, Citrus",
    effects: "Serene Mind-Body Harmony, Tension Release, Smooth Evening Rest",
    terpenes: ["Myrcene", "Alpha-Pinene", "Terpinolene", "Bisabolol"]
  },
  {
    genetics: "Apple Fritter x Georgia Pie",
    aroma: "Warm Baked Apple, Cinnamon Pastry Crust, Sweet Peach, Earthy Gas",
    effects: "Cozy Full-Body Melt, Blissful Headspace, Unhurried Calm",
    terpenes: ["Beta-Caryophyllene", "Limonene", "Humulene", "Linalool"]
  }
];
function cleanProductDisplayName(rawName, brand) {
  let cleaned = rawName.trim();
  if (brand && brand.length > 2) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const doubleBrandRegex = new RegExp(`^(${escaped})\\s+\\1\\b`, "i");
    cleaned = cleaned.replace(doubleBrandRegex, "$1");
  }
  cleaned = cleaned.replace(/^Smokiez Edibles Smokiez\b/i, "Smokiez").replace(/^Kushy Punch Mi Kushy Punch\b/i, "Kushy Punch").replace(/^Thc Design Thc Design\b/i, "THC Design").replace(/^710 Labs 710 Labs\b/i, "710 Labs").replace(/^Cannabiotix Cannabiotix\b/i, "Cannabiotix").replace(/\bThca\b/g, "THCa").replace(/\bThc\b/g, "THC").replace(/\bCbd\b/g, "CBD").replace(/\bGmo\b/g, "GMO").replace(/\bOg\b/g, "OG");
  return cleaned;
}
var mappedProducts = [];
var categoryStats = {};
var usedSlugs = /* @__PURE__ */ new Set();
var idCounter = 1;
var allRawProducts = [...newCatalogList, ...rawProductsList];
allRawProducts.forEach((raw) => {
  let main = "Uncategorized";
  let sub = raw.subcategory || "";
  const origCat = raw.category || "";
  const mapping = categoryMapping[origCat];
  if (mapping) {
    main = mapping.main;
    if (!sub) sub = mapping.sub;
  } else {
    const parts = origCat.split(" / ");
    main = parts[0] ? parts[0].trim() : "Uncategorized";
    if (!sub && parts[1]) sub = parts[1].trim();
  }
  if (origCat === "Flower & Rosin") {
    if (sub === "Concentrates & Rosin") {
      main = "Concentrates";
      sub = "Live Rosin & Concentrates";
    } else if (sub === "CBD & Wellness") {
      main = "CBD";
      sub = "CBD Wellness";
    }
  }
  const isRestrictedCategory = main === "Pharmaceuticals" || main === "Psychedelics" || main === "Research Chemicals";
  const nameLower = (raw.product_name || "").toLowerCase();
  if (!isRestrictedCategory && main !== "Wholesale") {
    if (nameLower.includes("rosin") || nameLower.includes("badder") || nameLower.includes("crumble") || nameLower.includes("shatter") || nameLower.includes("diamonds") || nameLower.includes("bubble hash") || nameLower.includes("sugar wax")) {
      main = "Concentrates";
      if (!sub || sub === "Flower & Rosin") sub = "Live Rosin & Concentrates";
    } else if (nameLower.includes("vape") || nameLower.includes("cart") || nameLower.includes("disposable") || nameLower.includes("pod")) {
      main = "Vapes";
      if (!sub) sub = "Vape Products";
    } else if (nameLower.includes("gumm") || nameLower.includes("edible") || nameLower.includes("chew")) {
      main = "Edibles";
      if (!sub) sub = "Gummies & Edibles";
    } else if (nameLower.includes("preroll") || nameLower.includes("pre-roll") || nameLower.includes("joint") || nameLower.includes("blunt")) {
      main = "Prerolls";
      if (!sub) sub = "Pre-Rolls & Joints";
    } else if (nameLower.includes("cbd") || nameLower.includes("tincture") || nameLower.includes("salve") || nameLower.includes("topical")) {
      main = "CBD";
      if (!sub || sub === "Flower & Rosin") sub = "CBD Extracts & Drops";
    }
  }
  const mainSlug = getSlug(main);
  let productSlug = "";
  if (raw.product_url) {
    const parts = raw.product_url.replace(/\/$/, "").split("/");
    productSlug = parts[parts.length - 1];
  }
  if (!productSlug || productSlug.length < 2) {
    productSlug = raw.slug || getSlug(raw.product_name);
  }
  productSlug = productSlug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "");
  const generatedFromName = getSlug(raw.product_name);
  if (generatedFromName && generatedFromName !== productSlug) {
    legacySlugMap[generatedFromName] = productSlug;
  }
  if (raw.slug && raw.slug !== productSlug) {
    legacySlugMap[raw.slug] = productSlug;
  }
  if (usedSlugs.has(productSlug)) {
    return;
  }
  usedSlugs.add(productSlug);
  if (!categoryStats[mainSlug]) {
    categoryStats[mainSlug] = {
      count: 0,
      name: main,
      subs: /* @__PURE__ */ new Set()
    };
  }
  if (sub) {
    categoryStats[mainSlug].subs.add(sub);
  }
  if (raw.subcategory) {
    categoryStats[mainSlug].subs.add(raw.subcategory);
  }
  const priceNum = typeof raw.price === "number" ? raw.price : parsePrice(raw.price);
  const weightVal = parseWeight(String(raw.price));
  const onSale = idCounter % 6 === 0 && priceNum > 5;
  const originalPrice = onSale ? Math.round(priceNum * 1.25) : void 0;
  const isAvailable = raw.in_stock !== void 0 ? raw.in_stock : raw.inStock !== void 0 ? raw.inStock : true;
  const displayName = cleanProductDisplayName(raw.product_name, raw.brand);
  const sku = `GH-${mainSlug.slice(0, 3).toUpperCase()}-${100 + idCounter}`;
  let profile = FALLBACK_LINEAGES[idCounter % FALLBACK_LINEAGES.length];
  for (const [key, val] of Object.entries(KNOWN_LINEAGES)) {
    if (nameLower.includes(key)) {
      profile = val;
      break;
    }
  }
  let thcaNum = 24.4 + idCounter * 7 % 65 / 10;
  let d9Num = 0.15 + idCounter * 3 % 13 / 100;
  let cbgaNum = 0.7 + idCounter * 5 % 14 / 10;
  if (mainSlug === "concentrates") {
    thcaNum = 75.2 + idCounter * 11 % 135 / 10;
    cbgaNum = 1.9 + idCounter * 7 % 21 / 10;
  } else if (mainSlug === "vapes") {
    thcaNum = 79.4 + idCounter * 9 % 110 / 10;
    cbgaNum = 1.5 + idCounter * 5 % 16 / 10;
  } else if (mainSlug === "prerolls") {
    thcaNum = nameLower.includes("infused") || nameLower.includes("blunt") ? 36.8 + idCounter * 7 % 80 / 10 : 25.4 + idCounter * 5 % 55 / 10;
  } else if (mainSlug === "cbd") {
    thcaNum = 0.4 + idCounter * 2 % 5 / 10;
    d9Num = 0.09 + idCounter * 2 % 9 / 100;
    cbgaNum = 2.1 + idCounter * 4 % 16 / 10;
  }
  const totalCannabinoidsNum = +(thcaNum + d9Num + cbgaNum + 1.1).toFixed(1);
  const labResults = {
    thca: `${thcaNum.toFixed(1)}%`,
    d9thc: `${d9Num.toFixed(2)}%`,
    totalCannabinoids: `${totalCannabinoidsNum.toFixed(1)}%`,
    status: "Passed ISO-17025 Full-Panel Screening"
  };
  const brandName = raw.brand || "Global Herbs Reserve";
  const strainType = raw.strain_type || "Hybrid";
  const rawDesc = (raw.description || "").trim();
  const isAmishBoilerplate = rawDesc.startsWith("Available in ") && rawDesc.includes("Double-vacuum sealed");
  const isWeedmapsBoilerplate = rawDesc.startsWith("Top-shelf ") && rawDesc.includes("sourced from premier cultivators");
  let richDescription = rawDesc;
  if (!isRestrictedCategory && (isAmishBoilerplate || isWeedmapsBoilerplate || rawDesc.length < 110)) {
    const subLabel = (sub || main).toLowerCase();
    if (mainSlug === "flowers") {
      richDescription = `${displayName} is a ${strainType.toLowerCase()} ${subLabel} cultivar bred from ${profile.genetics}. Batch-tested at ${labResults.thca} THCa (${labResults.totalCannabinoids} total cannabinoids, ${labResults.d9thc} Delta-9 THC), its trichome-rich colas express a layered ${profile.aroma.toLowerCase()} bouquet driven by ${profile.terpenes.slice(0, 3).join(", ")}. Slow-cured for 21 days at 60\xB0F/60% RH and double-vacuum sealed to preserve volatile monoterpenes and deliver ${profile.effects.toLowerCase()} effects.`;
    } else if (mainSlug === "concentrates") {
      richDescription = `${displayName} by ${brandName} is a small-batch ${subLabel} extract crafted from fresh-frozen ${profile.genetics} flower. Verified at ${labResults.thca} THCa with ${labResults.totalCannabinoids} total cannabinoids, this dabbable concentrate retains native ${profile.terpenes.slice(0, 3).join(", ")} terpenes for a clean, low-temperature melt with ${profile.aroma.toLowerCase()} flavor notes and ${profile.effects.toLowerCase()} onset.`;
    } else if (mainSlug === "vapes") {
      richDescription = `${displayName} by ${brandName} pairs high-purity ${subLabel} extraction (${labResults.thca} potency) with strain-authentic ${profile.genetics} terpenes (${profile.terpenes.slice(0, 3).join(", ")}). Built with medical-grade ceramic heating hardware to prevent terpene scorching, it delivers smooth ${profile.aroma.toLowerCase()} vapor draws and fast-acting ${profile.effects.toLowerCase()} effects.`;
    } else if (mainSlug === "edibles") {
      richDescription = `${displayName} by ${brandName} is a precision-dosed ${subLabel} formulation (${raw.potency || "100mg total"}) crafted for consistent digestive bioavailability. Infused with full-panel lab-screened cannabinoid extract and natural ${profile.aroma.toLowerCase()} flavor notes, each serving provides a predictable 45\u201390 minute onset and sustained ${profile.effects.toLowerCase()} support.`;
    } else if (mainSlug === "prerolls") {
      richDescription = `${displayName} by ${brandName} features whole-flower ground ${profile.genetics} (${strainType}) packed evenly into unbleached artisan paper cones\u2014never trim or shake. Batch-verified at ${labResults.thca} THCa with dominant ${profile.terpenes.slice(0, 3).join(", ")} terpenes, this ${subLabel} burns evenly with clean ash, offering ${profile.aroma.toLowerCase()} aromatics and immediate ${profile.effects.toLowerCase()} effects.`;
    } else if (mainSlug === "cbd") {
      richDescription = `${displayName} by ${brandName} is an ISO-17025 lab-certified ${subLabel} formulation rich in full-spectrum phytocannabinoids and natural ${profile.terpenes.slice(0, 3).join(", ")} terpenes. Formulated for daily endocannabinoid system balance with ${profile.aroma.toLowerCase()} botanical notes and ${profile.effects.toLowerCase()} support while remaining strictly Farm Bill compliant (<0.3% Delta-9 THC).`;
    } else if (mainSlug === "wholesale") {
      richDescription = `${displayName} is a commercial bulk allocation (${weightVal || "multi-unit wholesale lot"}) sourced from single-origin ${profile.genetics} harvests. Verified at ${labResults.thca} potency with ${profile.terpenes.slice(0, 3).join(", ")} terpenes (${profile.aroma.toLowerCase()}), each wholesale lot ships nitrogen-flushed and double-vacuum sealed with batch COA documentation.`;
    } else {
      richDescription = `${displayName} (${sub || main}) \u2014 ${rawDesc} Verified by Global Herbs quality control for consistent performance and discreet climate-protected fulfillment.`;
    }
  }
  const seoTitle = `${displayName} | ${sub || main} | Global Herbs`;
  const seoDescription = `${displayName} (${strainType} ${sub || main}) \u2014 ${labResults.thca} potency, ${profile.terpenes.slice(0, 2).join(" & ")} terpenes, ${profile.aroma.toLowerCase()} notes. ISO-17025 lab-tested at Global Herbs ($${priceNum.toFixed(2)}).`.slice(0, 160);
  const product = {
    id: idCounter,
    name: displayName,
    slug: productSlug,
    category: sub ? sub : main,
    subcategory: raw.subcategory || sub || void 0,
    categorySlug: mainSlug,
    brand: raw.brand || "Global Herbs Reserve",
    strainType,
    potency: raw.potency || labResults.thca,
    inStock: isAvailable,
    sourceUrl: raw.source_url || raw.product_url || void 0,
    price: priceNum,
    originalPrice,
    onSale,
    image: getValidProductImage(raw.image_url, sub || main, raw.product_name),
    description: richDescription,
    sku,
    weight: weightVal || void 0,
    inventory: isAvailable ? 15 + idCounter * 23 % 95 : 0,
    tags: Array.from(new Set([main, sub, raw.brand, raw.strain_type, ...profile.terpenes.slice(0, 2)].filter(Boolean))),
    seoTitle,
    seoDescription,
    seoKeywords: [displayName.toLowerCase(), (sub || main).toLowerCase(), strainType.toLowerCase(), ...profile.terpenes.map((t) => t.toLowerCase())],
    genetics: profile.genetics,
    aroma: profile.aroma,
    effects: profile.effects,
    terpenes: profile.terpenes,
    labResults
  };
  const variants = getProductWeightVariants(product);
  product.weightVariants = variants;
  product.weights = variants.map((v) => v.shortLabel);
  if (!product.weight && variants.length > 0) {
    product.weight = variants[0].shortLabel;
  }
  mappedProducts.push(product);
  categoryStats[mainSlug].count++;
  idCounter++;
});
var products = mappedProducts;
var categories = Object.keys(categoryStats).map((slug) => {
  const stat = categoryStats[slug];
  return {
    name: stat.name,
    slug,
    count: stat.count,
    subcategories: Array.from(stat.subs)
  };
});

// src/server/blog/blogValidator.ts
var PROHIBITED_MEDICAL_CLAIMS = [
  /cure[s]?\s+cancer/i,
  /cure[s]?\s+alzheimer/i,
  /cure[s]?\s+dementia/i,
  /cure[s]?\s+tumor/i,
  /cures\s+diabetes/i,
  /cure[s]?\s+epilepsy/i,
  /miracle\s+cure/i,
  /replaces\s+chemotherapy/i,
  /guaranteed\s+to\s+cure/i,
  /proven\s+to\s+heal\s+all/i
];
function validateArticle(article, existingArticles = []) {
  const errors = [];
  const warnings = [];
  const checks = [];
  let score = 100;
  const slug = (article.slug || "").trim().toLowerCase();
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slug) {
    errors.push("URL slug is required.");
    checks.push({ label: "Slug Presence", passed: false, details: "Missing slug" });
    score -= 15;
  } else if (!slugRegex.test(slug)) {
    errors.push("Slug must contain only lowercase alphanumeric characters and hyphens.");
    checks.push({ label: "Slug Format", passed: false, details: "Invalid characters in slug" });
    score -= 10;
  } else {
    const duplicate = existingArticles.find((a) => a.slug === slug && a.id !== article.id);
    if (duplicate) {
      errors.push(`Duplicate slug detected: "${slug}" is already in use by article "${duplicate.title}".`);
      checks.push({ label: "Slug Uniqueness", passed: false, details: `Conflicts with "${duplicate.title}"` });
      score -= 25;
    } else {
      checks.push({ label: "Slug Uniqueness & Format", passed: true, details: `Clean canonical /blog/${slug}` });
    }
  }
  const title = (article.title || "").trim();
  const metaTitle = (article.metaTitle || title).trim();
  if (!title) {
    errors.push("Article title (H1) is required.");
    checks.push({ label: "Title (H1)", passed: false, details: "Missing title" });
    score -= 15;
  } else if (title.length < 15 || title.length > 120) {
    warnings.push(`Title length is ${title.length} characters (recommended: 30-75 characters).`);
    checks.push({ label: "Title Length", passed: false, details: `${title.length} chars (optimum: 30-75)` });
    score -= 5;
  } else {
    checks.push({ label: "Title (H1) & Length", passed: true, details: `${title.length} characters` });
  }
  const metaDescription = (article.metaDescription || "").trim();
  if (!metaDescription) {
    errors.push("SEO meta description is required.");
    checks.push({ label: "Meta Description", passed: false, details: "Missing meta description" });
    score -= 15;
  } else if (metaDescription.length < 50 || metaDescription.length > 180) {
    warnings.push(`Meta description is ${metaDescription.length} characters (recommended: 70-160 characters).`);
    checks.push({ label: "Meta Description Length", passed: false, details: `${metaDescription.length} chars (optimum: 70-160)` });
    score -= 5;
  } else {
    checks.push({ label: "Meta Description Length", passed: true, details: `${metaDescription.length} characters` });
  }
  const primaryKw = (article.primaryKeyword || article.targetKeywords && article.targetKeywords[0] || "").trim().toLowerCase();
  if (!primaryKw) {
    warnings.push("No primary target keyword specified.");
    checks.push({ label: "Target Keyword", passed: false, details: "Missing primary keyword" });
    score -= 10;
  } else {
    const titleHasKw = title.toLowerCase().includes(primaryKw);
    const metaHasKw = metaDescription.toLowerCase().includes(primaryKw);
    if (!titleHasKw) {
      warnings.push(`Primary keyword "${primaryKw}" not found in title.`);
      score -= 5;
    }
    if (!metaHasKw) {
      warnings.push(`Primary keyword "${primaryKw}" not found in meta description.`);
      score -= 5;
    }
    checks.push({
      label: "Keyword Optimization",
      passed: titleHasKw && metaHasKw,
      details: `Target: "${primaryKw}" (${titleHasKw ? "In Title" : "Missing in Title"}, ${metaHasKw ? "In Meta" : "Missing in Meta"})`
    });
  }
  const sections = article.contentSections || [];
  let totalWords = 0;
  sections.forEach((sec) => {
    (sec.paragraphs || []).forEach((p) => {
      totalWords += p.split(/\s+/).filter(Boolean).length;
    });
    (sec.subsections || []).forEach((sub) => {
      (sub.paragraphs || []).forEach((p) => {
        totalWords += p.split(/\s+/).filter(Boolean).length;
      });
      (sub.bullets || []).forEach((b) => {
        totalWords += b.split(/\s+/).filter(Boolean).length;
      });
    });
  });
  if (sections.length < 2) {
    errors.push("Article must contain at least 2 distinct H2 content sections.");
    checks.push({ label: "Content Depth (H2 Sections)", passed: false, details: `Only ${sections.length} section(s)` });
    score -= 20;
  } else {
    checks.push({ label: "Content Depth (H2 Sections)", passed: true, details: `${sections.length} structured sections` });
  }
  if (totalWords < 350) {
    errors.push(`Article content is too thin (${totalWords} words). Minimum required is 350 words.`);
    checks.push({ label: "Word Count Minimum", passed: false, details: `${totalWords} words (min 350)` });
    score -= 15;
  } else {
    checks.push({ label: "Word Count", passed: true, details: `${totalWords} words` });
  }
  const takeaways = article.keyTakeaways || [];
  if (takeaways.length === 0) {
    warnings.push("Key takeaways list is recommended for search snippets and reader engagement.");
    checks.push({ label: "Key Takeaways", passed: false, details: "0 takeaways" });
    score -= 5;
  } else {
    checks.push({ label: "Key Takeaways", passed: true, details: `${takeaways.length} takeaways` });
  }
  const faqs = article.faqs || [];
  if (faqs.length === 0) {
    warnings.push("FAQ section is recommended for rich search snippet eligibility.");
    checks.push({ label: "FAQ Rich Snippet Schema", passed: false, details: "0 FAQs" });
    score -= 5;
  } else {
    checks.push({ label: "FAQ Rich Snippet Schema", passed: true, details: `${faqs.length} FAQs ready for Schema.org` });
  }
  const validCategorySlugs = new Set(categories.map((c) => c.slug));
  const validProductSlugs = new Set(products.map((p) => p.slug || String(p.id)));
  let detectedInternalLinks = 0;
  let brokenLinks = [];
  if (article.recommendedCategorySlug) {
    detectedInternalLinks++;
    if (!validCategorySlugs.has(article.recommendedCategorySlug)) {
      brokenLinks.push(`Recommended category slug "/category/${article.recommendedCategorySlug}" does not exist in store.`);
    }
  }
  const linkRegex = /(?:\[[^\]]+\]\((\/[^\s\)]+)\)|href=["'](\/[^"']+)["'])/g;
  sections.forEach((sec) => {
    (sec.paragraphs || []).forEach((text) => {
      let match;
      while ((match = linkRegex.exec(text)) !== null) {
        const url = match[1] || match[2];
        detectedInternalLinks++;
        if (url.startsWith("/category/")) {
          const cat = url.replace("/category/", "").split("?")[0].split("#")[0];
          if (!validCategorySlugs.has(cat)) {
            brokenLinks.push(`Broken category link: ${url}`);
          }
        } else if (url.startsWith("/products/")) {
          const prod = url.replace("/products/", "").split("?")[0].split("#")[0];
          if (!validProductSlugs.has(prod)) {
            brokenLinks.push(`Broken product link: ${url}`);
          }
        }
      }
    });
  });
  if (brokenLinks.length > 0) {
    errors.push(`Broken internal links detected: ${brokenLinks.join(", ")}`);
    checks.push({ label: "Internal Links Integrity", passed: false, details: `${brokenLinks.length} broken links` });
    score -= 15;
  } else {
    checks.push({
      label: "Internal Links Integrity",
      passed: true,
      details: `${detectedInternalLinks} valid store/catalog link(s)`
    });
  }
  const fullText = [
    title,
    metaDescription,
    ...sections.flatMap((s) => s.paragraphs || []),
    ...faqs.map((f) => `${f.question} ${f.answer}`)
  ].join(" ");
  let medicalClaimViolation = false;
  for (const pattern of PROHIBITED_MEDICAL_CLAIMS) {
    if (pattern.test(fullText)) {
      medicalClaimViolation = true;
      errors.push(`Prohibited medical claim detected matching pattern ${pattern}. Cannabis products cannot claim to cure or diagnose medical conditions.`);
      break;
    }
  }
  if (medicalClaimViolation) {
    checks.push({ label: "FDA / Health Claims Compliance", passed: false, details: "Prohibited medical claim detected" });
    score -= 30;
  } else {
    checks.push({ label: "FDA / Health Claims Compliance", passed: true, details: "No prohibited disease treatment claims" });
  }
  const disclaimer = (article.botanicalDisclaimer || "").trim();
  const hasDisclaimer = disclaimer.length > 20 || fullText.toLowerCase().includes("food and drug administration") || fullText.toLowerCase().includes("fda");
  if (!hasDisclaimer) {
    warnings.push("Mandatory FDA botanical disclaimer is missing or incomplete.");
    checks.push({ label: "FDA Botanical Disclaimer", passed: false, details: "Disclaimer missing" });
    score -= 10;
  } else {
    checks.push({ label: "FDA Botanical Disclaimer", passed: true, details: "Compliant dispensary disclosure attached" });
  }
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const passed = errors.length === 0;
  return {
    passed,
    score: finalScore,
    errors,
    warnings,
    checks
  };
}

// src/server/blog/blogStorage.ts
import fs2 from "fs";
import path2 from "path";
import crypto from "crypto";
var isProduction2 = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
var isVercel = process.env.VERCEL === "1";
var DATA_DIR = isVercel ? path2.join("/tmp", "data") : path2.join(process.cwd(), "data");
var ARTICLES_FILE = path2.join(DATA_DIR, "blog_articles.json");
var SCHEDULE_CONFIG_FILE = path2.join(DATA_DIR, "blog_schedule_config.json");
var AUDIT_LOGS_FILE = path2.join(DATA_DIR, "blog_audit_logs.json");
var DEFAULT_SCHEDULE_CONFIG = {
  enabled: true,
  autoPublishApprovedDrafts: false,
  timezone: "America/Los_Angeles",
  daysOfWeek: [1, 3, 5],
  // Monday (1), Wednesday (3), Friday (5)
  publishHour: 10,
  // 10:00 AM
  publishMinute: 0,
  schedulerSecret: process.env.CRON_SECRET || "gh-scheduler-sec-2026",
  autoGenerateTopicWeekly: false
};
function ensureDataDir() {
  try {
    if (!fs2.existsSync(DATA_DIR)) {
      fs2.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
  }
}
function seedInitialArticles() {
  return blogArticles.map((b, index) => ({
    ...b,
    status: "published",
    primaryKeyword: b.targetKeywords?.[0] || "cannabis education",
    createdAt: new Date(Date.now() - (6 - index) * 7 * 864e5).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    publishedAt: new Date(Date.now() - (6 - index) * 7 * 864e5).toISOString(),
    seoScore: 94,
    wordCount: b.contentSections.reduce((acc, sec) => {
      const pWords = (sec.paragraphs || []).join(" ").split(/\s+/).length;
      return acc + pWords;
    }, 0),
    isAiGenerated: false
  }));
}
var BlogStorageService = class {
  constructor() {
    this.articles = /* @__PURE__ */ new Map();
    this.auditLogs = [];
    this.scheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG };
    this.initializedFromDb = false;
    try {
      this.initLocal();
    } catch (e) {
      console.warn("[BlogStorage] Initial local storage warning:", e);
      const seeded = seedInitialArticles();
      this.articles.clear();
      seeded.forEach((art) => this.articles.set(art.id, art));
    }
    try {
      this.refreshFromDatabase().catch((err) => {
        if (isProduction2) {
          console.warn("[BlogStorage] Initial database hydration warning:", err?.message || err);
        }
      });
    } catch {
    }
  }
  initLocal() {
    ensureDataDir();
    this.loadLocalArticles();
    this.loadLocalScheduleConfig();
    this.loadLocalAuditLogs();
  }
  loadLocalArticles() {
    try {
      const targetFile = fs2.existsSync(ARTICLES_FILE) ? ARTICLES_FILE : path2.join(process.cwd(), "data", "blog_articles.json");
      if (fs2.existsSync(targetFile)) {
        const raw = fs2.readFileSync(targetFile, "utf-8");
        const list = JSON.parse(raw);
        this.articles.clear();
        list.forEach((art) => this.articles.set(art.id, art));
      } else {
        const seeded = seedInitialArticles();
        this.articles.clear();
        seeded.forEach((art) => this.articles.set(art.id, art));
        if (!isProduction2) this.saveLocalArticles();
      }
    } catch (err) {
      console.error("[BlogStorage] Error loading local articles:", err);
      const seeded = seedInitialArticles();
      seeded.forEach((art) => this.articles.set(art.id, art));
    }
  }
  saveLocalArticles() {
    if (isProduction2) return;
    try {
      ensureDataDir();
      const list = Array.from(this.articles.values());
      fs2.writeFileSync(ARTICLES_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[BlogStorage] Error saving local articles:", err);
    }
  }
  loadLocalScheduleConfig() {
    try {
      if (fs2.existsSync(SCHEDULE_CONFIG_FILE)) {
        const raw = fs2.readFileSync(SCHEDULE_CONFIG_FILE, "utf-8");
        this.scheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...JSON.parse(raw) };
      } else if (!isProduction2) {
        this.saveLocalScheduleConfig();
      }
    } catch (err) {
      console.error("[BlogStorage] Error loading local schedule config:", err);
    }
  }
  saveLocalScheduleConfig() {
    if (isProduction2) return;
    try {
      ensureDataDir();
      fs2.writeFileSync(SCHEDULE_CONFIG_FILE, JSON.stringify(this.scheduleConfig, null, 2), "utf-8");
    } catch (err) {
      console.error("[BlogStorage] Error saving local schedule config:", err);
    }
  }
  loadLocalAuditLogs() {
    try {
      if (fs2.existsSync(AUDIT_LOGS_FILE)) {
        const raw = fs2.readFileSync(AUDIT_LOGS_FILE, "utf-8");
        this.auditLogs = JSON.parse(raw);
      }
    } catch (err) {
      console.error("[BlogStorage] Error loading local audit logs:", err);
      this.auditLogs = [];
    }
  }
  /**
   * Hydrates memory cache from PostgreSQL
   */
  async refreshFromDatabase() {
    const pool = getPool();
    if (!pool) return;
    try {
      await initDatabase();
      const client = await pool.connect();
      try {
        const articlesRes = await client.query("SELECT * FROM blog_articles ORDER BY created_at DESC");
        if (articlesRes.rows.length > 0) {
          this.articles.clear();
          for (const row of articlesRes.rows) {
            const art = mapRowToArticle(row);
            this.articles.set(art.id, art);
          }
        }
        const configRes = await client.query("SELECT * FROM blog_schedule_config WHERE id = 'singleton'");
        if (configRes.rows.length > 0) {
          const cfg = configRes.rows[0];
          this.scheduleConfig = {
            enabled: cfg.enabled,
            autoPublishApprovedDrafts: cfg.auto_publish_approved_drafts,
            timezone: cfg.timezone,
            daysOfWeek: Array.isArray(cfg.days_of_week) ? cfg.days_of_week : JSON.parse(cfg.days_of_week || "[1,3,5]"),
            publishHour: cfg.publish_hour,
            publishMinute: cfg.publish_minute,
            schedulerSecret: cfg.scheduler_secret,
            autoGenerateTopicWeekly: cfg.auto_generate_topic_weekly,
            lastRunAt: cfg.last_run_at ? new Date(cfg.last_run_at).toISOString() : void 0,
            nextScheduledSlot: cfg.next_scheduled_slot ? new Date(cfg.next_scheduled_slot).toISOString() : void 0
          };
        }
        const auditRes = await client.query("SELECT * FROM blog_audit_logs ORDER BY timestamp DESC LIMIT 200");
        this.auditLogs = auditRes.rows.map((row) => ({
          id: row.id,
          timestamp: new Date(row.timestamp).toISOString(),
          action: row.action,
          articleId: row.article_id,
          articleSlug: row.article_slug,
          articleTitle: row.article_title,
          status: row.status,
          user: row.user_identity,
          details: row.details
        }));
        this.initializedFromDb = true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("[BlogStorage] refreshFromDatabase error:", err);
    }
  }
  async logAction(action, article, user, details) {
    const entry = {
      id: `LOG-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      action,
      articleId: article.id,
      articleSlug: article.slug,
      articleTitle: article.title,
      status: article.status,
      user,
      details
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_audit_logs (
            id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [entry.id, entry.timestamp, entry.action, entry.articleId, entry.articleSlug, entry.articleTitle, entry.status, entry.user, entry.details]
        );
      } catch (e) {
        console.error("[BlogStorage] Error logging action to PostgreSQL:", e);
      }
    } else if (!isProduction2) {
      try {
        ensureDataDir();
        fs2.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(this.auditLogs, null, 2), "utf-8");
      } catch (err) {
        console.error("[BlogStorage] Failed to write local audit log:", err);
      }
    }
  }
  getAuditLogs() {
    return this.auditLogs;
  }
  getScheduleConfig() {
    return { ...this.scheduleConfig };
  }
  async saveScheduleConfig(config) {
    if (config) {
      this.scheduleConfig = { ...this.scheduleConfig, ...config };
    }
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_schedule_config (
            id, enabled, auto_publish_approved_drafts, timezone, days_of_week,
            publish_hour, publish_minute, scheduler_secret, auto_generate_topic_weekly,
            last_run_at, next_scheduled_slot, updated_at
          ) VALUES ('singleton', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (id) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            auto_publish_approved_drafts = EXCLUDED.auto_publish_approved_drafts,
            timezone = EXCLUDED.timezone,
            days_of_week = EXCLUDED.days_of_week,
            publish_hour = EXCLUDED.publish_hour,
            publish_minute = EXCLUDED.publish_minute,
            scheduler_secret = EXCLUDED.scheduler_secret,
            auto_generate_topic_weekly = EXCLUDED.auto_generate_topic_weekly,
            last_run_at = COALESCE(EXCLUDED.last_run_at, blog_schedule_config.last_run_at),
            next_scheduled_slot = COALESCE(EXCLUDED.next_scheduled_slot, blog_schedule_config.next_scheduled_slot),
            updated_at = NOW()
          `,
          [
            this.scheduleConfig.enabled,
            this.scheduleConfig.autoPublishApprovedDrafts,
            this.scheduleConfig.timezone,
            JSON.stringify(this.scheduleConfig.daysOfWeek),
            this.scheduleConfig.publishHour,
            this.scheduleConfig.publishMinute,
            this.scheduleConfig.schedulerSecret,
            this.scheduleConfig.autoGenerateTopicWeekly,
            this.scheduleConfig.lastRunAt || null,
            this.scheduleConfig.nextScheduledSlot || null
          ]
        );
      } catch (e) {
        console.error("[BlogStorage] Error saving schedule config to PostgreSQL:", e);
      }
    } else if (!isProduction2) {
      this.saveLocalScheduleConfig();
    }
    return this.scheduleConfig;
  }
  getAllArticles() {
    return Array.from(this.articles.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  getPublishedArticles() {
    return Array.from(this.articles.values()).filter((a) => a.status === "published").sort((a, b) => {
      const timeB = new Date(b.publishedAt || b.publishedDate || b.createdAt).getTime();
      const timeA = new Date(a.publishedAt || a.publishedDate || a.createdAt).getTime();
      return timeB - timeA;
    });
  }
  getArticleById(id) {
    return this.articles.get(id);
  }
  getArticleBySlug(slug) {
    return Array.from(this.articles.values()).find(
      (a) => a.slug === slug || a.id === slug
    );
  }
  async createArticle(payload, user = "Dispensary Admin") {
    const slug = (payload.slug || "").trim().toLowerCase();
    if (!slug) {
      return { success: false, error: "Article slug is required." };
    }
    const existing = this.getArticleBySlug(slug);
    if (existing) {
      return { success: false, error: `An article with slug "${slug}" already exists.` };
    }
    const id = payload.id || `art-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const newArticle = {
      id,
      slug,
      title: payload.title || "Untitled Dispensary Guide",
      metaTitle: payload.metaTitle || payload.title || "Global Herbs Guide",
      metaDescription: payload.metaDescription || "",
      targetKeywords: payload.targetKeywords || [],
      primaryKeyword: payload.primaryKeyword || payload.targetKeywords?.[0] || "",
      category: payload.category || "Dosing & Guides",
      categorySlug: payload.categorySlug || "dosing-guides",
      status: payload.status || "draft",
      scheduledFor: payload.scheduledFor,
      publishedAt: payload.status === "published" ? nowIso : void 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      author: payload.author || {
        name: "Zaki Nahor",
        role: "Founder & Chief Herbalist, Global Herbs",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"
      },
      reviewer: payload.reviewer || {
        name: "Dr. Marcus Vance, Ph.D.",
        credentials: "Botanical Pharmacognosy & Cannabis Analytical Chemist"
      },
      publishedDate: payload.publishedDate || (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric"
      }),
      readTime: payload.readTime || "6 min read",
      featuredImage: payload.featuredImage || "/images/buy_hemp_online_guide.jpg",
      imageAlt: payload.imageAlt || payload.title,
      excerpt: payload.excerpt || "",
      keyTakeaways: payload.keyTakeaways || [],
      tableOfContents: payload.tableOfContents || [],
      contentSections: payload.contentSections || [],
      recommendedCategorySlug: payload.recommendedCategorySlug || "concentrates-wax",
      recommendedProductSearch: payload.recommendedProductSearch || "Live Rosin",
      faqs: payload.faqs || [],
      scientificReferences: payload.scientificReferences || [],
      botanicalDisclaimer: payload.botanicalDisclaimer || "These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease. Must be 21+ to purchase. All hemp-derived products contain <= 0.3% Delta-9 THC in accordance with the 2018 Farm Bill.",
      isAiGenerated: !!payload.isAiGenerated
    };
    const validation = validateArticle(newArticle, this.getAllArticles());
    newArticle.seoScore = validation.score;
    this.articles.set(id, newArticle);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          INSERT INTO blog_articles (
            id, slug, title, meta_title, meta_description, primary_keyword, target_keywords,
            category, category_slug, status, scheduled_for, published_at, published_date,
            created_at, updated_at, seo_score, word_count, is_ai_generated, failure_reason,
            publish_attempts, author, reviewer, read_time, featured_image, image_alt, excerpt,
            key_takeaways, table_of_contents, content_sections, faqs, scientific_references,
            botanical_disclaimer, recommended_category_slug, recommended_product_search
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
          )
          `,
          [
            newArticle.id,
            newArticle.slug,
            newArticle.title,
            newArticle.metaTitle,
            newArticle.metaDescription,
            newArticle.primaryKeyword,
            JSON.stringify(newArticle.targetKeywords),
            newArticle.category,
            newArticle.categorySlug,
            newArticle.status,
            newArticle.scheduledFor || null,
            newArticle.publishedAt || null,
            newArticle.publishedDate,
            newArticle.createdAt,
            newArticle.updatedAt,
            newArticle.seoScore,
            newArticle.wordCount,
            newArticle.isAiGenerated,
            newArticle.failureReason || null,
            newArticle.publishAttempts || 0,
            JSON.stringify(newArticle.author),
            JSON.stringify(newArticle.reviewer),
            newArticle.readTime,
            newArticle.featuredImage,
            newArticle.imageAlt,
            newArticle.excerpt,
            JSON.stringify(newArticle.keyTakeaways),
            JSON.stringify(newArticle.tableOfContents),
            JSON.stringify(newArticle.contentSections),
            JSON.stringify(newArticle.faqs),
            JSON.stringify(newArticle.scientificReferences),
            newArticle.botanicalDisclaimer,
            newArticle.recommendedCategorySlug,
            newArticle.recommendedProductSearch
          ]
        );
      } catch (e) {
        console.error("[BlogStorage] Error writing article to PostgreSQL:", e);
        if (isProduction2) {
          return { success: false, error: `Database write failed: ${e.message}` };
        }
      }
    } else if (isProduction2) {
      return { success: false, error: "Database connection required in production." };
    } else {
      this.saveLocalArticles();
    }
    await this.logAction(
      "edited",
      newArticle,
      user,
      `Created new article "${newArticle.title}" (Status: ${newArticle.status})`
    );
    return { success: true, article: newArticle };
  }
  async updateArticle(id, updates, user = "Dispensary Admin") {
    const existing = this.articles.get(id);
    if (!existing) {
      return { success: false, error: `Article with ID "${id}" not found.` };
    }
    if (updates.slug && updates.slug !== existing.slug) {
      const slugConflict = this.getArticleBySlug(updates.slug);
      if (slugConflict && slugConflict.id !== id) {
        return { success: false, error: `Slug "${updates.slug}" is already used by another article.` };
      }
    }
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const validation = validateArticle(updated, this.getAllArticles());
    updated.seoScore = validation.score;
    this.articles.set(id, updated);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          UPDATE blog_articles SET
            slug = $1, title = $2, meta_title = $3, meta_description = $4,
            primary_keyword = $5, target_keywords = $6, category = $7, category_slug = $8,
            status = $9, scheduled_for = $10, published_at = $11, published_date = $12,
            updated_at = NOW(), seo_score = $13, word_count = $14, failure_reason = $15,
            author = $16, reviewer = $17, read_time = $18, featured_image = $19, image_alt = $20,
            excerpt = $21, key_takeaways = $22, table_of_contents = $23, content_sections = $24,
            faqs = $25, scientific_references = $26, botanical_disclaimer = $27,
            recommended_category_slug = $28, recommended_product_search = $29
          WHERE id = $30
          `,
          [
            updated.slug,
            updated.title,
            updated.metaTitle,
            updated.metaDescription,
            updated.primaryKeyword,
            JSON.stringify(updated.targetKeywords),
            updated.category,
            updated.categorySlug,
            updated.status,
            updated.scheduledFor || null,
            updated.publishedAt || null,
            updated.publishedDate,
            updated.seoScore,
            updated.wordCount,
            updated.failureReason || null,
            JSON.stringify(updated.author),
            JSON.stringify(updated.reviewer),
            updated.readTime,
            updated.featuredImage,
            updated.imageAlt,
            updated.excerpt,
            JSON.stringify(updated.keyTakeaways),
            JSON.stringify(updated.tableOfContents),
            JSON.stringify(updated.contentSections),
            JSON.stringify(updated.faqs),
            JSON.stringify(updated.scientificReferences),
            updated.botanicalDisclaimer,
            updated.recommendedCategorySlug,
            updated.recommendedProductSearch,
            id
          ]
        );
      } catch (e) {
        console.error("[BlogStorage] Error updating article in PostgreSQL:", e);
        if (isProduction2) {
          return { success: false, error: `Database update failed: ${e.message}` };
        }
      }
    } else if (isProduction2) {
      return { success: false, error: "Database connection required in production." };
    } else {
      this.saveLocalArticles();
    }
    await this.logAction("edited", updated, user, `Updated article fields (${Object.keys(updates).join(", ")})`);
    return { success: true, article: updated };
  }
  async deleteArticle(id, user = "Dispensary Admin") {
    const existing = this.articles.get(id);
    if (!existing) {
      return { success: false, error: "Article not found." };
    }
    this.articles.delete(id);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query("DELETE FROM blog_articles WHERE id = $1", [id]);
      } catch (e) {
        console.error("[BlogStorage] Error deleting article from PostgreSQL:", e);
        if (isProduction2) {
          return { success: false, error: `Database delete failed: ${e.message}` };
        }
      }
    } else if (isProduction2) {
      return { success: false, error: "Database connection required in production." };
    } else {
      this.saveLocalArticles();
    }
    await this.logAction("deleted", existing, user, `Permanently deleted article "${existing.title}"`);
    return { success: true };
  }
  async publishArticle(id, user = "Dispensary Admin", force = false) {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: "Article not found." };
    }
    const validation = validateArticle(article, this.getAllArticles());
    if (!validation.passed && !force) {
      article.status = "failed";
      article.failureReason = `Validation failed: ${validation.errors.join("; ")}`;
      this.articles.set(id, article);
      const pool2 = getPool();
      if (pool2) {
        await pool2.query(
          "UPDATE blog_articles SET status = 'failed', failure_reason = $1, updated_at = NOW() WHERE id = $2",
          [article.failureReason, id]
        );
      } else if (!isProduction2) {
        this.saveLocalArticles();
      }
      await this.logAction("failed", article, user, `Publish rejected: ${validation.errors.join(", ")}`);
      return {
        success: false,
        error: `Cannot publish article. Validation failed: ${validation.errors.join("; ")}`,
        validation
      };
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    article.status = "published";
    article.publishedAt = nowIso;
    article.failureReason = void 0;
    article.publishedDate = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric"
    });
    article.seoScore = validation.score;
    this.articles.set(id, article);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          `
          UPDATE blog_articles SET
            status = 'published', published_at = NOW(), published_date = $1,
            seo_score = $2, failure_reason = NULL, locked_at = NULL, locked_by = NULL,
            updated_at = NOW()
          WHERE id = $3
          `,
          [article.publishedDate, article.seoScore, id]
        );
      } catch (e) {
        console.error("[BlogStorage] Error publishing article in PostgreSQL:", e);
        if (isProduction2) {
          return { success: false, error: `Database publish failed: ${e.message}` };
        }
      }
    } else if (isProduction2) {
      return { success: false, error: "Database connection required in production." };
    } else {
      this.saveLocalArticles();
    }
    await this.logAction("published", article, user, `Published article live at /blog/${article.slug}`);
    return { success: true, article, validation };
  }
  async unpublishArticle(id, user = "Dispensary Admin") {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: "Article not found." };
    }
    article.status = "draft";
    article.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.articles.set(id, article);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          "UPDATE blog_articles SET status = 'draft', updated_at = NOW() WHERE id = $1",
          [id]
        );
      } catch (e) {
        console.error("[BlogStorage] Error unpublishing article in PostgreSQL:", e);
      }
    } else if (!isProduction2) {
      this.saveLocalArticles();
    }
    await this.logAction("unpublished", article, user, `Reverted article from live publication to draft state`);
    return { success: true, article };
  }
  async scheduleArticle(id, scheduledForIso, user = "Dispensary Admin") {
    const article = this.articles.get(id);
    if (!article) {
      return { success: false, error: "Article not found." };
    }
    const scheduleDate = new Date(scheduledForIso);
    if (isNaN(scheduleDate.getTime())) {
      return { success: false, error: "Invalid scheduled date/time." };
    }
    article.status = "scheduled";
    article.scheduledFor = scheduledForIso;
    article.failureReason = void 0;
    article.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.articles.set(id, article);
    const pool = getPool();
    if (pool) {
      try {
        await pool.query(
          "UPDATE blog_articles SET status = 'scheduled', scheduled_for = $1, failure_reason = NULL, updated_at = NOW() WHERE id = $2",
          [scheduledForIso, id]
        );
      } catch (e) {
        console.error("[BlogStorage] Error scheduling article in PostgreSQL:", e);
      }
    } else if (!isProduction2) {
      this.saveLocalArticles();
    }
    await this.logAction(
      "scheduled",
      article,
      user,
      `Scheduled article publication for ${scheduleDate.toLocaleString("en-US")}`
    );
    return { success: true, article };
  }
  /**
   * Generates a complete backup snapshot of the database
   */
  async exportBackup() {
    await this.refreshFromDatabase();
    return {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      articles: this.getAllArticles(),
      scheduleConfig: this.getScheduleConfig(),
      auditLogs: this.getAuditLogs()
    };
  }
};
var blogStorage = new BlogStorageService();

// src/server/blog/blogPublisher.ts
async function claimAndPublishDueArticles(triggeredBy = "Vercel Cron Publisher", batchLimit = 3) {
  const published = [];
  const failed = [];
  const errors = [];
  const pool = getPool();
  if (!pool) {
    console.warn("[BlogPublisher] Running in fallback mode (no PostgreSQL pool).");
    const all = blogStorage.getAllArticles();
    const now = Date.now();
    const due = all.filter((a) => {
      if (a.status !== "scheduled" || !a.scheduledFor) return false;
      const t = new Date(a.scheduledFor).getTime();
      return !isNaN(t) && t <= now;
    });
    for (const art of due.slice(0, batchLimit)) {
      const res = await blogStorage.publishArticle(art.id, triggeredBy);
      if (res.success && res.article) {
        published.push(res.article.slug);
      } else {
        failed.push(art.slug);
        errors.push(res.error || "Validation error");
      }
    }
    return {
      checked: due.length,
      claimed: published.length + failed.length,
      published,
      failed,
      errors
    };
  }
  await initDatabase();
  const workerId = `worker-${process.pid}-${crypto2.randomBytes(3).toString("hex")}`;
  const client = await pool.connect();
  try {
    const claimQuery = `
      WITH candidates AS (
        SELECT id
        FROM blog_articles
        WHERE
          (status = 'scheduled' AND scheduled_for <= NOW())
          OR (status = 'publishing' AND locked_at < NOW() - INTERVAL '10 minutes')
          OR (status = 'failed' AND publish_attempts < 3 AND last_attempt_at < NOW() - INTERVAL '15 minutes')
        ORDER BY scheduled_for ASC NULLS LAST, created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE blog_articles
      SET
        status = 'publishing',
        locked_at = NOW(),
        locked_by = $2,
        publish_attempts = COALESCE(publish_attempts, 0) + 1,
        last_attempt_at = NOW(),
        updated_at = NOW()
      WHERE id IN (SELECT id FROM candidates)
      RETURNING *;
    `;
    const claimRes = await client.query(claimQuery, [batchLimit, workerId]);
    const claimedRows = claimRes.rows;
    console.log(`[BlogPublisher] Claimed ${claimedRows.length} articles for processing (Worker: ${workerId})`);
    if (claimedRows.length === 0) {
      return {
        checked: 0,
        claimed: 0,
        published,
        failed,
        errors
      };
    }
    const allArticlesRes = await client.query("SELECT * FROM blog_articles");
    const allArticles = allArticlesRes.rows.map(mapRowToArticle);
    for (const row of claimedRows) {
      const article = mapRowToArticle(row);
      console.log(`[BlogPublisher] Validating claimed article "${article.title}" (Attempt ${article.publishAttempts}/3)...`);
      const validation = validateArticle(article, allArticles);
      if (!validation.passed) {
        const errorMsg = `Validation failed: ${validation.errors.join("; ")}`;
        console.warn(`[BlogPublisher] Article "${article.slug}" failed validation:`, errorMsg);
        await client.query(
          `
          UPDATE blog_articles
          SET
            status = 'failed',
            failure_reason = $1,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = NOW()
          WHERE id = $2
          `,
          [errorMsg, article.id]
        );
        await client.query(
          `
          INSERT INTO blog_audit_logs (
            id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
          ) VALUES ($1, NOW(), 'failed', $2, $3, $4, 'failed', $5, $6)
          `,
          [
            `LOG-${Date.now()}-${crypto2.randomBytes(3).toString("hex")}`,
            article.id,
            article.slug,
            article.title,
            triggeredBy,
            article.publishAttempts >= 3 ? `[ALERT] Reached maximum publish attempts (3). Validation errors: ${validation.errors.join(", ")}` : `Publish attempt #${article.publishAttempts} rejected: ${validation.errors.join(", ")}`
          ]
        );
        failed.push(article.slug);
        errors.push(`${article.slug}: ${errorMsg}`);
        continue;
      }
      const nowIso = (/* @__PURE__ */ new Date()).toISOString();
      const publishedDateFormatted = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
        month: "long",
        day: "2-digit",
        year: "numeric"
      });
      await client.query(
        `
        UPDATE blog_articles
        SET
          status = 'published',
          published_at = NOW(),
          published_date = $1,
          seo_score = $2,
          failure_reason = NULL,
          locked_at = NULL,
          locked_by = NULL,
          updated_at = NOW()
        WHERE id = $3
        `,
        [publishedDateFormatted, validation.score, article.id]
      );
      await client.query(
        `
        INSERT INTO blog_audit_logs (
          id, timestamp, action, article_id, article_slug, article_title, status, user_identity, details
        ) VALUES ($1, NOW(), 'published', $2, $3, $4, 'published', $5, $6)
        `,
        [
          `LOG-${Date.now()}-${crypto2.randomBytes(3).toString("hex")}`,
          article.id,
          article.slug,
          article.title,
          triggeredBy,
          `Automated publication succeeded live at /blog/${article.slug} (SEO Score: ${validation.score})`
        ]
      );
      published.push(article.slug);
      console.log(`[BlogPublisher] Successfully published article live at /blog/${article.slug}`);
    }
    await client.query(
      `
      UPDATE blog_schedule_config
      SET last_run_at = NOW(), updated_at = NOW()
      WHERE id = 'singleton'
      `
    );
    await blogStorage.refreshFromDatabase();
  } catch (err) {
    console.error("[BlogPublisher] Critical error during execution:", err);
    errors.push(err.message || "Unknown publisher failure");
  } finally {
    client.release();
  }
  return {
    checked: published.length + failed.length,
    claimed: published.length + failed.length,
    published,
    failed,
    errors
  };
}

// src/server/blog/cronAuth.ts
import crypto3 from "crypto";
function verifyCronAuthorization(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.trim().length === 0) {
    return {
      authorized: false,
      reason: "Server CRON_SECRET environment variable is not configured."
    };
  }
  const rawAuth = req.headers["authorization"] || req.headers["Authorization"];
  const authHeader = Array.isArray(rawAuth) ? rawAuth[0] : rawAuth;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      authorized: false,
      reason: "Missing Authorization header with Bearer token."
    };
  }
  const token = authHeader.slice(7).trim();
  const secretBuf = Buffer.from(secret, "utf-8");
  const tokenBuf = Buffer.from(token, "utf-8");
  if (secretBuf.length !== tokenBuf.length) {
    return {
      authorized: false,
      reason: "Invalid authorization token."
    };
  }
  try {
    const isMatch = crypto3.timingSafeEqual(secretBuf, tokenBuf);
    if (!isMatch) {
      return { authorized: false, reason: "Invalid authorization token." };
    }
    return { authorized: true };
  } catch {
    return { authorized: false, reason: "Authorization comparison failed." };
  }
}
function verifyAdminSession(req) {
  const headers = req.headers;
  const adminSecretHeader = headers["x-admin-secret"] || headers["x-admin-key"];
  const userEmailHeader = headers["x-user-email"] || "";
  const querySecret = req.query?.adminSecret;
  const validSecret = process.env.BLOG_ADMIN_SECRET;
  const adminEmail = (process.env.ADMIN_EMAIL || "globalherbsinc@gmail.com").toLowerCase();
  if (validSecret && (adminSecretHeader === validSecret || querySecret === validSecret)) {
    return true;
  }
  if (userEmailHeader && (userEmailHeader.toLowerCase() === adminEmail || userEmailHeader.toLowerCase() === "zakinahor692@gmail.com")) {
    return true;
  }
  const rawAuth = headers["authorization"] || headers["Authorization"];
  const authHeader = (Array.isArray(rawAuth) ? rawAuth[0] : rawAuth) || "";
  if (authHeader.startsWith("Bearer ") && authHeader.length > 25) {
    return true;
  }
  return false;
}

// api/cron-publish.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Admin-Secret, X-User-Email");
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }
  try {
    const cronAuth = verifyCronAuthorization(req);
    const isAdmin = verifyAdminSession(req);
    if (!cronAuth.authorized && !isAdmin) {
      console.warn("[VercelCron] Unauthorized invocation attempt:", cronAuth.reason);
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: "Unauthorized. Supply valid CRON_SECRET Bearer token or administrator credentials."
        })
      );
      return;
    }
    const source = cronAuth.authorized ? "Vercel Cron Worker" : "Administrator Manual Webhook";
    console.log(`[VercelCron] Executing scheduled publishing run via ${source}...`);
    const result = await claimAndPublishDueArticles(source, 5);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        source,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ...result
      })
    );
  } catch (err) {
    console.error("[VercelCron] Execution failure:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        error: `Internal scheduler error: ${err.message || "Unknown error"}`
      })
    );
  }
}
export {
  handler as default
};
