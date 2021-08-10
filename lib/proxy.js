"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createProxy = exports.batch = void 0;

var _context = require("./context");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e2) { throw _e2; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e3) { didErr = true; err = _e3; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var batches = [];

var batch = function batch(cb) {
  var currentBatch = {
    listeners: new Set()
  };
  batches.push(currentBatch);
  cb();
  batches.pop();

  if (batches.length === 0) {
    var previousListeners = new Set(_toConsumableArray(currentBatch.listeners));

    var _iterator = _createForOfIteratorHelper(previousListeners),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var listener = _step.value;
        listener();
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }
  } else {
    var parentBatch = batches[batches.length - 1];
    parentBatch.listeners = new Set([].concat(_toConsumableArray(parentBatch.listeners), _toConsumableArray(currentBatch.listeners)));
  }
};

exports.batch = batch;

var handlers = function handlers(onChange) {
  var cache = new Map();
  var listeners = new Set();

  var subscribe = function subscribe(listener) {
    listeners.add(listener);
    return function () {
      listeners["delete"](listener);
    };
  };

  var dispatch = function dispatch(value) {
    var _iterator2 = _createForOfIteratorHelper(listeners.values()),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var listener = _step2.value;
        listener(value);
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }
  };

  var updateValue = function updateValue(target, newValue) {
    target.__curried = newValue;

    if (onChange) {
      onChange(target.__curried);
    } // will this ever be true ?


    if (batches.length === 0) {
      dispatch();
    } else {
      var currentBatch = batches[batches.length - 1];
      currentBatch.listeners = new Set([].concat(_toConsumableArray(currentBatch.listeners), _toConsumableArray(listeners)));
    }
  };

  var proxifyKeyCached = function proxifyKeyCached(target, key) {
    if (!cache.has(key)) {
      var targetValue = target.__curried;
      var result = createProxy(targetValue[key], function (newValue) {
        updateValue(target, _objectSpread(_objectSpread({}, target.__curried), {}, _defineProperty({}, key, newValue)));
      });
      cache.set(key, result);
    }

    return cache.get(key);
  };

  return {
    apply: function apply(target, thisArg, args) {
      if (args.length > 0) {
        batch(function () {
          // replace root value;
          var newValue = args[0];
          updateValue(target, newValue); // reconcile

          var _iterator3 = _createForOfIteratorHelper(cache.entries()),
              _step3;

          try {
            for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
              var _step3$value = _slicedToArray(_step3.value, 2),
                  childKey = _step3$value[0],
                  childValue = _step3$value[1];

              if (childValue.__curried !== newValue[childKey]) {
                childValue(newValue[childKey]);
              }
            }
          } catch (err) {
            _iterator3.e(err);
          } finally {
            _iterator3.f();
          }
        });
      } else {
        var context = (0, _context.getActiveContext)();

        if (context) {
          (0, _context.observeInContext)(context, subscribe);
        } // we allow to run outside of context
        // in this case just returns a value;

      }

      return target.__curried;
    },
    get: function get(target, key) {
      if (key === "__curried") {
        return target.__curried;
      }

      return proxifyKeyCached(target, key);
    },
    set: function set(target, key, value) {
      proxifyKeyCached(target, key)(value);
      return true;
    }
  };
};

var createProxy = function createProxy(target, onChange) {
  // this function is never invocked, but js
  // doesn't like invoking a function on a proxy
  // which target is not a function :P
  var f = function f() {
    return f.__curried;
  };

  f.__curried = target;
  return new Proxy(f, handlers(onChange));
};

exports.createProxy = createProxy;