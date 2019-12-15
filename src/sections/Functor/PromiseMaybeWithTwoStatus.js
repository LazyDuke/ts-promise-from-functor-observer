class PromiseMaybeWithTwoStatus {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'
  static REJECTED = 'REJECTED'

  constructor(executor) {
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []
    this.status = PromiseMaybeWithTwoStatus.PENDING

    const resolve = value => {
      if (this.status === PromiseMaybeWithTwoStatus.PENDING) {
        this.status = PromiseMaybeWithTwoStatus.FULFILLED
        this.value = value
        this.onFulfilledCallbacks.forEach(onFulfilled => onFulfilled())
      }
    }

    const reject = reason => {
      if (this.status === PromiseMaybeWithTwoStatus.PENDING) {
        this.status = PromiseMaybeWithTwoStatus.REJECTED
        this.reason = reason
        this.onRejectedCallbacks.forEach(onRejected => onRejected())
      }
    }

    executor(resolve, reject)
  }

  map = (onFulfilled, onRejected) => {
    onFulfilled =
      typeof onFulfilled === 'function' ? onFulfilled : value => value

    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : error => {
            throw error
          }

    return new PromiseMaybeWithTwoStatus((resolve, reject) => {
      if (this.status === PromiseMaybeWithTwoStatus.FULFILLED) {
        resolve(onFulfilled(this.value))
      }

      if (this.status === PromiseMaybeWithTwoStatus.REJECTED) {
        reject(onRejected(this.reason))
      }

      if (this.status === PromiseMaybeWithTwoStatus.PENDING) {
        this.onFulfilledCallbacks.push(() => resolve(onFulfilled(this.value)))
        this.onRejectedCallbacks.push(() => reject(onRejected(this.reason)))
      }
    })
  }
}

const promiseMaybeWithTwoStatus = new PromiseMaybeWithTwoStatus(resolve => {
  setTimeout(() => {
    resolve(100)
    // resolve(1000)
  }, 500)
})
  .map(plus1)
  .map(plus1)

console.log(promiseMaybeWithTwoStatus)
