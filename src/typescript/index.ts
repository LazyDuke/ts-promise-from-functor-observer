import isArrayLikeObject from 'lodash.isarraylikeobject'

class TsPromise {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'
  static REJECTED = 'REJECTED'

  static resolvePromise: ResolvePromise = (
    anotherPromise,
    x,
    resolve,
    reject
  ) => {
    // 如果 onFulfilled 或者 onRejected 返回一个值 x ，则运行下面的 Promise 解决过程：[[Resolve]](promise2, x)
    // 运行 [[Resolve]](promise, x) 需遵循以下步骤：

    // 如果 promise 和 x 指向同一对象，以 TypeError 为拒因拒绝执行 promise 以防止循环引用
    if (anotherPromise === x) {
      return reject(new TypeError('Chaining cycle detected for promise'))
    }

    // 如果 x 为 Promise ，则使 promise 接受 x 的状态
    if (x instanceof TsPromise || x instanceof Promise) {
      x.then(
        (
          // 如果 x 处于执行态，用相同的值执行 promise
          value: any
        ) => {
          return TsPromise.resolvePromise(
            anotherPromise,
            value,
            resolve,
            reject
          )
        },
        (
          // 如果 x 处于拒绝态，用相同的拒因拒绝 promise
          reason: any
        ) => {
          return reject(reason)
        }
      )
      // 如果 x 为对象或者函数
    } else if (
      x !== null &&
      (typeof x === 'object' || typeof x === 'function')
    ) {
      let called = false

      try {
        // 把 x.then 赋值给 then（这步我们先是存储了一个指向 x.then 的引用，然后测试并调用该引用，以避免多次访问 x.then 属性。这种预防措施确保了该属性的一致性，因为其值可能在检索调用时被改变。）
        const then = x.then
        // 如果 then 是函数，将 x 作为函数的作用域 this 调用之。传递两个回调函数作为参数，
        if (typeof then === 'function') {
          then.call(
            x,
            (
              // 第一个参数叫做 resolvePromise ，
              value: any
            ) => {
              // 如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
              if (called) {
                return
              }
              called = true
              // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
              return TsPromise.resolvePromise(
                anotherPromise,
                value,
                resolve,
                reject
              )
            },
            (
              // 第二个参数叫做 rejectPromise
              reason: any
            ) => {
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

  static resolve: TsPromiseResolve = value =>
    new TsPromise((resolve, reject) => {
      return resolve(value)
    })

  static reject: TsPromiseReject = reason =>
    new TsPromise((resolve, reject) => {
      return reject(reason)
    })

  static all: All = promises => {
    if (!isArrayLikeObject(promises)) {
      throw new TypeError(
        `${
          typeof promises === 'undefined' ? '' : typeof promises
        } ${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`
      )
    }

    // 实现的 promise 基于 macroTask 的 setTimeout 实现，需要 async/await 调节执行顺序
    // 原生的 promise 基于 microTask 实现，执行顺序是正确的，不需要 async/await
    return new TsPromise(async (resolve, reject) => {
      const result = []

      for (const promise of promises) {
        await TsPromise.resolve(promise).then(resolvePromise, rejectPromise)
      }

      return resolve(result)

      function resolvePromise(value: any) {
        if (value instanceof TsPromise || value instanceof Promise) {
          value.then(resolvePromise, rejectPromise)
        } else {
          result.push(value)
        }
      }

      function rejectPromise(reason: any) {
        return reject(reason)
      }
    })
  }

  static race: Race = promises => {
    if (!isArrayLikeObject(promises)) {
      throw new TypeError(
        `${
          typeof promises === 'undefined' ? '' : typeof promises
        } ${promises} is not iterable (cannot read property Symbol(Symbol.iterator))`
      )
    }

    return new TsPromise((resolve, reject) => {
      for (const promise of promises) {
        TsPromise.resolve(promise).then(
          value => {
            return resolve(value)
          },
          reason => {
            return reject(reason)
          }
        )
      }
    })
  }

  static defer = () => {
    let dfd: any = {}
    dfd.promise = new TsPromise((resolve, reject) => {
      dfd.resolve = resolve
      dfd.reject = reject
    })
    return dfd
  }

  static deferred = TsPromise.defer

  value: any
  reason: any
  status = TsPromise.PENDING
  onFulfilledCallbacks: onFulfilledCallback[] = []
  onRejectedCallbacks: onRejectedCallback[] = []

  constructor(executor: Executor) {
    // 参数校验
    if (typeof executor !== 'function') {
      throw new TypeError(`Promise resolver ${executor} is not a function`)
    }

    // 失败后的一系列操作（状态的改变，失败回调的执行）
    const reject: Reject = reason => {
      // 只有处于 pending 状态的 promise 能调用 resolve
      if (this.status === TsPromise.PENDING) {
        // reject 调用后，status 转为 rejected
        this.status = TsPromise.REJECTED
        // 储存 rejected 的拒因
        this.reason = reason
        // 一旦 reject 执行，调用储存在失败回调数组里的回调
        this.onRejectedCallbacks.forEach(onRejected => onRejected())
      }
    }

    // 成功后的一系列操作（状态的改变，成功回调的执行）
    const resolve: Resolve = x => {
      const __resolve = (value: any) => {
        // 只有处于 pending 状态的 promise 能调用 resolve
        if (this.status === TsPromise.PENDING) {
          // resolve 调用后，status 转为 fulfilled
          this.status = TsPromise.FULFILLED
          // 储存 fulfilled 的终值
          this.value = value
          // 一旦 resolve 执行，调用储存在成功回调数组里的回调
          this.onFulfilledCallbacks.forEach(onFulfilled => onFulfilled())
        }
      }
      return TsPromise.resolvePromise.call(this, this, x, __resolve, reject)
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
   */
  then: Then = (onFulfilled, onRejected) => {
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
    const anotherPromise = new TsPromise((resolve, reject) => {
      // 封装处理链式调用的方法
      const handle: Handle = (fn, argv) => {
        // 确保 onFulfilled 和 onRejected 方法异步执行
        setTimeout(() => {
          try {
            const x = fn(argv)
            return TsPromise.resolvePromise(anotherPromise, x, resolve, reject)
          } catch (error) {
            return reject(error)
          }
        })
      }
      // 当 status 为执行态（Fulfilled）时
      if (this.status === TsPromise.FULFILLED) {
        // 则执行 onFulfilled，value 作为第一个参数
        handle(onFulfilled, this.value)
      }
      // 当 status 为拒绝态（Rejected）时
      if (this.status === TsPromise.REJECTED) {
        // 则执行 onRejected，reason 作为第一个参数
        handle(onRejected, this.reason)
      }

      // 当 status 为 Pending 时
      if (this.status === TsPromise.PENDING) {
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

  catch: Catch = onRejected => {
    return this.then(null, onRejected)
  }

  finally: Finally = fn => {
    return this.then(
      (value: any) => {
        setTimeout(fn)
        return value
      },
      (reason: any) => {
        setTimeout(fn)
        throw reason
      }
    )
  }
}

export default TsPromise

interface Executor {
  (resolve: Resolve, reject?: Reject): void
}

interface Resolve {
  (value?: any | PromiseLike<any>): void
}

interface Reject {
  (reason?: any): void
}

interface Then {
  (onFulfilled: OnFulfilled, onRejected: OnRejected): TsPromise
}

interface Catch {
  (onRejected: OnRejected): TsPromise
}

interface Finally {
  (fn: Function): TsPromise
}

interface Handle {
  (fn: OnFulfilled | OnRejected, argv: any): void
}

interface OnFulfilled {
  (value?: any): any
}

interface onFulfilledCallback {
  (): void
}

interface OnRejected {
  (error: Error): void
}

interface onRejectedCallback {
  (): void
}

interface ResolvePromise {
  (anotherPromise: TsPromise, x: any, resolve: Resolve, reject: Reject): void
}

interface TsPromiseResolve {
  (value?: any | PromiseLike<any>): TsPromise
}

interface TsPromiseReject {
  (reason?: any): TsPromise
}

interface All {
  (promises: TsPromise[]): TsPromise
}

interface Race {
  (promises: TsPromise[]): TsPromise
}
