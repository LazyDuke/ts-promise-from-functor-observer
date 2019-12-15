class PromiseFunctorWithStatus {
  static PENDING = 'PENDING'
  static FULFILLED = 'FULFILLED'

  constructor(executor) {
    this.value = undefined
    this.callbacks = []
    this.status = PromiseFunctorWithStatus.PENDING

    const resolve = value => {
      if (this.status === PromiseFunctorWithStatus.PENDING) {
        this.status = PromiseFunctorWithStatus.FULFILLED
        this.value = value
        this.callbacks.forEach(callback => callback())
      }
    }

    executor(resolve)
  }

  map = fn =>
    new PromiseFunctorWithStatus(resolve => {
      if (this.status === PromiseFunctorWithStatus.FULFILLED) {
        resolve(fn(this.value))
      }

      if (this.status === PromiseFunctorWithStatus.PENDING) {
        this.callbacks.push(() => resolve(fn(this.value)))
      }
    })
}

const promiseFunctorWithStatus = new PromiseFunctorWithStatus(resolve => {
  setTimeout(() => {
    resolve(100)
    // resolve(1000)
  }, 500)
})
  .map(plus1)
  .map(plus1)

console.log(promiseFunctorWithStatus)
