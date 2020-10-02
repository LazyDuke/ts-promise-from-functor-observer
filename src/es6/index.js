class Promise {
  constructor(executor) {
    // 参数校验
    if (typeof executor !== 'function') {
      throw new TypeError(`Promise resolver ${executor} is not a function`)
    }

    this.value = undefined // 终值
    this.reason = undefined // 拒因
    this.status = Promise.PENDING // 状态，初始化的状态为Pending
    this.onFulfilledCallbacks = [] // 成功回调
    this.onRejectedCallbacks = [] // 失败回调

    // 失败后的一系列操作（状态的改变，失败回调的执行）
    const reject = reason => {
      // 只有处于 pending 状态的 promise 能调用 resolve
      if (this.status === Promise.PENDING) {
        // reject 调用后，status 转为 rejected
        this.status = Promise.REJECTED
        // 储存 rejected 的拒因
        this.reason = reason
        // 一旦 reject 执行，调用储存在失败回调数组里的回调
        this.onRejectedCallbacks.forEach(onRejected => onRejected())
      }
    }

    // 成功后的一系列操作（状态的改变，成功回调的执行）
    const resolve = x => {
      const __resolve = value => {
        // 只有处于 pending 状态的 promise 能调用 resolve
        if (this.status === Promise.PENDING) {
          // resolve 调用后，status 转为 fulfilled
          this.status = Promise.FULFILLED
          // 储存 fulfilled 的终值
          this.value = value
          // 一旦 resolve 执行，调用储存在成功回调数组里的回调
          this.onFulfilledCallbacks.forEach(onFulfilled => onFulfilled())
        }
      }
      return Promise.resolvePromise.call(this, this, x, __resolve, reject)
    }

    try {
      executor(resolve, reject)
    } catch (error) {
      // 如果 executor 执行报错，则直接执行 reject
      reject(error)
    }
  }

  /**
   * 一个 promise 必须提供一个 then 方法以访问其当前值、终值和拒因
   * @param {*} onFulfilled 可选
   * @param {*} onRejected 可选
   */
  then(onFulfilled, onRejected) {
    // 如果 onFulfilled 不是函数，其必须被“忽略”
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : value => value

    // 如果 onFulfilled 不是函数，其必须被“忽略”
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : error => {
            throw error
          }

    // then 方法必须返回一个 promise 对象
    const anotherPromise = new Promise((resolve, reject) => {
      // 封装处理链式调用的方法
      const handle = (fn, argv) => {
        // 确保 onFulfilled 和 onRejected 方法异步执行
        setTimeout(() => {
          try {
            const x = fn(argv)
            return Promise.resolvePromise(anotherPromise, x, resolve, reject)
          } catch (error) {
            return reject(error)
          }
        })
      }
      // 当 status 为执行态（Fulfilled）时
      if (this.status === Promise.FULFILLED) {
        // 则执行 onFulfilled，value 作为第一个参数
        handle(onFulfilled, this.value)
      }
      // 当 status 为拒绝态（Rejected）时
      if (this.status === Promise.REJECTED) {
        // 则执行 onRejected，reason 作为第一个参数
        handle(onRejected, this.reason)
      }

      // 当 status 为 Pending 时
      if (this.status === Promise.PENDING) {
        // 将 onFulfilled 存入成功回调数组
        this.onFulfilledCallbacks.push(() => {
          handle(onFulfilled, this.value)
        })
        // 将 onRejected 存入失败回调数组
        this.onRejectedCallbacks.push(() => {
          handle(onRejected, this.reason)
        })
      }
    })

    return anotherPromise
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(fn) {
    return this.then(
      value => {
        setTimeout(fn)
        return value
      },
      reason => {
        setTimeout(fn)
        throw reason
      }
    )
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
    return x.then(
      // 如果 x 处于执行态，用相同的值执行 promise
      value => Promise.resolvePromise(anotherPromise, value, resolve, reject),
      // 如果 x 处于拒绝态，用相同的拒因拒绝 promise
      reason => reject(reason)
    )
    // 如果 x 为对象或者函数
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false

    try {
      // 把 x.then 赋值给 then（这步我们先是存储了一个指向 x.then 的引用，然后测试并调用该引用，以避免多次访问 x.then 属性。这种预防措施确保了该属性的一致性，因为其值可能在检索调用时被改变。）
      const then = x.then
      // 如果 then 是函数，将 x 作为函数的作用域 this 调用之。传递两个回调函数作为参数，
      if (typeof then === 'function') {
        return then.call(
          x,
          // 第一个参数叫做 resolvePromise ，
          value => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            if (called) {
              return
            }
            called = true
            // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
            return Promise.resolvePromise(
              anotherPromise,
              value,
              resolve,
              reject
            )
          },
          // 第二个参数叫做 rejectPromise
          reason => {
            // 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
            if (called) {
              return
            }
            called = true
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
      if (called) {
        return
      }
      called = true
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为拒因拒绝 promise
      return reject(error)
    }
  } else {
    // 如果 x 不为对象或者函数，以 x 为参数执行 promise
    return resolve(x)
  }
}

Promise.resolve = function(value) {
  return new Promise((resolve, reject) => resolve(value))
}

Promise.reject = function(reason) {
  return new Promise((resolve, reject) => reject(reason))
}

Promise.all = function(promises) {
  if (!isArrayLikeObject(promises)) {
    throw new TypeError(
      `${
        typeof promises === 'undefined' ? '' : typeof promises
      } ${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`
    )
  }

  return new Promise(async (resolve, reject) => {
    const result = []

    for (const promise of promises) {
      await Promise.resolve(promise).then(resolvePromise, rejectPromise)
    }

    return resolve(result)

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
  })
}

Promise.race = function(promises) {
  if (!isArrayLikeObject(promises)) {
    throw new TypeError(
      `${
        typeof promises === 'undefined' ? '' : typeof promises
      } ${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`
    )
  }

  return new Promise((resolve, reject) => {
    for (const promise of promises) {
      Promise.resolve(promise).then(
        value => resolve(value),
        reason => reject(reason)
      )
    }
  })
}

Promise.any = function(promises) {
  return new Promise(async (resolve, reject) => {
    const result = []
    const size = promises.length
    const errors = []

    for (const promise of promises) {
      await Promise.resolve(promise).then(resolvePromise, rejectPromise)
    }

    return resolve(result)

    function resolvePromise(value) {
      if (value instanceof Promise) {
        value.then(resolvePromise, rejectPromise)
      } else {
        result.push(value)
      }
    }

    function rejectPromise(reason) {
      errors.push(reason)
      if (errors.length === size) {
        return reject(new AggregateError(errors))
      }
    }
  })
}

Promise.allSettled = function(promises) {
  return new Promise(async (resolve, reject) => {
    const result = []
    const size = promises.length

    for (const promise of promises) {
      await Promise.resolve(promise).then(resolvePromise, rejectPromise)
    }

    return resolve(result)

    function resolvePromise(value) {
      if (value instanceof Promise) {
        value.then(resolvePromise, rejectPromise)
      } else {
        result.push({
          status: 'fulfilled',
          value
        })
      }
    }

    function rejectPromise(reason) {
      result.push({
        status: 'rejected',
        value: reason
      })
    }
  })
}

class AggregateError extends Error {
  constructor(errors) {
    super()
    this.errors = errors
  }
}

function isArrayLikeObject(value) {
  // 此处采用lodash的实现
  function isObjectLike(value) {
    return !!value && typeof value == 'object'
  }
  function isArrayLike(value) {
    function isLength(value) {
      const MAX_SAFE_INTEGER = 9007199254740991
      return (
        typeof value == 'number' &&
        value > -1 &&
        value % 1 === 0 &&
        value <= MAX_SAFE_INTEGER
      )
    }
    function isFunction(value) {
      function isObject(value) {
        const type = typeof value
        return !!value && (type == 'object' || type == 'function')
      }
      const funcTag = '[object Function]'
      const genTag = '[object GeneratorFunction]'
      const objectProto = Object.prototype
      const objectToString = objectProto.toString

      const tag = isObject(value) ? objectToString.call(value) : ''
      return tag === funcTag || tag === genTag
    }
    return value !== null && isLength(value.length) && !isFunction(value)
  }

  return isObjectLike(value) && isArrayLike(value)
}

Promise.defer = Promise.deferred = function() {
  let dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

module.exports = Promise
