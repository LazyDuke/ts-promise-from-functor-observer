class PromiseFunctorWithTwoStatus {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'
  static REJECTED = 'REJECTED'

  constructor(executor) {
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []
    this.status = PromiseFunctorWithTwoStatus.PENDING

    const resolve = value => {
      if (this.status === PromiseFunctorWithTwoStatus.PENDING) {
        this.status = PromiseFunctorWithTwoStatus.FULFILLED
        this.value = value
        this.onFulfilledCallbacks.forEach(onFulfilled => onFulfilled())
      }
    }

    const reject = reason => {
      if (this.status === PromiseFunctorWithTwoStatus.PENDING) {
        this.status = PromiseFunctorWithTwoStatus.REJECTED
        this.reason = reason
        this.onRejectedCallbacks.forEach(onRejected => onRejected())
      }
    }

    executor(resolve, reject)
  }

  map = (onFulfilled, onRejected) =>
    new PromiseFunctorWithTwoStatus((resolve, reject) => {
      if (this.status === PromiseFunctorWithTwoStatus.FULFILLED) {
        resolve(onFulfilled(this.value))
      }

      if (this.status === PromiseFunctorWithTwoStatus.REJECTED) {
        reject(onRejected(this.reason))
      }

      if (this.status === PromiseFunctorWithTwoStatus.PENDING) {
        this.onFulfilledCallbacks.push(() => resolve(onFulfilled(this.value)))
        this.onRejectedCallbacks.push(() => reject(onRejected(this.reason)))
      }
    })
}

const promiseFunctorWithTwoStatus = new PromiseFunctorWithTwoStatus(resolve => {
  setTimeout(() => {
    resolve(100)
    // resolve(1000)
  }, 500)
})
  .map(plus1)
  .map(plus1)

console.log(promiseFunctorWithTwoStatus)
