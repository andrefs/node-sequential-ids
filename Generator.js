var http = require("http");


function incrementLetter(letter) {
  if (letter === "Z") {
    return null;
  } else {
    var charCode = letter.charCodeAt(0);
    charCode++;
    return String.fromCharCode(charCode);
  }
}

function incrementLetters(letters) {
  letters = letters.split("");
  var idx = letters.length - 1;
  var nextLetter;
  while(1) {
    if (idx < 0) {
      letters.unshift("A");
      break;
    }
    nextLetter = incrementLetter(letters[idx]);
    if (! nextLetter) {
      letters[idx] = "A";
      idx--;
    } else {
      letters[idx] =  nextLetter;
      break;
    }
  }
  return letters.join("");
}

function fillLetters(letters, numLetters) {
  numLetters = numLetters - letters.length;
  while (numLetters > 0) {
    letters = "A" + letters;
    numLetters--;
  }
  return letters;
}

function incrementNumber(num, _max) {
  return num === _max ? null : ++num;
}

function fillZeros(num, numDigits) {
  var number = num.toString();
  numDigits = numDigits - number.length;
  while(numDigits > 0) {
    number = "0" + number;
    numDigits--;
  }
  return number;
}

function parseId(id) {
  if (! id) return null;
  id = id.trim();
  var ltrs = id.match(/^(\w*)\s*-/);
  var nums = id.match(/-\s*(\d*)$/);
  var result = {};
  if (ltrs && nums) {
    result.numbers = nums[1];
    result.letters = ltrs[1].toUpperCase();
    return result;
  } else {
    return null;
  }
}

/**
* If maxLetters is 0, we don't generate any letters
* If maxDigits is 0, we don't generate any numbers
* If numLetters and numDigits are greater than 0, we generate numbers
* 
*/
function generateId(letters, numLetters, numbers, numNumbers) {
  if (numLetters > 0 && numNumbers <= 0) {
    var nextLetters = "A" === letters ? "AAA" : incrementLetters(letters);
    var id = fillLetters(nextLetters, numLetters);
    return {id: id, letters: nextLetters, numbers: null};
  } else if (numLetters <= 0 && numNumbers > 0) {
    var nextNumber = incrementNumber(numbers);
    var id = fillZeros(nextNumber, numNumbers);
    return {id: id, letters: null, numbers: nextNumber};
  } else {
    var maxNumber = Math.pow(10, numNumbers) - 1;
    var nextNumber = incrementNumber(numbers, maxNumber);
    var nextLetters = letters;
    if (nextNumber === null) {
      nextNumber = 0;
      nextLetters = incrementLetters(letters);
    }
    var id = fillLetters(nextLetters, numLetters)
      + " - " + fillZeros(nextNumber, numNumbers);
    return {id: id, letters: nextLetters, numbers: nextNumber};
  }
}

function int(_var, _default) {
  if (typeof(_var) === "undefined") return _default;
  var _int = parseInt(_var);
  return isNaN(_int) ? _default : _int;
}

var Generator = (function() {
  function Generator(options) {
    options = options || {};
    this.options = {};
    this.options.digits = int(options.digits, 6);
    this.options.letters = int(options.letters, 3);
    this.options.port = int(options.port, 9876);
    this.options.store = typeof(options.store) === "function"
      ? options.store : function() {}
    this.options.store_freq = int(options.store_freq, 1);
    this.options.restore = options.restore || null;
    this.numbers = -1;
    this.letters = "A";
    if (options.restore) {
      var result = parseId(options.restore);
      if (result) {
        this.numbers = parseInt(result.numbers);
        this.options.digits = result.numbers.length;
        this.letters = result.letters;
        this.options.letters = result.letters.length;
      }
    }
    this.generatedIds = [];
    this.unsavedIds = [];
    this.server;
  }

  Generator.prototype.generate = function() {
    var _new = generateId(this.letters, this.options.letters,
      this.numbers, this.options.digits);
    this.letters = _new.letters;
    this.numbers = _new.numbers;
    this.generatedIds.push(_new.id);
    this.unsavedIds.push(_new.id);
    if (this.options.store_freq === this.unsavedIds.length) {
      this.options.store(this.unsavedIds);
      this.unsavedIds = [];
    }
    return _new.id;
  };

  Generator.prototype.start = function() {
    this.server = http.Server(function(req, res) {
      switch(req.url) {
      case "/next":
        res.end(this.generate());
        break;
      case "/ping":
        res.end("pong");
        break;
      }
    }.bind(this));
    this.server.listen(this.options.port);
  };

  Generator.prototype.store = function() {
    if (this.unsavedIds.length > 0) this.options.store(this.unsavedIds);
  };

  Generator.prototype.stop = function() {
    this.store();
    this.server.close();
  };

  return Generator;
})();

exports = module.exports = Generator;
