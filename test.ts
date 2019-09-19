function Action(target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  console.log(target);
}

class A {
  static b () {

  }
  @Action
  toto () {

  }
}