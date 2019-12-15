class PromiseObserverWithTwoStatus {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'
  static REJECTED = 'REJECTED'

  constructor(executor) {
    this.value = undefined
    this.reason = undefined
    this.onFulfilledCallbacks = []
    this.onRejectedCallbacks = []
    this.status = PromiseObserverWithTwoStatus.PENDING

    const notifyResolve = value => {
      if (this.status === PromiseObserverWithTwoStatus.PENDING) {
        this.status = PromiseObserverWithTwoStatus.FULFILLED
        this.value = value
        this.onFulfilledCallbacks.forEach(onFulfilled => onFulfilled())
      }
    }

    const notifyReject = reason => {
      if (this.status === PromiseObserverWithTwoStatus.PENDING) {
        this.status = PromiseObserverWithTwoStatus.REJECTED
        this.reason = reason
        tthis.onRejectedCallbacks.forEach(onRejected => onRejected())
      }
    }

    executor(notifyResolve, notifyReject)
  }

  subscribe = fn =>
    new PromiseObserverWithTwoStatus((notifyResolve, notifyReject) => {
      if (this.status === PromiseObserverWithTwoStatus.FULFILLED) {
        notifyResolve(fn(this.value))
      }

      if (this.status === PromiseObserverWithTwoStatus.REJECTED) {
        notifyReject(fn(this.reason))
      }

      if (this.status === PromiseObserverWithTwoStatus.PENDING) {
        this.onFulfilledCallbacks.push(() => notifyResolve(fn(this.value)))
        this.onRejectedCallbacks.push(() => notifyReject(fn(this.reason)))
      }
    })
}

const promiseObserverWithTwoStatus = new PromiseObserverWithTwoStatus(
  notifyResolve => {
    setTimeout(() => {
      notifyResolve(100)
      // notifyResolve(1000)
    }, 500)
  }
)
  .subscribe(plus1)
  .subscribe(plus1)

console.log(promiseObserverWithTwoStatus)
