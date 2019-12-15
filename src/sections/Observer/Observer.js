class Observer {
  constructor() {
    this.callback = []

    this.notify = value => {
      this.callback.forEach(observe => observe(value))
    }
  }

  subscribe = observer => {
    this.callback.push(observer)
  }
}

const observer = new Observer()

observer.subscribe(plus1)
observer.subscribe(plus1)

observer.notify(100)

console.log(observer)
