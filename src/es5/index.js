function Promise(executor) {
  // 参数校验
  if (typeof executor !== 'function') {
    throw new TypeError('Promise resolver' + executor + 'is not a function')
  }
  var _this = this
  this.value = undefined // 终值
  this.reason = undefined // 拒因
  this.status = Promise.PENDING // 状态，初始化的状态为Pending
  this.onFulfilledCallbacks = [] // 成功回调
  this.onRejectedCallbacks = [] // 失败回调

  /**
   * 一个 promise 必须提供一个 then 方法以访问其当前值、终值和拒因
   */
  this.then = function(onFulfilled, onRejected) {
    // 如果 onFulfilled 不是函数，其必须被“忽略”
    onFulfilled =
      typeof onFulfilled === 'function'
        ? onFulfilled
        : function(value) {
            return value
          }
    // 如果 onFulfilled 不是函数，其必须被“忽略”
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : function(error) {
            throw error
          }
    // then 方法必须返回一个 promise 对象
    var anotherPromise = new Promise(function(resolve, reject) {
      // 封装处理链式调用的方法
      var handle = function(fn, argv) {
        // 确保 onFulfilled 和 onRejected 方法异步执行
        setTimeout(function() {
          try {
            var x = fn(argv)
            return Promise.resolvePromise(anotherPromise, x, resolve, reject)
          } catch (error) {
            return reject(error)
          }
        })
      }
      // 当 status 为执行态（Fulfilled）时
      if (_this.status === Promise.FULFILLED) {
        // 则执行 onFulfilled，value 作为第一个参数
        handle(onFulfilled, _this.value)
      }
      // 当 status 为拒绝态（Rejected）时
      if (_this.status === Promise.REJECTED) {
        // 则执行 onRejected，reason 作为第一个参数
        handle(onRejected, _this.reason)
      }
      // 当 status 为 Pending 时
      if (_this.status === Promise.PENDING) {
        // 将 onFulfilled 存入成功回调数组
        _this.onFulfilledCallbacks.push(function() {
          handle(onFulfilled, _this.value)
        })
        // 将 onRejected 存入失败回调数组
        _this.onRejectedCallbacks.push(function() {
          handle(onRejected, _this.reason)
        })
      }
    })
    return anotherPromise
  }
  this.catch = function(onRejected) {
    return _this.then(null, onRejected)
  }
  this.finally = function(fn) {
    return _this.then(
      function(value) {
        setTimeout(fn)
        return value
      },
      function(reason) {
        setTimeout(fn)
        throw reason
      }
    )
  }

  function reject(reason) {
    // 只有处于 pending 状态的 promise 能调用 resolve
    if (_this.status === Promise.PENDING) {
      // reject 调用后，status 转为 rejected
      _this.status = Promise.REJECTED
      // 储存 rejected 的拒因
      _this.reason = reason
      // 一旦 reject 执行，调用储存在失败回调数组里的回调
      _this.onRejectedCallbacks.forEach(function(onRejected) {
        return onRejected()
      })
    }
  }

  // 成功后的一系列操作（状态的改变，成功回调的执行）
  function resolve(x) {
    function __resolve(value) {
      // 只有处于 pending 状态的 promise 能调用 resolve
      if (_this.status === Promise.PENDING) {
        // resolve 调用后，status 转为 fulfilled
        _this.status = Promise.FULFILLED
        // 储存 fulfilled 的终值
        _this.value = value
        // 一旦 resolve 执行，调用储存在成功回调数组里的回调
        _this.onFulfilledCallbacks.forEach(function(onFulfilled) {
          return onFulfilled()
        })
      }
    }
    return Promise.resolvePromise.call(_this, _this, x, __resolve, reject)
  }

  try {
    executor(resolve, reject)
  } catch (error) {
    // 如果 executor 执行报错，则直接执行 reject
    reject(error)
  }
}

Promise.PENDING = 'PENDING'
Promise.FULFILLED = 'FULFILLED'
Promise.REJECTED = 'REJECTED'
Promise.resolvePromise = function(anotherPromise, x, resolve, reject) {
  // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)
  // 运行 [[Resolve]](promise, x) 需遵循以下步骤：
  // 如果 promise 和 x 指向同一对象，以 TypeError 为拒因拒绝执行 promise 以防止循环引用
  if (anotherPromise === x) {
    return reject(new TypeError('Chaining cycle detected for promise'))
  }
  // 如果 x 为 Promise ，则使 promise 接受 x 的状态
  if (x instanceof Promise) {
    x.then(
      function(
        // 如果 x 处于执行态，用相同的值执行 promise
        value
      ) {
        return Promise.resolvePromise(anotherPromise, value, resolve, reject)
      },
      function(
        // 如果 x 处于拒绝态，用相同的拒因拒绝 promise
        reason
      ) {
        return reject(reason)
      }
    )
    // 如果 x 为对象或者函数
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    var called_1 = false
    try {
      // 把 x.then 赋值给 then（这步我们先是存储了一个指向 x.then 的引用，然后测试并调用该引用，以避免多次访问 x.then 属性。这种预防措施确保了该属性的一致性，因为其值可能在检索调用时被改变。）
      var then = x.then
      // 如果 then 是函数，将 x 作为函数的作用域 this 调用之。传递两个回调函数作为参数，
      if (typeof then === 'function') {
        then.call(
          x,
          function(
            // 第一个参数叫做 resolvePromise ，
            value
          ) {
            // 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            if (called_1) {
              return
            }
            called_1 = true
            // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
            return Promise.resolvePromise(
              anotherPromise,
              value,
              resolve,
              reject
            )
          },
          function(
            // 第二个参数叫做 rejectPromise
            reason
          ) {
            // 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            if (called_1) {
              return
            }
            called_1 = true
            // 如果 rejectPromise 以拒因 r 为参数被调用，则以拒因 r 拒绝 promise
            return reject(reason)
          }
        )
      } else {
        //如果 then 不是函数，以 x 为参数执行 promise
        return resolve(x)
      }
    } catch (error) {
      // 如果调用 then 方法抛出了异常 e, 如果 resolvePromise 或 rejectPromise 已经被调用，则忽略之
      if (called_1) {
        return
      }
      called_1 = true
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为拒因拒绝 promise
      return reject(error)
    }
  } else {
    // 如果 x 不为对象或者函数，以 x 为参数执行 promise
    return resolve(x)
  }
}

Promise.resolve = function(value) {
  return new Promise(function(resolve, reject) {
    return resolve(value)
  })
}
Promise.reject = function(reason) {
  return new Promise(function(resolve, reject) {
    return reject(reason)
  })
}
Promise.all = function(promises) {
  if (!isArrayLikeObject(promises)) {
    throw new TypeError(
      (typeof promises === 'undefined' ? '' : typeof promises) +
        ' ' +
        promises +
        ' is not iterable (cannot read property Symbol(Symbol.iterator))'
    )
  }
  // 实现的 promise 基于 macroTask 的 setTimeout 实现，需要 async/await 调节执行顺序
  // 原生的 promise 基于 microTask 实现，执行顺序是正确的，不需要 async/await
  return new Promise(function(resolve, reject) {
    return __awaiter(void 0, void 0, void 0, function() {
      function resolvePromise(value) {
        if (value instanceof Promise) {
          value.then(resolvePromise, rejectPromise)
        } else {
          result.push(value)
        }
      }
      function rejectPromise(reason) {
        return reject(reason)
      }
      var result, _i, promises_1, promise
      return __generator(this, function(_a) {
        switch (_a.label) {
          case 0:
            result = []
            ;(_i = 0), (promises_1 = promises)
            _a.label = 1
          case 1:
            if (!(_i < promises_1.length)) return [3 /*break*/, 4]
            promise = promises_1[_i]
            return [
              4 /*yield*/,
              Promise.resolve(promise).then(resolvePromise, rejectPromise)
            ]
          case 2:
            _a.sent()
            _a.label = 3
          case 3:
            _i++
            return [3 /*break*/, 1]
          case 4:
            return [2 /*return*/, resolve(result)]
        }
      })
    })
  })
}
Promise.race = function(promises) {
  if (!isArrayLikeObject(promises)) {
    throw new TypeError(
      (typeof promises === 'undefined' ? '' : typeof promises) +
        ' ' +
        promises +
        ' is not iterable (cannot read property Symbol(Symbol.iterator))'
    )
  }
  return new Promise(function(resolve, reject) {
    for (var _i = 0, promises_2 = promises; _i < promises_2.length; _i++) {
      var promise = promises_2[_i]
      Promise.resolve(promise).then(
        function(value) {
          return resolve(value)
        },
        function(reason) {
          return reject(reason)
        }
      )
    }
  })
}
Promise.defer = function() {
  var dfd = {}
  dfd.promise = new Promise(function(resolve, reject) {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}
Promise.deferred = Promise.defer

module.exports = Promise

function isArrayLikeObject(value) {
  // 此处采用lodash的实现
  function isObjectLike(value) {
    return !!value && typeof value == 'object'
  }
  function isArrayLike(value) {
    function isLength(value) {
      var MAX_SAFE_INTEGER = 9007199254740991
      return (
        typeof value == 'number' &&
        value > -1 &&
        value % 1 === 0 &&
        value <= MAX_SAFE_INTEGER
      )
    }
    function isFunction(value) {
      function isObject(value) {
        var type = typeof value
        return !!value && (type == 'object' || type == 'function')
      }
      var funcTag = '[object Function]'
      var genTag = '[object GeneratorFunction]'
      var objectProto = Object.prototype
      var objectToString = objectProto.toString

      var tag = isObject(value) ? objectToString.call(value) : ''
      return tag === funcTag || tag === genTag
    }
    return value !== null && isLength(value.length) && !isFunction(value)
  }

  return isObjectLike(value) && isArrayLike(value)
}

function __awaiter(thisArg, _arguments, P, generator) {
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value))
      } catch (e) {
        reject(e)
      }
    }
    function rejected(value) {
      try {
        step(generator['throw'](value))
      } catch (e) {
        reject(e)
      }
    }
    function step(result) {
      result.done
        ? resolve(result.value)
        : new P(function(resolve) {
            resolve(result.value)
          }).then(fulfilled, rejected)
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next())
  })
}

function __generator(thisArg, body) {
  var _ = {
      label: 0,
      sent: function() {
        if (t[0] & 1) throw t[1]
        return t[1]
      },
      trys: [],
      ops: []
    },
    f,
    y,
    t,
    g
  return (
    (g = { next: verb(0), throw: verb(1), return: verb(2) }),
    typeof Symbol === 'function' &&
      (g[Symbol.iterator] = function() {
        return this
      }),
    g
  )
  function verb(n) {
    return function(v) {
      return step([n, v])
    }
  }
  function step(op) {
    if (f) throw new TypeError('Generator is already executing.')
    while (_)
      try {
        if (
          ((f = 1),
          y &&
            (t =
              op[0] & 2
                ? y['return']
                : op[0]
                ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                : y.next) &&
            !(t = t.call(y, op[1])).done)
        )
          return t
        if (((y = 0), t)) op = [op[0] & 2, t.value]
        switch (op[0]) {
          case 0:
          case 1:
            t = op
            break
          case 4:
            _.label++
            return { value: op[1], done: false }
          case 5:
            _.label++
            y = op[1]
            op = [0]
            continue
          case 7:
            op = _.ops.pop()
            _.trys.pop()
            continue
          default:
            if (
              !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
              (op[0] === 6 || op[0] === 2)
            ) {
              _ = 0
              continue
            }
            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
              _.label = op[1]
              break
            }
            if (op[0] === 6 && _.label < t[1]) {
              _.label = t[1]
              t = op
              break
            }
            if (t && _.label < t[2]) {
              _.label = t[2]
              _.ops.push(op)
              break
            }
            if (t[2]) _.ops.pop()
            _.trys.pop()
            continue
        }
        op = body.call(thisArg, _)
      } catch (e) {
        op = [6, e]
        y = 0
      } finally {
        f = t = 0
      }
    if (op[0] & 5) throw op[1]
    return { value: op[0] ? op[1] : void 0, done: true }
  }
}
