// class Functor {
//   static of = value => new Functor(value)

//   constructor(value) {
//     this.value = value
//   }

//   map = fn => Functor.of(fn(this.value))
// }

class Functor {
  constructor(value) {
    this.value = value
  }

  map = fn => new Functor(fn(this.value))
}

const functor = new Functor(100).map(plus1).map(plus1)

console.log(functor)
