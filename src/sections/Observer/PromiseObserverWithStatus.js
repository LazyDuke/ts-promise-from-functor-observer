class PromiseObserverWithStatus {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'

  constructor(executor) {
    this.value = undefined
    this.callbacks = []
    this.status = PromiseObserverWithStatus.PENDING

    const notify = value => {
      if (this.status === PromiseObserverWithStatus.PENDING) {
        this.status = PromiseObserverWithStatus.FULFILLED
        this.value = value
        this.callbacks.forEach(callback => callback())
      }
    }

    executor(notify)
  }

  subscribe = fn =>
    new PromiseObserverWithStatus(notify => {
      if (this.status === PromiseObserverWithStatus.FULFILLED) {
        notify(fn(this.value))
      }

      if (this.status === PromiseObserverWithStatus.PENDING) {
        this.callbacks.push(() => notify(fn(this.value)))
      }
    })
}

const promiseObserverWithStatus = new PromiseObserverWithStatus(notify => {
  setTimeout(() => {
    notify(100)
    // notify(1000)
  }, 500)
})
  .subscribe(plus1)
  .subscribe(plus1)

console.log(promiseObserverWithStatus)
