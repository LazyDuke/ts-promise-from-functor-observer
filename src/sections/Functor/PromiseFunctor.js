class PromiseFunctor {
  constructor(executor) {
    this.value = undefined
    this.callbacks = []

    const resolve = value => {
      this.value = value
      this.callbacks.forEach(callback => callback())
    }

    executor(resolve)
  }

  map = fn =>
    new PromiseFunctor(resolve => {
      this.callbacks.push(() => resolve(fn(this.value)))
    })
}

const promiseFunctor = new PromiseFunctor(resolve => {
  setTimeout(() => {
    resolve(100)
    // resolve(1000)
  }, 100)
})
  .map(plus1)
  .map(plus1)

console.log(promiseFunctor)
