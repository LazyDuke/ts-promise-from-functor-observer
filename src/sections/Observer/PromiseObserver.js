class PromiseObserver {
  constructor(executor) {
    this.value = undefined
    this.callbacks = []

    const notify = value => {
      this.value = value
      this.callbacks.forEach(callback => callback())
    }

    executor(notify)
  }

  subscribe = fn =>
    new PromiseObserver(notify => {
      this.callbacks.push(() => notify(fn(this.value)))
    })
}

const promiseObserver = new PromiseObserver(notify => {
  setTimeout(() => {
    notify(100)
    // notify(1000)
  }, 100)
})
  .subscribe(plus1)
  .subscribe(plus1)

console.log(promiseObserver)
