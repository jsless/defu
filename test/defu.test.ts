import { expectTypeOf } from 'expect-type'
import defu from '../src/defu'

// Part of tests brought from jonschlinkert/defaults-deep (MIT)

const nonObject = [null, undefined, [], false, true, 123]

describe('defu', () => {
  it('should copy only missing properties defaults', () => {
    const result = defu({ a: 'c' }, { a: 'bbb', d: 'c' })
    expect(result).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result).toEqualTypeOf<{ a: string, d: string }>()
  })

  it('should fill in values that are null', () => {
    const result1 = defu({ a: null as null }, { a: 'c', d: 'c' })
    expect(result1).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result1).toEqualTypeOf<{ a: string, d: string }>()

    const result2 = defu({ a: 'c' }, { a: null as null, d: 'c' })
    expect(result2).toEqual({ a: 'c', d: 'c' })
    expectTypeOf(result2).toEqualTypeOf<{ a: string, d: string }>()
  })

  it('should copy nested values', () => {
    const result = defu({ a: { b: 'c' } }, { a: { d: 'e' } })
    expect(result).toEqual({
      a: { b: 'c', d: 'e' }
    })
    expectTypeOf(result).toEqualTypeOf<{ a: { b: string, d: string } }>()
  })

  it('should concat array values by default', () => {
    const result = defu({ array: ['b', 'c'] }, { array: ['a'] })
    expect(result).toEqual({
      array: ['a', 'b', 'c']
    })
    expectTypeOf(result).toEqualTypeOf<{ array: string[] }>()
  })

  it('should correctly type differing array values', () => {
    const item1 = { name: 'Name', age: 21 }
    const item2 = { name: 'Name', age: '42' }
    const result = defu({ items: [item1] }, { items: [item2] })
    expect(result).toEqual({ items: [item2, item1] })
    expectTypeOf(result).toEqualTypeOf<{ items: Array<{ name: string, age: string } | { name: string, age: number }> }>()
  })

  it('should correctly merge different object types', () => {
    const fn = () => 42
    const re = /test/i

    const result = defu({ a: fn }, { a: re })
    expect(result).toEqual({ a: fn })
    expectTypeOf(result).toEqualTypeOf<{ a:(() => number) | RegExp }>()
  })

  it('should handle non object first param', () => {
    for (const val of nonObject) {
      // @ts-expect-error
      expect(defu(val, { d: true })).toEqual({ d: true })
    }
  })

  it('should handle non object second param', () => {
    for (const val of nonObject) {
      // @ts-expect-error
      expect(defu({ d: true }, val)).toEqual({ d: true })
    }
  })

  it('multi defaults', () => {
    const result = defu({ a: 1 }, { b: 2, a: 'x' }, { c: 3, a: 'x', b: 'x' })
    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3
    })
    expectTypeOf(result).toEqualTypeOf<{ a: string | number, b: string | number, c?: number }>()
  })

  it('should not override Object prototype', () => {
    const payload = JSON.parse(
      '{"constructor": {"prototype": {"isAdmin": true}}}'
    )
    defu({}, payload)
    defu(payload, {})
    defu(payload, payload)
    // @ts-ignore
    expect({}.isAdmin).toBe(undefined)
  })

  it('should ignore non-object arguments', () => {
    // @ts-expect-error
    expect(defu(null, { foo: 1 }, false, 123, { bar: 2 })).toEqual({
      foo: 1,
      bar: 2
    })
  })

  it('custom merger', () => {
    const ext = defu.extend((obj, key, val) => {
      if (typeof val === 'number') {
        ;(obj as any)[key] += val
        return true
      }
    })
    expect(ext({ cost: 15 }, { cost: 10 })).toEqual({ cost: 25 })
  })

  it('defu.fn()', () => {
    const num = () => 20
    expect(
      defu.fn(
        {
          ignore: val => val.filter(i => i !== 'dist'),
          num,
          ignored: num
        },
        {
          ignore: ['node_modules', 'dist'],
          num: 10
        }
      )
    ).toEqual({
      ignore: ['node_modules'],
      num: 20,
      ignored: num
    })
  })

  it('defu.arrayFn()', () => {
    const num = () => 20
    expect(defu.arrayFn({
      arr: () => ['c'],
      num
    }, {
      arr: ['a', 'b'],
      num: 10
    })).toEqual({
      arr: ['c'],
      num
    })
  })

  it('custom merger with namespace', () => {
    const ext = defu.extend((obj, key, val, namespace) => {
      // console.log({ obj, key, val, namespace })
      if (key === 'modules') {
        // TODO: It is not possible to override types with extend()
        // @ts-ignore
        obj[key] = namespace + ':' + [...val, ...obj[key]].sort().join(',')
        return true
      }
    })

    const obj1 = { modules: ['A'], foo: { bar: { modules: ['X'] } } }
    const obj2 = { modules: ['B'], foo: { bar: { modules: ['Y'] } } }
    expect(ext(obj1, obj2)).toEqual({ modules: ':A,B', foo: { bar: { modules: 'foo.bar:X,Y' } } })
  })
})
